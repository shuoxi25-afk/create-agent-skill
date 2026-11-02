# create-agent-skill

One-command scaffold for Cursor / Claude-style **Agent Skills** (`SKILL.md` + folder).

Built for the current wave of open agent-skill repos: small, installable, copy-paste friendly.

## Why

People are shipping agent skills fast, but starting from a blank folder is messy. This CLI drops a valid skill skeleton in seconds.

## Quick start

```bash
node bin/create-agent-skill.js meeting-notes --desc "Turn messy notes into action items"
```

Or after publish:

```bash
npx create-agent-skill my-skill --desc "When to use this skill"
```

## What you get

```
my-skill/
  SKILL.md   # frontmatter + steps
  README.md  # short install blurb
```

## Options

| Flag | Meaning |
| --- | --- |
| `--dir <path>` | Output folder (default `./<name>`) |
| `--desc <text>` | One-line "when to use" description |
| `--force` | Overwrite existing folder |

## Example

See `examples/hello-skill/`.

## License

MIT
