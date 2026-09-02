# PK Session

[FR](README.md) · [EN](README_en.md)

PK Session preserves your Chrome workspaces as living sessions that are automatically versioned and can be restored without closing your current windows.

## Features

- Immutable versions created after navigation and structural changes.
- Preserved composition, order, groups, pinned tabs, active tab, and sleeping state.
- Non-destructive restoration of every Chrome window in the session.
- Durable identity for every tab and a complete navigation history.
- Parent/child relationships between tabs opened from another page.
- Three complementary views: Workspace, Journey, and Origins.
- Hover page preview, favicon, title, URL, and direct close action for every active tab.
- Extension icon badge synchronized with the number of open web tabs.
- Local IndexedDB storage with no account, remote API, or telemetry.

## Usage

- **Workspace** displays the tabs and groups of a specific version.
- **Journey** shows each tab’s lifeline and URL changes.
- **Origins** maps relationships between parent and child tabs.
- The Versions rail lets you inspect and restore an earlier state.
- Clicking a row activates the matching Chrome tab; the details panel remains limited to the Journey and Origins views.
- Windows appear as separate packs containing their own groups and tabs.
- `Cmd/Ctrl+K` focuses search, and the Settings button opens a dedicated drawer.

## Build

Requirements: [Bun](https://bun.sh/) and a recent version of Google Chrome.

```bash
cd v2
bun install
bun run compile
bun run test
bun run build
```

The unpacked build is available in `v2/extension-build/chrome-mv3`.

## Installation

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select `v2/extension-build/chrome-mv3`.
5. After each build, click **Reload** on the extension card.

## Structure

- `v2/src/engine.ts`: session capture, tab identity, and restoration.
- `v2/src/db.ts`: IndexedDB storage.
- `v2/src/App.tsx`: Workspace, Journey, and Origins views.
- `templates/`: visual concepts that guided the V2.
- `archive/v1`: V1 archive branch.

## Privacy

Page access permission is used only to capture a local preview when a tab becomes active. Thumbnails remain in IndexedDB and are never sent to a remote service.

## History

See the [CHANGELOG](CHANGELOG.md) for the complete history.
