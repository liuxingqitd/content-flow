# ContentFlow import data contract

## Target files

The importer changes only:

- `videos.json`
- `douyinRecords.json`
- `xiaohongshuRecords.json`
- `shipinhaoRecords.json`

The importer reads, but does not change:

- `scripts.json`
- `scripts/*.md`

## Eligibility filters

Apply these filters before stable-key lookup, candidate ranking, semantic
matching, or upsert:

| Platform | Playback field | Video-type field |
| --- | --- | --- |
| 抖音 | `播放量` / `plays` | `体裁` / `genre` |
| 小红书 | `观看量` / `views` | `体裁` / `genre` |
| 视频号 | `播放量` / `plays` | not present in the current export |

- Skip playback exactly equal to `0`; it commonly represents a violated,
  hidden, or otherwise invalid video.
- For 抖音 and 小红书, accept normalized standard video genres (`视频`,
  `短视频`, `视频作品`, `视频笔记`) and duration labels ending in “视频”, such as
  `1-3min视频`. Explicitly reject “非视频”; also skip “图文”, unknown values,
  and empty values. The current 视频号 export is video-specific and does not
  expose a genre field.
- Require the playback column. Parse the full cell as a non-negative number;
  missing, blank, malformed, unit-suffixed, or negative values are errors, not
  zero-playback skips.
- Emit a locked `skip` decision with the concrete reason and source evidence.
  Do not generate AI candidates or write any target record for the row.

## Stable raw-record keys

Use the strongest available platform identity:

| Platform | Primary key | Fallback key |
| --- | --- | --- |
| 抖音 | native content ID when a future export provides it | exact timestamp + normalized full title |
| 小红书 | native note ID when a future export provides it | exact timestamp + normalized full title |
| 视频号 | `platformVideoId` | publication date + normalized full description |

Normalization removes presentation emoji, hashtags used only as distribution
metadata, punctuation, and whitespace, and lowercases Latin text. It must not
remove digits, version numbers, model names, or meaningful Chinese text.

Title normalization is suitable for finding/upserting the same platform row;
it is not proof that titles from two different platforms represent the same
video.

## Link fields

- `videoId`: internal ContentFlow Video ID; when present it must reference a
  member of `videos.json`.
- `platformVideoId`: the platform-native content ID. Currently relevant to
  WeChat Channels; preserve it across every import.

Legacy WeChat Channels migration:

- legacy `videoId` starting with `vid_` -> internal link;
- other non-empty legacy `videoId` -> platform-native ID;
- after migration, write the native value to `platformVideoId` and the internal
  link (if known) to `videoId`.

## Update semantics

When a raw stable key already exists:

1. Keep `id` and `createdAt`.
2. Keep a valid existing `videoId` unless the reviewed plan explicitly changes
   it.
3. Keep unknown fields not represented in the current export.
4. Replace fields represented in the export, including zero values.
5. Never treat an empty parsed cell as permission to delete unrelated metadata.

When no stable key exists, create a raw record with a new platform-prefixed ID
and current `createdAt`.

## New Video defaults

Create one Video per `newGroupId` with:

- a new `vid_*` ID;
- AI-reviewed canonical title;
- `status: "published"`;
- empty `tagIds`;
- one `platforms` entry per observed platform;
- status history containing the published transition;
- earliest observed publication time as `createdAt`;
- current time as `updatedAt`.

Do not create a Script, Topic, transcript, tag, cover, or metric implicitly.

## Plan invariants

- Each source row has exactly one decision.
- A `match` target exists in the plan's Video snapshot.
- A `create` has both `newGroupId` and `canonicalTitle`.
- Every row in a `newGroupId` uses the same canonical title.
- `review` blocks apply.
- Source and target hashes still match at apply time.
- Raw stable keys are unique per platform after merge.
- All internal links resolve after merge.
