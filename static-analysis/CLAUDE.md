# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository powers [analysis-tools.dev](https://analysis-tools.dev), a curated catalog of static analysis tools. The README.md and JSON API are **generated** from YAML data files—never edit them directly.

## Core Commands

```bash
# Regenerate README.md and JSON API from YAML sources
make render

# Render without deprecated tools (for CI)
make render-skip-deprecated

# Run Rust type checks
make check

# Run Clippy lints
make clippy

# Format Rust code
make fmt

# Run tests
make test
```

## Data Format

### Adding a Tool

Create a new file in `data/tools/<toolname>.yml`:

```yaml
name: tool-name
categories:
  - linter
tags:
  - rust
license: Apache-2.0
types:
  - cli
source: "https://github.com/owner/repo"
homepage: "https://example.com"
description: Short description (max 500 chars)
```

### Contributing Criteria (enforced by CI)

Tools must meet these requirements:
- **20+ GitHub stars**
- **2+ contributors** (excluding bot accounts)
- **3+ months old** (90 days since creation)
- Actively maintained

The `pr-check` binary validates these criteria on PRs and posts results as a comment.

### Tags

All valid tags are defined in `data/tags.yml`. Each tag has:
- `name`: Display name
- `value`: Internal identifier (used in YAML files)
- `type`: `language` or `other`

## Code Architecture

```
ci/
  ├── Cargo.toml          # Workspace root
  ├── render/             # README + JSON generator
  │   ├── src/
  │   │   ├── lib.rs      # Core logic: catalog creation, API generation
  │   │   ├── types.rs    # Data structures (Entry, Tag, Catalog, Api)
  │   │   ├── lints.rs    # YAML validation lints
  │   │   ├── stats.rs    # Statistics formatting
  │   │   └── bin/main.rs # CLI entrypoint
  │   └── templates/      # Askama templates for Markdown rendering
  └── pr-check/           # PR validation bot
      └── src/main.rs     # Checks stars, contributors, age via GitHub API
data/
  ├── tools/              # One YAML file per tool
  ├── tags.yml            # All valid tags
  └── api/                # Generated JSON API output
```

### Key Flows

1. **Render Pipeline** (`ci/render`):
   - Reads `data/tags.yml` and all `data/tools/*.yml`
   - Validates entries against tags
   - Optionally checks deprecation status via GitHub API
   - Groups tools by language/other tags into a `Catalog`
   - Renders Markdown via Askama templates
   - Generates JSON API in `data/api/`

2. **PR Check** (`ci/pr-check`):
   - Receives paths to new/modified tool YAMLs
   - Fetches GitHub metadata (stars, created_at, contributors)
   - Evaluates against contribution criteria
   - Posts results as PR comment (idempotent via marker)
   - Exits non-zero on failure to block CI

## YAML Schema

Required fields for tool entries:
- `name`: Tool display name
- `categories`: List (e.g., `linter`, `formatter`)
- `tags`: List of tag values from `data/tags.yml`
- `license`: SPDX identifier or `proprietary`
- `types`: List (e.g., `cli`, `ide-plugin`, `library`)
- `description`: Max 500 characters

Optional fields:
- `source`: GitHub/GitLab URL (used for deprecation + criteria checks)
- `homepage`: Project website
- `discussion`: Issue URL for community discussion about tool status
- `deprecated`: `true` if unmaintained (>1 year no commits)
- `pricing`, `plans`: For commercial tools
- `resources`, `reviews`, `demos`: Lists of external links
- `wrapper`: Community wrapper info

## CI Workflows

- **ci.yml**: Validates README wasn't edited directly, runs render on PRs
- **pr-check.yml**: Runs contribution criteria checker
- **links.yml**: Checks for broken links
- **render.yml**: Re-renders README on merge to master
- **stats.yml**: Updates tool statistics

## Development Notes

- The renderer uses **Askama** templates—changes to templates require recompilation
- PR check uses `GITHUB_TOKEN` with `pull-requests: write` permission
- 404 responses from GitHub API are treated as "skip" (not fail) for missing repos
- Tools with multiple language tags (>1) are grouped under "Multiple Languages"
- C/C++ tools are excluded from multi-language grouping (common cross-support)
