# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build, Test, and Lint Commands

- `npm test` - Run full test suite (lints with xo, runs tests with ava, checks types with tsd, coverage with c8)
- `npm run bench` - Run benchmarks with matcha

To run a single test file:
- `npx ava test/chalk.js` - Run specific test file
- `npx ava test/chalk.js --match "support nesting styles"` - Run specific test by name match

## Code Architecture

### Core Structure

This is **chalk**, a terminal string styling library. Key architectural decisions:

- **ESM-only** - The package uses `"type": "module"` and exports `./source/index.js` directly
- **Zero dependencies** - Vendor packages (`ansi-styles`, `supports-color`) are bundled in `source/vendor/`
- **Subpath imports** - Uses Node.js subpath imports (`#ansi-styles`, `#supports-color`) for vendor modules

### Main Entry Point

`source/index.js` exports:
- `chalk` (default) - The main chalk instance with auto-detected color level for stdout
- `Chalk` - Class for creating custom instances with specific color levels
- `chalkStderr` - Separate instance configured for stderr stream
- `supportsColor`, `supportsColorStderr` - Color support detection info

### Internal Architecture

The styling system uses a **builder pattern with prototype chains**:

1. **Symbols for internal state**:
   - `GENERATOR` - Reference to parent chalk instance
   - `STYLER` - Style chain (open/close codes with parent)
   - `IS_EMPTY` - Whether the builder is the `visible` modifier

2. **Style application** (`applyStyle` function):
   - Handles ANSI escape code nesting (replaces close codes with re-opening)
   - Handles line breaks by wrapping each line with style codes
   - Respects color level (0-3)

3. **Color levels**:
   - `0` - No colors
   - `1` - Basic 16 colors (ANSI)
   - `2` - 256 colors (ANSI256)
   - `3` - Truecolor (16 million colors, ANSI16m)

### Test Structure

Tests use **ava** framework and are in `test/`:
- `chalk.js` - Main styling functionality tests
- `instance.js` - Chalk class instance tests
- `level.js` - Color level tests
- `visible.js` - Visible modifier tests
- `no-color-support.js` - No color support scenario tests
- `_fixture.js` - Test fixtures

## Code Style

- **Tabs for indentation** (spaces for YAML files)
- **LF line endings**
- **xo linter** with specific rules disabled (see `package.json`)
- **No semicolons** (implicit in xo config)