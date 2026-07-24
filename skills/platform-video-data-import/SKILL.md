---
name: platform-video-data-import
description: >
  Import exported video-performance data from Douyin, Xiaohongshu, and WeChat
  Channels into ContentFlow, semantically matching platform titles/descriptions
  to existing videos or transcripts before safely upserting records. Use this
  skill whenever the user provides 抖音作品列表、小红书笔记列表、视频号动态数据
  exports and asks to 导入、更新、覆盖、关联、匹配标题、同步平台数据, even if
  they only say “把这几份最近数据放进系统”. This is a Codex/agent execution
  skill; the in-app prompt-only AI Companion cannot perform filesystem writes.
---

# Platform video data import

Use AI for the part that needs judgment: deciding whether differently worded
platform titles and ContentFlow videos/transcripts describe the same underlying
video. Use the bundled runner for parsing, IDs, upserts, backups, validation,
and writes. Keeping those responsibilities separate makes repeat imports
auditable and idempotent.

## Inputs

Accept one or more `.xlsx`, `.xls`, `.csv`, or normalized `.json` exports from:

- 抖音作品列表
- 小红书笔记列表明细
- 视频号动态数据明细

Also locate the ContentFlow data directory. Prefer an explicit path from the
user. In this repository, the current known directory is:

`/Users/liuxingqi/Library/Mobile Documents/iCloud~md~obsidian/Documents/SecondBrain/90.工具数据/IPC`

Before relying on that default, verify that it contains `videos.json`,
`scripts.json`, and the three `*Records.json` files. If more than one valid
directory is plausible, ask which one is active.

## Workflow

### 1. Inspect without writing

Confirm source paths, file sizes, and modification times. Confirm the data
directory signature and record counts. Do not write yet.

Close ContentFlow before the apply phase. Concurrent app saves can otherwise
overwrite a correct import.

### 2. Prepare an import plan

Run:

```bash
node <skill-dir>/scripts/import-platform-data.mjs prepare \
  --project-dir <contentflow-repo> \
  --data-dir <contentflow-data-dir> \
  --out <writable-work-dir>/import-plan.json \
  --source <file-1> --source <file-2> --source <file-3>
```

The runner detects the platform from headers, parses typed metrics, reads
existing videos/scripts/transcript excerpts and known platform-title aliases,
then applies deterministic eligibility filters before creating ranked
candidates. It also records hashes of the sources and current target files so a
stale plan cannot be applied silently.

The following rows must be locked as `skip` before title matching or upsert:

- playback is exactly `0`: use 抖音“播放量”, 小红书“观看量”, and
  视频号“播放量” as the platform-specific playback field;
- for 抖音 and 小红书, “体裁” is not an explicit video type: accept standard
  video values (`视频`, `短视频`, `视频作品`, `视频笔记`) and duration labels that
  end in “视频” such as `1-3min视频`; reject “图文”, “非视频”, unknown values,
  and empty values. The current 视频号 export is video-specific and has no
  genre column.

Require the platform playback column and parse it as a complete non-negative
number. A missing column, blank cell, malformed value, or negative value is a
source-data error and must stop preparation rather than being treated as zero.

Keep skipped rows in the plan and report as an audit trail, but do not rank AI
candidates, create Videos, add raw records, or update existing records for them.

If a file cannot be identified or required columns are absent, stop and report
the exact headers found. Do not guess column positions.

### 3. Make semantic decisions

Read every `pending` plan item and fill its decision. Use:

- `match`: the platform row is the same underlying content as an existing
  ContentFlow video.
- `create`: no existing video represents this content. Rows from multiple
  platforms for the same underlying video must share one `newGroupId` so only
  one Video is created.
- `review`: two or more candidates remain genuinely plausible.
- `skip`: the deterministic filters rejected the row, or it otherwise does not
  belong in the requested video import, with a concrete reason. Never override
  a locked zero-playback or non-video skip manually.

When matching, reason from the whole content identity, not word overlap alone:

