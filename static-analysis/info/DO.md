# What This Code Does

This repository powers [analysis-tools.dev](https://analysis-tools.dev), a curated catalog of static analysis tools for programming languages.

## What It Does

### 1. Maintains a Database

1000+ static analysis tools (linters, formatters, security scanners, etc.) are stored in YAML files under `data/tools/`.

### 2. Generates a Website

The `ci/render` binary reads all tool YAMLs and tags to produce:
- **README.md** - The markdown catalog
- **data/api/tools.json** - JSON API for tools
- **data/api/tags.json** - JSON API for tags

### 3. Validates Contributions

The `ci/pr-check` binary validates new tool submissions:
- Calls the GitHub API when a new tool is submitted
- Checks requirements: **20+ stars**, **2+ contributors**, **3+ months old**
- Posts results as a PR comment
- Fails CI if criteria aren't met

## Architecture Overview

```
data/tools/*.yml  →  ci/render  →  README.md + JSON API
                         ↑
                  ci/pr-check (validates PRs via GitHub API)
```
