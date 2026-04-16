# Changelog

All notable changes to tldraw-buddy will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] — 2026-04-16

### Added
- Slash commands for common canvas operations:
  - `/tldraw-buddy:start` — start services; drops a random greeting sticky on an empty canvas
  - `/tldraw-buddy:narrate` — human-readable description of what's on the canvas
  - `/tldraw-buddy:save [file.tldr]` — save canvas to disk
  - `/tldraw-buddy:clear` — snapshots and asks before clearing
  - `/tldraw-buddy:list` — list `.tldr` files in the repo and offer to load one
- CI validation of the plugin manifest via `npm run validate` (`claude plugin validate .`)

### Changed
- Marketplace renamed from `sociotechnica` to `jessmartin`. Existing users must re-add the marketplace under the new name.
- Skill moved from `skills/tldraw.md` to `skills/tldraw/SKILL.md` to match Claude Code's expected plugin layout.

### Fixed
- Plugin manifest `author` field now an object instead of a string, so `claude plugin install` no longer errors.
- Bash syntax error in `bin/tldraw-buddy start` (env-var prefix on a subshell) that prevented the script from running.

## [0.1.0]

Initial release.
