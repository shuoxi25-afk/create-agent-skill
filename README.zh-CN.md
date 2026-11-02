# create-agent-skill 中文说明

生成一个有明确用途、能检查格式、带安装和试用说明的 Agent Skill。支持 Claude Code、Cursor 和 Codex 的项目目录。

## 从源码开始

需要 Node.js 18 或以上版本。在包含这次修改的仓库副本中运行：

```bash
npm ci --ignore-scripts
node bin/create-agent-skill.js meeting-notes --template meeting-notes --target codex --title "会议纪要"
node bin/create-agent-skill.js validate .agents/skills/meeting-notes
```

第一条安装命令只安装生成器自己的依赖。生成的会议纪要 Skill 不需要额外账号、外部服务或可执行脚本。
本仓库没有自动发布 npm；先使用源码命令，发布对应版本后才使用 `npx create-agent-skill`。

## 这一版可以做什么

- 修复名称格式、YAML 描述转义、缺失参数和错误示例链接。
- 真正读取 `templates/` 中的模板，修改模板会影响生成结果。
- 提供会议纪要模板、输出布局、示例原文、预期结果和检查标准。
- 校验元数据、未填占位符和本地资源引用，并输出 JSON。
- 按目标工具生成到项目目录，给出调用方式和可复制的试用提示词。
- 支持预览和覆盖前备份，保留用户另外添加的文件。

## 选好目录

| 参数 | 当前项目中的生成位置 | 试用时调用 |
| --- | --- | --- |
| `--target codex` | `.agents/skills/meeting-notes/` | `$meeting-notes` |
| `--target cursor` | `.cursor/skills/meeting-notes/` | `/meeting-notes` |
| `--target claude` | `.claude/skills/meeting-notes/` | `/meeting-notes` |
| 不指定目标 | `./meeting-notes/` | 将整个文件夹复制到目标工具的技能目录 |

`--dir` 可以覆盖生成位置，但最后一层文件夹必须与技能名称相同，例如 `--dir ./output/meeting-notes`。
`name` 使用英文小写、数字和连字符，最长 64 个字符；中文名称放在 `--title`。全中文技能标识会明确报错，不会悄悄改成 `my-skill`。

## 用一个完整例子试用

生成后打开技能目录中的 `README.md`，把其中的试用提示词复制到目标工具。
从 `references/example.md` 的 Raw input 部分提供原始会议记录，先生成结果，再对照 Expected output 和 Acceptance checks 检查。

示例应该得到 1 项已确认决定、2 项待办。王芳负责客户名单，截止日期为 2026-11-05；反馈表的负责人和时间保持“待确认”；“对全部客户开放”仍是未批准建议。
如果技能没有出现，检查项目目录并重新加载目标工具。

## 先预览，再覆盖

```bash
node bin/create-agent-skill.js meeting-notes --template meeting-notes --dry-run
node bin/create-agent-skill.js meeting-notes --template meeting-notes --force
```

`--dry-run` 不创建、覆盖或备份文件。
`--force` 会把本次将替换的文件备份到旁边的 `meeting-notes.backup-XXXXXX/`，原文件名后增加 `.bak`；恢复时复制回去并去掉 `.bak`。不删除用户自行增加的其他文件。备份中不保留有效名称的 `SKILL.md`，避免被识别为第二个技能。

## 校验结果代表什么

```bash
node bin/create-agent-skill.js validate ./meeting-notes --json
```

- 格式通过：元数据、指令正文和可识别的本地引用检查通过。
- 示例未运行：需要在模型中实际试用，再检查事实和输出。
- 目标工具未验证：生成文件不等于已经被目标工具识别和执行。
- 脚本未运行：校验不会执行技能中携带的程序，也不会安装其运行依赖。

校验会读取支持文件中的 Markdown 链接和资源路径，检查文件是否存在及是否留在技能目录内；不检查远程网址、段落锚点和所有 Markdown 扩展语法。为检查可搬运性，技能内部的符号链接会报错，隐藏目录和 `node_modules` 会跳过。
退出码：成功 `0`，校验或文件读写失败 `1`，参数错误 `2`。

通用 `basic` 模板仍是起点，需要补充真实业务规则和输入输出示例后再反复使用。完整参数表、官方工具文档和开发方式见 [英文说明](README.md)。
