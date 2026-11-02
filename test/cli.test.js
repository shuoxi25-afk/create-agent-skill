'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const YAML = require('yaml');

const root = path.resolve(__dirname, '..');
const bin = path.join(root, 'bin/create-agent-skill.js');

function workspace(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'create-agent-skill-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function run(cwd, args, executable = bin) {
  return spawnSync(process.execPath, [executable, ...args], {
    cwd, encoding: 'utf8', timeout: 10000,
  });
}

function metadata(file) {
  const text = fs.readFileSync(file, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(match, 'generated skill has frontmatter');
  return YAML.parse(match[1]);
}

function fixture(cwd, name, body = '# Instructions\nDo the requested task.\n', frontmatter = {}) {
  const dir = path.join(cwd, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'),
    `---\n${YAML.stringify({ name, description: 'Check a supplied document.', ...frontmatter })}---\n\n${body}`);
  return dir;
}

test('generated metadata preserves punctuation and newlines without changing the description', (t) => {
  const cwd = workspace(t);
  const description = '总结会议: 提取待办 # 保留来源\n缺负责人时写“待确认”。';
  const result = run(cwd, ['Meeting Notes', '--desc', description, '--title', '会议纪要']);
  assert.equal(result.status, 0, result.stderr);
  const meta = metadata(path.join(cwd, 'meeting-notes/SKILL.md'));
  assert.equal(meta.name, 'meeting-notes');
  assert.equal(meta.description, description);
});

test('legacy invocation also produces a standard lowercase name', (t) => {
  const cwd = workspace(t);
  const result = run(cwd, ['Meeting Notes', '--desc', 'Summarize supplied meeting notes.']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(metadata(path.join(cwd, 'meeting-notes/SKILL.md')).name, 'meeting-notes');
});

for (const name of ['会议纪要', '---', 'a'.repeat(65)]) {
  test(`invalid name ${name.slice(0, 20)} fails without creating files`, (t) => {
    const cwd = workspace(t);
    const result = run(cwd, [name]);
    assert.notEqual(result.status, 0);
    assert.deepEqual(fs.readdirSync(cwd), []);
  });
}

for (const args of [
  ['sample', '--desc'], ['sample', '--dir'], ['sample', '--desc', '--force'],
  ['sample', '--template'], ['sample', '--target'], ['sample', '--desc', '   '],
  ['sample', '--unknown'], ['sample', '--template', 'missing'], ['sample', '--target', 'missing'],
]) {
  test(`bad arguments ${args.join(' ')} fail before writing`, (t) => {
    const cwd = workspace(t);
    const result = run(cwd, args);
    assert.equal(result.status, 2, result.stderr);
    assert.deepEqual(fs.readdirSync(cwd), []);
  });
}

test('custom output directory must retain the skill name', (t) => {
  const cwd = workspace(t);
  const result = run(cwd, ['sample', '--dir', 'different-name']);
  assert.equal(result.status, 2, result.stderr);
  assert.deepEqual(fs.readdirSync(cwd), []);
});

test('description length is checked before writing', (t) => {
  const cwd = workspace(t);
  assert.equal(run(cwd, ['sample', '--desc', 'a'.repeat(1025)]).status, 2);
  assert.deepEqual(fs.readdirSync(cwd), []);
});

test('generation uses the template distributed with the package', (t) => {
  const cwd = workspace(t);
  const copy = path.join(cwd, 'package');
  fs.cpSync(root, copy, { recursive: true,
    filter: (source) => !['.git', 'node_modules'].includes(path.basename(source)),
  });
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(copy, 'node_modules'), 'dir');
  fs.appendFileSync(path.join(copy, 'templates/basic/SKILL.md'), '\nCustom template instruction: keep source evidence.\n');
  const result = run(cwd, ['sample'], path.join(copy, 'bin/create-agent-skill.js'));
  assert.equal(result.status, 0, result.stderr);
  assert.match(fs.readFileSync(path.join(cwd, 'sample/SKILL.md'), 'utf8'), /Custom template instruction/);
});

test('meeting template copies a complete example and output asset with working references', (t) => {
  const cwd = workspace(t);
  const result = run(cwd, ['meeting-notes', '--template', 'meeting-notes']);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(path.join(cwd, 'meeting-notes/references/example.md')));
  assert.ok(fs.existsSync(path.join(cwd, 'meeting-notes/assets/meeting-report.md')));
  const check = run(cwd, ['validate', 'meeting-notes', '--json']);
  assert.equal(check.status, 0, check.stderr);
  const report = JSON.parse(check.stdout);
  assert.equal(report.valid, true);
  assert.equal(report.checks.format, 'passed');
  assert.equal(report.checks.example, 'not_run');
  assert.equal(report.checks.host, 'not_verified');
});

for (const [target, directory] of [
  ['claude', '.claude/skills'], ['cursor', '.cursor/skills'], ['codex', '.agents/skills'],
]) {
  test(`${target} target writes only a project skill and supplies a trial guide`, (t) => {
    const cwd = workspace(t);
    const result = run(cwd, ['meeting-notes', '--template', 'meeting-notes', '--target', target]);
    assert.equal(result.status, 0, result.stderr);
    const skill = path.join(cwd, directory, 'meeting-notes');
    assert.equal(metadata(path.join(skill, 'SKILL.md')).name, 'meeting-notes');
    assert.ok(fs.existsSync(path.join(skill, 'README.md')));
    assert.equal(run(cwd, ['validate', skill]).status, 0);
    assert.equal(fs.existsSync(path.join(cwd, 'meeting-notes')), false);
  });
}

