# Performance Improvements

## 1. Parallelize GitHub API Calls (Highest Impact)

**Current:** In `ci/render/src/lib.rs`, `check_deprecated` iterates sequentially:

```rust
for entry in entries {
    let commit_list = github.repo(owner, repo).commits().list("").await;
}
```

**Fix:** Use `futures::stream` to fetch in parallel:

```rust
use futures::stream::{self, StreamExt};

let futures = entries.iter().filter_map(|entry| {
    entry.source.as_ref().and_then(|source| parse_github_repo(source))
});

let results = futures
    .map(|(owner, repo)| async move {
        github.repo(&owner, &repo).commits().list("").await
    })
    .buffer_unordered(20) // Rate-limit to 20 concurrent requests
    .collect::<Vec<_>>()
    .await;
```

**Impact:** For 500+ tools, reduces API time from ~5 minutes to ~30 seconds.

---

## 2. Add Response Caching

**Current:** Every `make render` re-fetches all GitHub data.

**Fix:** Cache API responses with TTL:

```rust
struct Cache {
    etags: HashMap<String, String>,
    timestamps: HashMap<String, DateTime<Utc>>,
}

// Use GitHub ETag support for conditional requests
.header("If-None-Match", cached_etag)
```

**Impact:** Subsequent runs skip unchanged repos (GitHub returns 304).

---

## 3. Optimize YAML Parsing

**Current:** Files parsed one-by-one:

```rust
files.iter().map(|p| {
    let file = std::fs::File::open(p)?;
    serde_yaml::from_reader(file)
})
```

**Fix:** Parallel parsing with `rayon`:

```rust
use rayon::prelude::*;

let entries = files
    .par_iter()
    .map(|p| {
        let file = std::fs::File::open(p)?;
        serde_yaml::from_reader(file)
    })
    .collect::<Result<Vec<_>>>()?;
```

**Impact:** 2-4x faster on multi-core systems for 1000+ YAML files.

---

## 4. Incremental Rendering

**Current:** Always regenerates entire README.md and JSON.

**Fix:** Track changed tools, only reprocess:

```rust
let changed_files = get_changed_files_since_last_run();
let unchanged_tools = load_from_cache();
```

**Impact:** PRs touching 1-2 files render in seconds vs. minutes.

---

## 5. PR-Check: Batch API Calls

**Current:** `pr-check` makes 2 sequential calls per tool.

**Fix:** Use GitHub GraphQL to batch:

```graphql
query {
  repository(owner: "owner", name: "repo") {
    stargazerCount
    createdAt
    contributors(first: 100) { totalCount }
  }
}
```

**Impact:** Reduces API round-trips from 2n to 1.

---

## Quick Wins (Low Effort)

| Change | File | Expected Gain |
|--------|------|---------------|
| Add `--jobs` flag for parallelism | `ci/render/src/bin/main.rs` | 2-4x render speed |
| Cache `.tools.json` between runs | `ci/render/src/lib.rs` | Skip unchanged tools |
| Use `serde_yaml::from_str` with `read_to_string` | `ci/render/src/bin/main.rs` | Slightly faster I/O |

**Biggest impact:** Parallel API calls (GitHub API is the primary bottleneck).
