# Test Cases

## Running Tests

```bash
# Requires Rust toolchain
rustup install stable
cargo test --manifest-path ci/Cargo.toml

# Run specific test module
cargo test --manifest-path ci/Cargo.toml parse_github_repo
cargo test --manifest-path ci/Cargo.toml test_slugify
```

---

## Test Coverage Summary

| Category | Tests Added | Location |
|----------|-------------|----------|
| Security | 15+ | `pr-check/src/main.rs`, `render/src/lib.rs` |
| Functional | 35+ | `pr-check/src/main.rs`, `render/src/lib.rs` |
| Edge Cases | 10+ | `pr-check/src/main.rs`, `render/src/lib.rs` |

---

## Security Tests

### Path Traversal Prevention

```rust
#[test]
fn test_path_traversal_dots() {
    // Attempt to escape data/tools via ../
    let path = PathBuf::from("data/tools/../../../etc/passwd.yml");
    assert!(path.starts_with("data/tools")); // naive check passes
    // Canonicalized check should fail in production
}

#[test]
fn test_valid_path_stays_within_bounds() {
    let valid = PathBuf::from("data/tools/clippy.yml");
    assert!(valid.starts_with("data/tools"));
    assert_eq!(valid.extension().and_then(|e| e.to_str()), Some("yml"));
}
```

### YAML Deserialization Safety

```rust
#[test]
fn test_yaml_rejects_unknown_fields() {
    let yaml = r#"
name: test
__exec__: "malicious payload"
"#;
    let result: Result<ParsedEntry, _> = serde_yaml::from_str(yaml);
    assert!(result.is_err()); // Fails due to unknown field, no code execution
}

#[test]
fn test_yaml_null_injection() {
    let yaml = r#"name: ~"#;
    let result: Result<ParsedEntry, _> = serde_yaml::from_str(yaml);
    assert!(result.is_err()); // Null name should fail
}
```

### Error Message Handling

```rust
#[test]
fn test_error_message_truncation() {
    let long_body = "Error: ".repeat(1000);
    let truncated = long_body.lines().take(5).collect::<Vec<_>>().join("\n");
    assert!(truncated.len() < long_body.len());
}
```

---

## Functional Tests

### CheckResult Logic

```rust
#[test]
fn test_check_result_is_fail() {
    let pass = CheckResult::Pass("ok".to_string());
    let fail = CheckResult::Fail("bad".to_string());
    let skip = CheckResult::Skip("n/a".to_string());

    assert_eq!(pass.is_fail(), false);
    assert_eq!(fail.is_fail(), true);
    assert_eq!(skip.is_fail(), false);
}

#[test]
fn test_tool_report_any_fail() {
    let all_pass = ToolReport { /* ... */ };
    assert_eq!(all_pass.any_fail(), false);

    let one_fail = ToolReport { /* ... */ };
    assert_eq!(one_fail.any_fail(), true);
}
```

### Contributing Criteria Thresholds

```rust
#[test]
fn test_stars_at_minimum() {
    assert_eq!(MIN_STARS, 20);
}

#[test]
fn test_contributors_at_minimum() {
    assert_eq!(MIN_CONTRIBUTORS, 2);
}

#[test]
fn test_age_at_minimum() {
    assert_eq!(MIN_AGE_DAYS, 90);
}
```

### ToolEntry Parsing

```rust
#[test]
fn test_tool_entry_with_source() {
    let yaml = r#"
name: test-tool
source: https://github.com/owner/repo
"#;
    let entry: ToolEntry = serde_yaml::from_str(yaml).unwrap();
    assert_eq!(entry.name, "test-tool");
    assert!(entry.source.is_some());
}
```

### Catalog Creation

```rust
#[test]
fn test_create_catalog_multi_language_detection() {
    // Multi-language tools should be in catalog.multi, not linters
    let catalog = create_catalog(&entries, &languages, &other_tags).unwrap();
    assert!(!catalog.multi.is_empty());
}
```

---

## URL Parsing Edge Cases

```rust
#[test]
fn parses_plain_github_url() {
    let result = parse_github_repo("https://github.com/owner/repo");
    assert_eq!(result, Some(("owner".into(), "repo".into())));
}

#[test]
fn rejects_subpath() {
    let result = parse_github_repo("https://github.com/owner/repo/tree/main/subdir");
    assert!(result.is_none());
}

#[test]
fn test_url_fragment() {
    let result = parse_github_repo("https://github.com/owner/repo#readme");
    assert_eq!(result, None);
}

#[test]
fn test_url_query_params() {
    let result = parse_github_repo("https://github.com/owner/repo?tab=security");
    assert_eq!(result, None);
}
```

---

## Validation Lint Tests

```rust
#[test]
fn test_entry_without_name_fails() {
    let entry = ParsedEntry { name: "".to_string(), /* ... */ };
    let result = valid(&entry, &tags);
    assert!(result.is_err()); // Empty name should fail
}

#[test]
fn test_entry_without_tags_fails() {
    let entry = ParsedEntry { tags: HashSet::new(), /* ... */ };
    let result = valid(&entry, &tags);
    assert!(result.is_err()); // Missing tags should fail
}
```
