#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function usage() {
  console.log(`Usage: create-agent-skill <name> [options]

Options:
  --dir <path>     Output directory (default: ./<name>)
  --desc <text>    One-line description for when to use the skill
  --force          Overwrite if the folder exists
  -h, --help       Show help

Example:
  npx create-agent-skill meeting-notes --desc "Turn meeting notes into action items"
`);
}

function slugify(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'my-skill';
}

function titleCase(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function parseArgs(argv) {
  const opts = { dir: null, desc: null, force: false, help: false, name: null };
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-h' || a === '--help') opts.help = true;
    else if (a === '--force') opts.force = true;
    else if (a === '--dir') opts.dir = args[++i];
    else if (a === '--desc') opts.desc = args[++i];
    else if (!a.startsWith('-') && !opts.name) opts.name = a;
    else {
      console.error('Unknown arg:', a);
      process.exit(2);
    }
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv);
  if (opts.help || !opts.name) {
    usage();
    process.exit(opts.help ? 0 : 2);
  }

  const slug = slugify(opts.name);
  const outDir = path.resolve(opts.dir || path.join(process.cwd(), slug));
  const displayName = titleCase(slug);
  const description =
    opts.desc ||
    `Use when the user asks for help with ${displayName.toLowerCase()}.`;

  if (fs.existsSync(outDir) && !opts.force) {
    console.error(`Refusing to overwrite existing folder: ${outDir}\nPass --force to overwrite.`);
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const skillMd = `---
name: ${displayName}
description: ${description}
---

# ${displayName}

## When to use
${description}

## Steps
1. Clarify the user's goal in one sentence.
2. Gather only the inputs you need.
3. Produce the smallest useful deliverable first.
4. Offer one optional next step; wait for yes.

## Notes
- Keep assistant-specific details (channels, repos, names) out of this shared skill.
- Prefer short replies unless the user asks for a breakdown.
`;

  fs.writeFileSync(path.join(outDir, 'SKILL.md'), skillMd, 'utf8');
  fs.writeFileSync(
    path.join(outDir, 'README.md'),
    `# ${displayName}\n\nAgent skill scaffolded by [create-agent-skill](https://github.com/example/create-agent-skill).\n\n## Install\nCopy this folder into your skills directory, or point your agent at \`SKILL.md\`.\n\n## Description\n${description}\n`,
    'utf8'
  );

  console.log(`Created skill at ${outDir}`);
  console.log(`- SKILL.md`);
  console.log(`- README.md`);
}

main();
