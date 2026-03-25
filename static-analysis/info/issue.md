# Security Analysis

## Low Risk Overall

This is a data-driven Rust application with minimal attack surface. No critical vulnerabilities found, but several hardening opportunities exist.

---

## 1. Path Traversal in CLI Arguments (Low)

**Location:** `ci/pr-check/src/main.rs:452-458`

```rust
let tool_paths: Vec<PathBuf> = tool_paths
    .into_iter()
    .filter(|p| {
        p.starts_with("data/tools")
            && matches!(p.extension().and_then(|e| e.to_str()), Some("yml") | Some("yaml"))
    })
    .collect();
```

**Issue:** The `starts_with("data/tools")` check can be bypassed with symlinks or paths like `data/tools/../../../etc/passwd.yml`.

**Fix:** Use `canonicalize()` and verify the resolved path is within the intended directory:

```rust
let canonical = p.canonicalize()?;
let tools_dir = std::env::current_dir()?.join("data/tools");
if !canonical.starts_with(&tools_dir) {
    continue;
}
```

---

## 2. Error Message Disclosure (Info)

**Location:** `ci/pr-check/src/main.rs:165, 240, 269`

```rust
bail!("GET {url} returned {status}: {body}");
```

**Issue:** API error responses (including potentially sensitive debug info) are logged and posted to PR comments.

**Fix:** Sanitize error messages before external exposure:

```rust
let sanitized = body.lines().take(5).collect::<Vec<_>>().join("\n");
```

---

## 3. No Rate Limiting on GitHub API (Operational)

**Location:** `ci/pr-check/src/main.rs:311-392`

**Issue:** Processing many new tools simultaneously could hit GitHub API rate limits, causing CI failures.

**Fix:** Add exponential backoff and rate limiting:

```rust
use tower::ServiceExt;
use tower_http::rate_limit::RateLimitLayer;
```

---

## 4. Token Handling (Hardened but Documented)

**Location:** `ci/pr-check/src/main.rs:440`, `ci/render/src/lib.rs:25-28`

**Current:** Tokens read from env vars, used in `Authorization` headers. No logging observed.

**Recommendation:** Add explicit documentation that `GITHUB_TOKEN` must have minimal scopes (`pull-requests: write`, `repo:read` only).

---

## 5. YAML Deserialization (Low)

**Location:** `ci/render/src/bin/main.rs:47`, `ci/pr-check/src/main.rs:302`

```rust
let entry: ParsedEntry = serde_yaml::from_reader(file)?;
```

**Status:** `serde_yaml` in Rust is memory-safe (no arbitrary code execution like Python's `yaml`). The `ParsedEntry` struct only deserializes expected fields.

---

## Positive Security Properties

| Feature | Status |
|---------|--------|
| No shell/command execution | ✓ |
| Compile-time template safety (Askama) | ✓ |
| No dynamic code execution | ✓ |
| Type-safe YAML parsing | ✓ |
| GitHub API uses HTTPS only | ✓ |
| No user-controlled URLs fetched | ✓ |
| 404 responses handled safely | ✓ |

---

## Summary

No critical/high vulnerabilities. The codebase is security-conscious by design (Rust memory safety, no shell execution, compile-time templates). The path traversal issue is the only exploitable vector, but requires CLI access (CI environment only).

**Recommended:** Fix path canonicalization and add rate limiting for operational resilience.