test('preview lists files without creating a directory', (t) => {
  const cwd = workspace(t);
  const result = run(cwd, ['meeting-notes', '--template', 'meeting-notes', '--dry-run']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /SKILL\.md/);
  assert.match(result.stdout, /references[\/]example\.md/);
  assert.deepEqual(fs.readdirSync(cwd), []);
});

test('an existing skill is unchanged unless force is supplied', (t) => {
  const cwd = workspace(t);
  fixture(cwd, 'sample', '# My handwritten instructions\n');
  const original = fs.readFileSync(path.join(cwd, 'sample/SKILL.md'), 'utf8');
  assert.equal(run(cwd, ['sample']).status, 1);
  assert.equal(fs.readFileSync(path.join(cwd, 'sample/SKILL.md'), 'utf8'), original);
});

test('force preserves overwritten content in a backup and retains unrelated files', (t) => {
  const cwd = workspace(t);
  const dir = fixture(cwd, 'sample', '# My handwritten instructions\n');
  const original = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8');
  fs.writeFileSync(path.join(dir, 'custom.txt'), 'keep this');
  const result = run(cwd, ['sample', '--force']);
  assert.equal(result.status, 0, result.stderr);
  const backups = fs.readdirSync(cwd).filter((file) => file.startsWith('sample.backup-'));
  assert.equal(backups.length, 1);
  assert.equal(fs.readFileSync(path.join(cwd, backups[0], 'SKILL.md.bak'), 'utf8'), original);
  assert.equal(fs.existsSync(path.join(cwd, backups[0], 'SKILL.md')), false);
  assert.equal(fs.readFileSync(path.join(dir, 'custom.txt'), 'utf8'), 'keep this');
});

test('preview of an existing skill does not overwrite or back it up', (t) => {
  const cwd = workspace(t);
  const dir = fixture(cwd, 'sample', '# Keep me\n');
  const original = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8');
  assert.equal(run(cwd, ['sample', '--dry-run', '--force']).status, 0);
  assert.equal(fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8'), original);
  assert.deepEqual(fs.readdirSync(cwd), ['sample']);
});

test('force refuses linked output files instead of overwriting their destinations', (t) => {
  const cwd = workspace(t);
  const dir = path.join(cwd, 'sample');
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(cwd, 'outside.txt'), 'keep this');
  fs.symlinkSync(path.join(cwd, 'outside.txt'), path.join(dir, 'SKILL.md'));
  const result = run(cwd, ['sample', '--force']);
  assert.equal(result.status, 1, result.stderr);
  assert.equal(fs.readFileSync(path.join(cwd, 'outside.txt'), 'utf8'), 'keep this');
});

for (const [label, body, frontmatter] of [
  ['wrong name', '# Task\n', { name: 'Other Name' }],
  ['empty description', '# Task\n', { description: '' }],
  ['unfilled placeholder', '# {{TASK_NAME}}\n', {}],
  ['broken reference', '# Task\nRead [rules](references/missing.md).\n', {}],
  ['bare broken resource', '# Task\nRun `scripts/missing.js`.\n', {}],
  ['escaping reference', '# Task\nRead [private](../private.md).\n', {}],
  ['empty instructions', '', {}],
]) {
  test(`validation rejects ${label}`, (t) => {
    const cwd = workspace(t);
    const dir = fixture(cwd, 'sample', body, frontmatter);
    const result = run(cwd, ['validate', dir, '--json']);
    assert.equal(result.status, 1, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.valid, false);
    assert.ok(report.errors.length > 0);
  });
}

test('validation reads supporting markdown and finds its broken links', (t) => {
  const cwd = workspace(t);
  const dir = fixture(cwd, 'sample', '# Task\nRead [rules](references/rules.md).\n');
  fs.mkdirSync(path.join(dir, 'references'));
  fs.writeFileSync(path.join(dir, 'references/rules.md'), 'Read [data](missing.csv).\n');
  const result = run(cwd, ['validate', dir, '--json']);
  assert.equal(result.status, 1, result.stderr);
  assert.ok(JSON.parse(result.stdout).errors.some((error) => error.file === 'references/rules.md'));
});

test('validation accepts real references, anchors and external URLs without executing scripts', (t) => {
  const cwd = workspace(t);
  const dir = fixture(cwd, 'sample', '# Task\nRead [sample](references/data.md#example), [web](https://example.com/docs) and run `scripts/check.js`.\n');
  fs.mkdirSync(path.join(dir, 'references'));
  fs.mkdirSync(path.join(dir, 'scripts'));
  fs.writeFileSync(path.join(dir, 'references/data.md'), '# Example\n');
  fs.writeFileSync(path.join(dir, 'scripts/check.js'), "require('node:fs').writeFileSync('executed.txt', 'bad');\n");
  const result = run(cwd, ['validate', dir, '--json']);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.valid, true);
  assert.equal(report.checks.scripts, 'not_run');
  assert.equal(fs.existsSync(path.join(cwd, 'executed.txt')), false);
  assert.equal(fs.existsSync(path.join(dir, 'executed.txt')), false);
});

test('invalid YAML and duplicate keys produce machine-readable validation errors', (t) => {
  const cwd = workspace(t);
  const dir = fixture(cwd, 'sample');
  fs.writeFileSync(path.join(dir, 'SKILL.md'), '---\nname: sample\nname: duplicate\ndescription: bad: yaml\n---\n# Task\n');
  const result = run(cwd, ['validate', dir, '--json']);
  assert.equal(result.status, 1, result.stderr);
  assert.equal(JSON.parse(result.stdout).valid, false);
});

test('a missing skill path reports a validation failure as JSON', (t) => {
  const cwd = workspace(t);
  const result = run(cwd, ['validate', 'missing', '--json']);
  assert.equal(result.status, 1, result.stderr);
  assert.equal(JSON.parse(result.stdout).valid, false);
});
