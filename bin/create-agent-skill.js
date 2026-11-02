#!/usr/bin/env node
'use strict';

const { planSkill, writeSkill } = require('../lib/generate');
const { validateSkill } = require('../lib/validate');

function usage() {
  console.log(`Usage:
  create-agent-skill <name> [options]
  create-agent-skill validate <skill-folder> [--json]

Options:
  --template <name>  basic (default) or meeting-notes
  --target <host>    generic (default), claude, cursor or codex; project scope only
  --dir <path>       Exact output folder; its basename must match the skill slug
  --desc <text>      What this skill does and when to use it
  --title <text>     Display title, including Chinese; separate from the slug
  --dry-run         Preview generated files without writing
  --force           Back up overwritten files, then replace generated files
  -h, --help        Show help
  -v, --version     Show version

Examples:
  create-agent-skill meeting-notes --template meeting-notes --target codex
  create-agent-skill my-skill --desc "When to use this skill"
  create-agent-skill validate .agents/skills/meeting-notes --json
`);
}

function argumentError(message) {
  const error = new Error(message);
  error.exitCode = 2;
  throw error;
}

function parseArgs(args) {
  const options = { command: args[0] === 'validate' ? 'validate' : 'create' };
  const values = { '--dir': 'dir', '--desc': 'desc', '--title': 'title', '--template': 'template', '--target': 'target' };
  const booleans = { '--force': 'force', '--dry-run': 'dryRun' };
  for (let index = options.command === 'validate' ? 1 : 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') options.help = true;
    else if ((arg === '--version' || arg === '-v') && options.command === 'create') options.version = true;
    else if (options.command === 'validate' && arg === '--json') options.json = true;
    else if (options.command === 'create' && Object.hasOwn(values, arg)) {
      const value = args[++index];
      if (value === undefined || value.startsWith('-') || !value.trim()) argumentError(`${arg} requires a non-empty value.`);
      options[values[arg]] = value;
    } else if (options.command === 'create' && Object.hasOwn(booleans, arg)) options[booleans[arg]] = true;
    else if (!arg.startsWith('-') && options.name === undefined) options.name = arg;
    else argumentError(`Unknown argument: ${arg}. See --help.`);
  }
  return options;
}

function printReport(report) {
  console.log(`Format validation: ${report.valid ? 'PASSED' : 'FAILED'}`);
  for (const item of report.errors) console.log(`ERROR ${item.file}: ${item.message}`);
  for (const item of report.warnings) console.log(`WARNING ${item.file}: ${item.message}`);
  console.log('Example behavior: NOT RUN. Host discovery/invocation: NOT VERIFIED. Scripts: NOT RUN.');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { usage(); return; }
  if (options.version) { console.log(require('../package.json').version); return; }
  if (!options.name) { usage(); process.exitCode = 2; return; }
  if (options.command === 'validate') {
    const report = validateSkill(options.name);
    if (options.json) console.log(JSON.stringify(report, null, 2));
    else printReport(report);
    process.exitCode = report.valid ? 0 : 1;
    return;
  }
  const plan = planSkill(options);
  const result = writeSkill(plan, options);
  console.log(`${result.dryRun ? 'Would create' : 'Created'} skill at ${plan.outDir}`);
  for (const file of plan.files) console.log(`- ${file.path}`);
  if (result.dryRun) {
    if (result.exists) console.log('Existing folder: writing requires --force; overwritten files will be backed up.');
    console.log('Preview only: no files written.');
    return;
  }
  if (result.backup) console.log(`Backup: ${result.backup} (original filenames + .bak)`);
  const report = validateSkill(plan.outDir);
  printReport(report);
  console.log(`Next: open ${plan.outDir}/README.md for installation and a copyable trial prompt.`);
  process.exitCode = report.valid ? 0 : 1;
}

try { main(); } catch (error) {
  console.error(`Error: ${error.message}`);
  process.exitCode = error.exitCode || 1;
}
