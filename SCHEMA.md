# status.json schema (v1)

The Virtual Office page (`index.html`) renders **only** from `status.json`. It is fetched with a cache-busting
query (`status.json?t=<timestamp>`) on load and re-checked every 60 seconds.

> The hosting repo is PUBLIC. Keep every string high-level. Never include money amounts, account/EIN numbers,
> addresses, phone numbers, third-party emails, client names, case details or credit specifics.

## Top level

| Field | Type | Required | Notes |
|---|---|---|---|
| `schemaVersion` | number | no | Currently `1`. |
| `lastUpdated` | string (ISO 8601 **with offset**) | yes | e.g. `2026-10-10T13:45:00-06:00`. Shown as relative time + Mountain Time. Invalid → "Last updated: unknown". |
| `updatedBy` | string | no | Who wrote the update. Default `"Alfred"`. |
| `departments` | array of Department | yes | Order = order of rooms on mobile. |
| `bots` | array of Bot | yes | One desk per bot. |

## Department

| Field | Type | Notes |
|---|---|---|
| `id` | string | Room key. The desktop floor plan has fixed slots for `alfred, money, legal, sosa, coach, online, email, travel, publishing, it`. |
| `name` | string | Room label. Defaults to the id. |
| `color` | string `#rrggbb` | Room accent + floor tint. Invalid → slate gray. |

## Bot

| Field | Type | Default if missing | Notes |
|---|---|---|---|
| `id` | string | `bot-<index>` | Public slug (internal agent ids are intentionally omitted). |
| `name` | string | `Unnamed bot N` | |
| `role` | string | `Team member` | One line. |
| `department` | string | `other` | Must match a department `id`; unknown ids get an auto "Other"-style room. |
| `avatar` | string (relative path) | initials avatar | e.g. `img/avatars/web-manager.jpg`. Broken images fall back to initials. |
| `status` | enum | `idle` | `working` (green, typing dots + monitor glow), `idle` (gray), `blocked` (red), `waiting_on_salim` (amber). |
| `currentTask` | string | `No current task listed` | Truncated on the desk; full in the side panel. |
| `needsSalim` | boolean | `false` | Shows the pulsing "Needs Salim" badge. Also forced `true` if `needsSalimItems` is non-empty. |
| `done` | string[] | `[]` | |
| `inProgress` | string[] | `[]` | |
| `blocked` | string[] | `[]` | |
| `needsSalimItems` | string[] | `[]` | |
| `alsoIn` | string[] | `[]` | Extra department ids that list this bot as "Also on this team" (e.g. Sosa Cleans Inbox sits in Email and is referenced from Sosa). |

Unknown fields are ignored. Non-string list items are dropped. Validation warnings go to the browser console.

## Example update (one bot)

```json
{
  "id": "credit-repair",
  "name": "Credit Repair",
  "role": "Credit file work and timelines",
  "department": "money",
  "avatar": "img/avatars/credit-repair.svg",
  "status": "working",
  "currentTask": "Credit file review in progress",
  "needsSalim": true,
  "done": ["Collected latest reports"],
  "inProgress": ["Credit file review in progress"],
  "blocked": [],
  "needsSalimItems": ["Approve next round of letters"]
}
```
Remember to bump `lastUpdated` (and `updatedBy`) on every update.
