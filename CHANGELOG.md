# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.1.0] - 2026-07-19

### Added in 3.1.0

- The app now works offline: a service worker caches everything it needs to run, so it keeps working after the first load, and it can be installed on your device like a native app
- A small banner appears whenever you lose connection, so you always know your changes are only saved on this device until you're back online

## [3.0.0] - 2026-07-18

### Added in 3.0.0

- Export and import your data as a JSON file from Settings, to back it up or move it to another device
- Set your name in Settings so completed-task quotes are attributed to you
- Edit a task's name, minutes, and reason inline from the planner, right where you select it
- Add a task from a dedicated page or from a quick modal on the planner
- A "Save modifications" / "Discard" flow on the planner batches frequency, date, and inline field edits together

### Changed in 3.0.0

- **Breaking:** all cloud sync via Appwrite is removed. Tasks and settings now live only in this browser's local storage — there is no automatic migration from previously cloud-synced data, so export anything you need to keep from the old version before updating
- Task frequency is now edited as a free-text quantity + unit instead of only the previous fixed increase/decrease steps

### Fixed in 3.0.0

- A single malformed task (e.g. from manual data tampering) can no longer wipe your entire local task list on reload — only the invalid task is dropped
- Interacting with the add-task form or Settings while the app is still loading your saved data no longer risks silently losing that edit
- A closed tab or page refresh no longer risks losing an edit made in the last fraction of a second before the save was due to fire
- Frequency quantities are capped so an unusually large typed number can no longer corrupt a task's recurrence

### Removed in 3.0.0

- The Appwrite credentials setup screen and all Appwrite-backed sync, upload, and idle-refresh code

## [2.1.3] - 2026-07-14

### Added in 2.1.3

- Kitchen Sink page showcasing the app's colors, typography, buttons, and other UI components, linked from the About page
- `_redirects` file so `robots.txt` and deep links resolve correctly on the hosting platform

### Changed in 2.1.3

- Simplified the color theme to a single dark palette instead of a light/dark toggle
- Floating menu now opens on hover in addition to click, and no longer hides Planner/About before setup is complete
- Progress accent color now uses discrete named colors instead of a computed gradient
- Smooth scrolling and a custom scrollbar styling applied site-wide

### Fixed in 2.1.3

- Finale celebration no longer reappears after reloading the app on the same day it was dismissed
- Planner save no longer discards a frequency change when a task's date was also modified in the same session, and vice versa
- Planner page shows a setup prompt instead of failing when opened before Appwrite credentials are configured
- Floating menu no longer leaks its hover-close timer when unmounted
- Task card text no longer overflows or gets truncated on long task names
- Fixed capitalization of "GitHub" on the About page

## [2.1.0] - 2026-07-12

### Added in 2.1.0

- Finale celebration screen with confetti and sound when all tasks are done
- Animated checkmark icon for completed tasks
- Progress-driven accent color across the tasks page

### Changed in 2.1.0

- Restyled task list, status text, and floating menu for the dark redesign
- Simplified progress bar rendering and background handling

### Fixed in 2.1.0

- Finale overlay no longer stays visible if a task becomes active again during the celebration window
- Finale overlay is now dismissible via keyboard as a focusable button, not just by clicking

### Removed in 2.1.0

- Emoji-based active task markers and animated gradient background

## [2.0.0] - 2026-07-06

### Changed in 2.0.0

- Migrated the project back out of the monorepo into its own repository

[Unreleased]: https://github.com/Shuunen/what-now/compare/v3.1.0...HEAD
[3.1.0]: https://github.com/Shuunen/what-now/compare/v3.0.0...v3.1.0
[3.0.0]: https://github.com/Shuunen/what-now/compare/v2.1.3...v3.0.0
[2.1.3]: https://github.com/Shuunen/what-now/compare/v2.1.0...v2.1.3
[2.1.0]: https://github.com/Shuunen/what-now/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/Shuunen/what-now/releases/tag/v2.0.0
