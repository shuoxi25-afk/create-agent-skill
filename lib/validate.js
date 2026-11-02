'use strict';

const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const length = (value) => [...value].length;

function parseSkill(text) {
  const match = text.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) throw new Error('SKILL.md needs YAML frontmatter between --- lines.');
  const document = YAML.parseDocument(match[1]);
  if (document.errors.length) throw new Error(document.errors.map((error) => error.message).join('; '));
  const data = document.toJS({ maxAliasCount: 20 });
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Frontmatter must be a mapping.');
  return { data, body: match[2] };
}

function metadataErrors(data, directoryName) {
  const errors = [];
  if (typeof data.name !== 'string' || !NAME_PATTERN.test(data.name) || length(data.name) > 64) {
    errors.push('name must be 1-64 lowercase letters, digits and single hyphens.');
  } else if (data.name !== directoryName) errors.push(`name must match the containing folder: ${directoryName}.`);
  if (typeof data.description !== 'string' || !data.description.trim() || length(data.description) > 1024) {
    errors.push('description must be a non-empty string of at most 1024 characters.');
  }
  if (data.compatibility !== undefined && (typeof data.compatibility !== 'string' ||
      !data.compatibility.trim() || length(data.compatibility) > 500)) {
    errors.push('compatibility must be a non-empty string of at most 500 characters.');
  }
  if (data.metadata !== undefined && (!data.metadata || typeof data.metadata !== 'object' ||
      Array.isArray(data.metadata) || Object.values(data.metadata).some((value) => typeof value !== 'string'))) {
    errors.push('metadata must be a mapping of string values.');
  }
  for (const field of ['license', 'allowed-tools']) {
    if (data[field] !== undefined && typeof data[field] !== 'string') errors.push(`${field} must be a string.`);
  }
  return errors;
}

function outside(root, file) {
  const relative = path.relative(root, file);
  return relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative);
}

function markdownReferences(text) {
  const references = new Set();
  for (const match of text.matchAll(/!?\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
    const destination = match[1].trim().match(/^(?:<([^>]+)>|(\S+))/);
    if (destination) references.add(destination[1] || destination[2]);
  }
  for (const match of text.matchAll(/`((?:scripts|references|assets)\/[^`\s]+)`/g)) references.add(match[1]);
  for (const match of text.matchAll(/^\s*\[[^\]]+\]:\s*(?:<([^>]+)>|(\S+))/gm)) references.add(match[1] || match[2]);
  return references;
}

function validateSkill(directory) {
  const root = path.resolve(directory);
  const errors = [];
  const warnings = [];
  const addError = (file, message) => errors.push({ file, message });
  const checks = { format: 'failed', example: 'not_run', host: 'not_verified', scripts: 'not_run' };
  const report = () => {
    checks.format = errors.length ? 'failed' : 'passed';
    return { path: root, valid: errors.length === 0, errors, warnings, checks };
  };
  let realRoot;
  let source;
  try {
    realRoot = fs.realpathSync(root);
    const skillFile = path.join(root, 'SKILL.md');
    if (outside(realRoot, fs.realpathSync(skillFile))) throw new Error('SKILL.md resolves outside the skill folder.');
    source = fs.readFileSync(skillFile, 'utf8');
  } catch (error) {
    addError('SKILL.md', `Cannot read skill: ${error.message}`);
    return report();
  }
  try {
    const { data, body } = parseSkill(source);
    for (const error of metadataErrors(data, path.basename(root))) addError('SKILL.md', error);
    if (!body.trim()) addError('SKILL.md', 'Instructions must not be empty.');
    if (source.split('\n').length > 500) warnings.push({ file: 'SKILL.md', message: 'Consider moving detailed guidance into references/.' });
  } catch (error) { addError('SKILL.md', error.message); }

  let hasScripts = false;
  function scan(directoryPath) {
    for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const filePath = path.join(directoryPath, entry.name);
      const relative = path.relative(root, filePath).split(path.sep).join('/');
      if (entry.isSymbolicLink()) addError(relative, 'Linked resources cannot be checked as a self-contained skill.');
      else if (entry.isDirectory()) scan(filePath);
      else if (entry.isFile()) {
        if (relative.startsWith('scripts/')) hasScripts = true;
        if (!entry.name.endsWith('.md')) continue;
        const text = fs.readFileSync(filePath, 'utf8');
        if (/\{\{[A-Z][A-Z0-9_]*\}\}/.test(text)) addError(relative, 'Unfilled template placeholder.');
        for (const reference of markdownReferences(text)) {
          if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(reference)) continue;
          try {
            const localPath = decodeURIComponent(reference.split(/[?#]/)[0]);
            if (!localPath) continue;
            const target = path.resolve(path.dirname(filePath), localPath);
            if (outside(root, target)) addError(relative, `Reference escapes the skill folder: ${reference}`);
            else if (!fs.existsSync(target)) addError(relative, `Missing local reference: ${reference}`);
            else if (outside(realRoot, fs.realpathSync(target))) addError(relative, `Reference resolves outside the skill folder: ${reference}`);
          } catch (error) { addError(relative, `Cannot check reference ${reference}: ${error.message}`); }
        }
      }
    }
  }
  try { scan(root); } catch (error) { addError('.', `Cannot inspect resources: ${error.message}`); }
  if (hasScripts) warnings.push({ file: 'scripts/', message: 'Scripts were not executed; verify their dependencies and behavior separately.' });
  return report();
}

module.exports = { NAME_PATTERN, parseSkill, metadataErrors, validateSkill };