- the core promise, question, tutorial, or opinion is the same;
- named products, models, people, quantities, and version numbers agree;
- the script title, transcript opening, and known platform aliases support the
  candidate;
- publication dates are plausible and do not conflict with platform history.

Different hooks are normal. For example, “GPT5.6一来，Superpowers就该卸载了”
can match a library title about uninstalling Superpowers if the transcript and
entities agree. Conversely, two generic “Claude Code 新手教程” rows are not the
same video without stronger evidence.

Record `confidence`, a short `reason`, the strongest evidence, and the runner-up
candidate. Confidence is only an audit signal; apply the following gate:

- Existing valid internal link or unique exact normalized identity can remain
  locked.
- Auto-accept a semantic `match` only at confidence `>= 0.90`, when the runner-up
  is at least `0.15` lower and no ID/date evidence conflicts.
- Use `review` when the distinction is unclear. Do not turn ambiguity into
  `create`, because that duplicates videos.

If review items remain, show a compact table containing source title, top two
system candidates, dates, and why it is ambiguous. Ask only for those choices.

### 4. Validate and preview

Run validation, then dry-run apply:

```bash
node <skill-dir>/scripts/import-platform-data.mjs validate --plan <plan.json>

node <skill-dir>/scripts/import-platform-data.mjs apply \
  --project-dir <contentflow-repo> \
  --data-dir <contentflow-data-dir> \
  --plan <plan.json> \
  --report <writable-work-dir>/import-report.json
```

Dry-run is the default. Inspect the report before writing. It should enumerate
raw records added/updated, videos created, links changed, skipped rows, and any
warnings. `review` or invalid target IDs block apply.

### 5. Apply safely

After validation passes and the app is closed, run the same apply command with
`--apply`. The runner rechecks hashes, creates a timestamped backup, writes
temporary files in the target directory, parses and validates them, and then
renames them into place.

Upsert behavior:

- Preserve an existing raw record's internal `id`, `createdAt`, confirmed
  `videoId`, and unknown fields; overwrite metrics present in the new export.
- Add a raw record when its stable platform key does not exist.
- Never overwrite an existing Video's canonical title, transcript, tags, notes,
  or unrelated platform metadata during a match.
- For a new Video, use the AI-selected canonical title, mark it published, add
  only observed platform publication entries, and link all rows in its group.
- Store WeChat Channels' native ID in `platformVideoId`; reserve `videoId` for
  the internal ContentFlow Video ID. Interpret legacy `videoId` values beginning
  with `vid_` as internal IDs and other values as native platform IDs.

See [references/data-contract.md](references/data-contract.md) for field and key
details.

### 6. Verify idempotence

Run `prepare` and dry-run `apply` once more against the same sources. Success
means:

- zero new raw records;
- zero new Videos;
- every linked raw `videoId` exists in `videos.json`;
- native platform IDs remain preserved;
- every imported row resolves to the same target as the first run.

Report the backup path and counts by platform. If an unexpected difference
remains, stop and diagnose it before claiming completion.

## Safety boundaries

- Never edit source exports.
- Never import a row whose platform playback field is `0`.
- Never import an explicit non-video type such as “图文”.
- Never coerce a missing or invalid playback value to `0`; stop and report it.
- Never replace an entire platform array with only the new file's rows; merge it.
- Never use title alone as a cross-platform overwrite key.
- Never invent an existing `vid_*` ID. It must exist in `videos.json`.
- Never apply a plan if source or target hashes changed after preparation.
- Do not modify `scripts.json`, transcript Markdown, topics, tags, covers, or
  `metrics.json` for this workflow.
- Keep the generated plan and report as the audit trail, but do not commit user
  analytics data or backups into the code repository.

## Completion report

Return:

- source files and detected platforms;
- added/updated/linked/skipped/review counts per platform;
- Videos created, with canonical titles;
- semantic matches that were not exact, with one-line evidence;
- backup path and idempotence result;
- any unresolved review items.
