# create-agent-skill

Create a standards-based Agent Skill, check its local files, and get a concrete trial prompt for Claude Code, Cursor or Codex.

[中文说明](README.zh-CN.md)

## Run from this repository

Requires Node.js 18 or newer.

```bash
git clone https://github.com/shuoxi25-afk/create-agent-skill.git
cd create-agent-skill
npm ci --ignore-scripts
node bin/create-agent-skill.js meeting-notes --template meeting-notes --target codex --title "会议纪要"
node bin/create-agent-skill.js validate .agents/skills/meeting-notes
```

The commands above work from a checkout containing these changes. The npm `npx create-agent-skill` command should only be advertised after a corresponding version has been published; this repository does not publish automatically.

## What you get

```text
.agents/skills/meeting-notes/
  SKILL.md                  # task instructions and valid YAML metadata
  README.md                 # installation locations, invocation and trial prompt
  references/example.md     # raw notes, expected result and acceptance checks
  assets/meeting-report.md  # output layout
```

The meeting template preserves source evidence, separates approved decisions from proposals, and marks missing owners and deadlines as unconfirmed. It is instruction-only: no account, network service or generated executable is required.

The `basic` template remains available for a small starter. Add your actual rules and input/output example before relying on it for repeated work.

## Commands

```bash
# Original invocation remains supported
node bin/create-agent-skill.js my-skill --desc "Review a supplied project brief for missing acceptance criteria."

# Preview first; writes nothing
node bin/create-agent-skill.js meeting-notes --template meeting-notes --target cursor --dry-run

# Custom output path; final folder name must match the skill slug
node bin/create-agent-skill.js meeting-notes --template meeting-notes --dir ./output/meeting-notes

# Back up files before overwriting them
node bin/create-agent-skill.js meeting-notes --template meeting-notes --dir ./output/meeting-notes --force

# Machine-readable format check
node bin/create-agent-skill.js validate ./output/meeting-notes --json
```

| Option | Behavior |
| --- | --- |
| `--template basic\|meeting-notes` | `basic` by default; meeting-notes includes a worked example and output asset |
| `--target generic\|claude\|cursor\|codex` | Project output directory and trial prompt; generic by default |
| `--dir <path>` | Exact output folder; overrides the target directory, not the installation guide |
| `--desc <text>` | Capability and when to use it; punctuation and newlines are serialized safely as YAML |
| `--title <text>` | A separate display title, including Chinese |
| `--dry-run` | List planned files; create, overwrite and back up nothing |
| `--force` | Back up overwritten files, replace generated files, retain unrelated files |
| `-h, --help` | Show usage |
| `-v, --version` | Show package version |

Names are normalized to lowercase ASCII slugs of at most 64 characters. A name with no usable letters or digits fails with guidance rather than silently becoming `my-skill`. Use `--title` for a Chinese title. The generated metadata name matches its containing folder, including with `--dir`.

## Installation and first trial

`--target` writes into the current project only. It does not modify your home directory or host settings.

| Target | Project location | Explicit invocation |
| --- | --- | --- |
| `generic` | `./<name>/` | Copy the folder into your host's skill directory |
| `claude` | `.claude/skills/<name>/` | `/<name>` |
| `cursor` | `.cursor/skills/<name>/` | `/<name>` in Agent chat |
| `codex` | `.agents/skills/<name>/` | `$<name>` |

Open that project in the selected host, select the skill, and copy the trial prompt from its generated README. For the meeting template, use only the Raw input section of the example, then compare the response against Expected output and Acceptance checks. If the skill is not visible, verify its folder and reload the host. Other compatible hosts can use the generic output and their documented installation path.

See the official [Claude Code](https://code.claude.com/docs/en/skills), [Cursor](https://cursor.com/docs/skills), and [Codex](https://developers.openai.com/codex/skills) documentation for host discovery behavior.

## What validation proves

The validator checks YAML structure, required metadata, naming and length limits, non-empty instructions, uppercase scaffold placeholders such as `{{TASK_NAME}}`, and local references in Markdown links, link definitions and inline resource paths. It scans supporting Markdown too. Missing or escaping references fail validation. It checks existence, not anchor contents or external URL availability.

Validation treats the package as self-contained: linked resources inside the folder are rejected, and hidden directories and `node_modules` are skipped. A symlink to the whole skill directory can still be validated. This is a local portability check, not a complete validator for host-specific extensions or every Markdown construct.

Output keeps these states separate:

- **Format validation: PASSED / FAILED** — the checks above.
- **Example behavior: NOT RUN** — a human or agent must try the supplied material.
- **Host discovery/invocation: NOT VERIFIED** — file creation does not prove host integration.
- **Scripts: NOT RUN** — validation never executes supplied code or installs its dependencies.

JSON output contains the same states under `checks`. Exit codes: `0` for success, `1` for validation or filesystem failure, `2` for invalid CLI arguments.

## Recover an overwritten file

`--force` saves each replaced file to a sibling `name.backup-XXXXXX/` directory, with `.bak` appended to its original path. For example, restore `SKILL.md.bak` to `SKILL.md` in the original skill folder. Unrelated files are retained. Backups have no live `SKILL.md`, so hosts will not discover them as duplicate skills. Linked output paths are refused.

## Development

```bash
npm ci --ignore-scripts
npm test
node bin/create-agent-skill.js validate examples/hello-skill
node bin/create-agent-skill.js validate examples/meeting-notes
npm pack --dry-run --ignore-scripts
```

The test suite invokes the real CLI in temporary directories. CI is configured for Node.js 18, 20, 22 and 24. A configured CI matrix is not evidence that remote jobs have run.

## License

MIT
