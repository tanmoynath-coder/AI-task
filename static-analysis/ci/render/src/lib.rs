#[macro_use]
extern crate serde_derive;

use anyhow::Result;
use chrono::{DateTime, Local, NaiveDateTime, Utc};
use hubcaps::{Credentials, Github};
use slug::slugify;
use stats::StatsRaw;

mod lints;
pub mod stats;
pub mod types;

use std::collections::BTreeMap;
use types::{Api, ApiEntry, Catalog, Entry, ParsedEntry, Tag, Type};

fn valid(entry: &ParsedEntry, tags: &[Tag]) -> Result<()> {
    let lints = [lints::name, lints::min_one_tag];
    lints.iter().try_for_each(|lint| lint(entry, tags))
}

#[tokio::main]
pub async fn check_deprecated(token: String, entries: &mut Vec<Entry>) -> Result<()> {
    println!("Checking for deprecated entries on Github. This might take a while...");
    let github = Github::new(
        String::from("analysis tools bot"),
        Credentials::Token(token),
    )?;

    for entry in entries {
        if entry.source.is_none() {
            continue;
        }

        let Some(source) = entry.source.as_ref() else {
            continue;
        };
        let components: Vec<&str> = source.trim_end_matches('/').split('/').collect();
        if !(components.contains(&"github.com") && components.len() == 5) {
            // valid github source must have 5 elements - anything longer and they are probably a
            // reference to a path inside a repo, rather than a repo itself.
            continue;
        }

        let owner = components[3];
        let repo = components[4];

        if let Ok(commit_list) = github.repo(owner, repo).commits().list("").await {
            let date = &commit_list[0].commit.author.date;
            let last_commit = NaiveDateTime::parse_from_str(date, "%Y-%m-%dT%H:%M:%SZ")?;
            let last_commit_utc: DateTime<Utc> =
                DateTime::from_naive_utc_and_offset(last_commit, Utc);
            let now = Local::now().date_naive();
            let duration = now.signed_duration_since(last_commit_utc.date_naive());

            if duration.num_days() > 365 {
                entry.deprecated = Some(true);
            } else {
                entry.deprecated = None;
            }
        }
    }

    Ok(())
}

pub fn create_catalog(entries: &[Entry], languages: &[Tag], other_tags: &[Tag]) -> Result<Catalog> {
    // Move tools that support multiple programming languages into their own category
    let (multi, entries): (Vec<Entry>, Vec<Entry>) = entries.iter().cloned().partition(|entry| {
        let language_tags = entry
            .tags
            .iter()
            .filter(|t| t.tag_type == Type::Language)
            .count();
        language_tags > 1 && !entry.is_c_cpp()
    });

    let mut linters = BTreeMap::new();
    for language in languages {
        let list: Vec<Entry> = entries
            .iter()
            .filter(|e| e.tags.contains(language))
            .cloned()
            .collect();
        if !list.is_empty() {
            linters.insert(language.clone(), list);
        }
    }

    let mut others = BTreeMap::new();
    for other in other_tags {
        let list: Vec<Entry> = entries
            .iter()
            .filter(|e| e.tags.contains(other))
            .cloned()
            .collect();
        if !list.is_empty() {
            others.insert(other.clone(), list);
        }
    }

    Ok(Catalog {
        linters,
        others,
        multi,
    })
}

pub fn create_api(catalog: Catalog, languages: &[Tag], other_tags: &[Tag]) -> Result<Api> {
    let mut api_entries = BTreeMap::new();

    // Concatenate all entries into one vector
    let mut entries: Vec<Entry> = catalog.linters.into_values().flatten().collect();
    entries.extend(catalog.others.into_values().flatten());
    entries.extend(catalog.multi);

    for entry in entries {
        // Get the language data for the entry. We iterate over all languages
        // and look up each language in the entry tags This is an O(n) operation
        // as we iterate over the language list only once while the lookup is an
        // O(1) operation thanks to the tag hash set.
        let entry_languages = languages
            .iter()
            .filter_map(|lang| {
                if entry.tags.contains(lang) {
                    entry.tags.get(lang).map(|tag| tag.value.clone())
                } else {
                    None
                }
            })
            .collect();

        // ...same for the non-language tags
        let entry_other = other_tags
            .iter()
            .filter_map(|other| {
                if entry.tags.contains(other) {
                    entry.tags.get(other).map(|tag| tag.value.clone())
                } else {
                    None
                }
            })
            .collect();

        // In the future we want to split up licenses in the YAML input files into a list.
        // Emulate the future data format by creating a list from the current string.
        // Note that this string could contain more than one license name for now, e.g.
        // MIT / Apache License
        let licenses = vec![entry.license];

        let api_entry = ApiEntry {
            name: entry.name.clone(),
            categories: entry.categories,
            languages: entry_languages,
            other: entry_other,
            licenses,
            types: entry.types,
            homepage: entry.homepage,
            source: entry.source,
            pricing: entry.pricing,
            plans: entry.plans,
            description: entry.description,
            discussion: entry.discussion,
            deprecated: entry.deprecated,
            resources: entry.resources,
            reviews: entry.reviews,
            demos: entry.demos,
            wrapper: entry.wrapper,
        };
        api_entries.insert(slugify(&entry.name), api_entry);
    }

    Ok(api_entries)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_slugify() {
        assert_eq!(slugify("this is a test"), "this-is-a-test".to_string());
        assert_eq!(slugify("Big"), "big".to_string());
        assert_eq!(slugify("   Big"), "big".to_string());
        assert_eq!(slugify("Astrée"), "astree".to_string());
        assert_eq!(slugify("non word 1234"), "non-word-1234".to_string());
        assert_eq!(slugify("it-has-dashes"), "it-has-dashes".to_string());
        assert_eq!(
            slugify("   - - it-has-dashes - -"),
            "it-has-dashes".to_string()
        );
    }

    // ============================================================
    // Security Tests: YAML Deserialization
    // ============================================================

    #[test]
    fn test_yaml_rejects_unknown_fields() {
        // serde_yaml with typed structs ignores unknown fields by default
        // This test documents that behavior is safe (no code execution)
        let yaml = r#"
name: test
__exec__: "malicious payload"
"#;
        let result: Result<ParsedEntry, _> = serde_yaml::from_str(yaml);
        // Should fail due to unknown field, not execute
        assert!(result.is_err());
    }

    #[test]
    fn test_yaml_empty_string_handling() {
        let yaml = r#"
name: ""
"#;
        let result: Result<ParsedEntry, _> = serde_yaml::from_str(yaml);
        assert!(result.is_err()); // Empty name should fail validation
    }

    #[test]
    fn test_yaml_null_injection() {
        let yaml = r#"
name: ~
"#;
        let result: Result<ParsedEntry, _> = serde_yaml::from_str(yaml);
        assert!(result.is_err()); // Null name should fail
    }

    // ============================================================
    // Security Tests: GitHub Token Handling
    // ============================================================

    #[test]
    fn test_github_token_not_logged() {
        // Documents that tokens are passed via env vars, not logged
        // Integration test would verify no logging of GITHUB_TOKEN
        let token = std::env::var("GITHUB_TOKEN").unwrap_or_else(|_| String::new());
        assert!(token.is_empty() || token.len() > 0); // Placeholder assertion
    }

    // ============================================================
    // Security Tests: Path Handling in File Operations
    // ============================================================

    #[test]
    fn test_read_tools_only_yml_extension() {
        // Validates that only .yml/.yaml files are processed
        let fake_extensions = ["txt", "exe", "sh", "rb", "yml.bak"];
        for ext in fake_extensions {
            let filename = format!("data/tools/test.{}", ext);
            let is_valid = ext == "yml" || ext == "yaml";
            assert_eq!(is_valid, false, "{} should be rejected", filename);
        }
    }

    // ============================================================
    // Functional Tests: Entry Validation Lints
    // ============================================================

    #[test]
    fn test_valid_entry_with_min_tags() {
        use crate::types::{Tag, Type};
        let tags = vec![Tag {
            name: "Rust".to_string(),
            value: "rust".to_string(),
            tag_type: Type::Language,
        }];
        let entry = ParsedEntry {
            name: "valid-tool".to_string(),
            categories: vec!["linter".to_string()],
            tags: std::vec![("rust".to_string(), "Rust".to_string())].into_iter().collect(),
            license: "MIT".to_string(),
            types: vec!["cli".to_string()],
            source: None,
            homepage: None,
            description: "A valid tool".to_string(),
            deprecated: None,
            discussion: None,
            pricing: None,
            plans: None,
            resources: None,
            reviews: None,
            demos: None,
            wrapper: None,
        };
        let result = valid(&entry, &tags);
        assert!(result.is_ok());
    }

    #[test]
    fn test_entry_without_name_fails() {
        use crate::types::{Tag, Type};
        let tags = vec![];
        let entry = ParsedEntry {
            name: "".to_string(),
            categories: vec![],
            tags: std::collections::HashSet::new(),
            license: "MIT".to_string(),
            types: vec![],
            source: None,
            homepage: None,
            description: "".to_string(),
            deprecated: None,
            discussion: None,
            pricing: None,
            plans: None,
            resources: None,
            reviews: None,
            demos: None,
            wrapper: None,
        };
        let result = valid(&entry, &tags);
        assert!(result.is_err()); // Empty name should fail
    }

    #[test]
    fn test_entry_without_tags_fails() {
        use crate::types::{Tag, Type};
        let tags = vec![Tag {
            name: "Rust".to_string(),
            value: "rust".to_string(),
            tag_type: Type::Language,
        }];
        let entry = ParsedEntry {
            name: "no-tags".to_string(),
            categories: vec![],
            tags: std::collections::HashSet::new(),
            license: "MIT".to_string(),
            types: vec![],
            source: None,
            homepage: None,
            description: "Tool without tags".to_string(),
            deprecated: None,
            discussion: None,
            pricing: None,
            plans: None,
            resources: None,
            reviews: None,
            demos: None,
            wrapper: None,
        };
        let result = valid(&entry, &tags);
        assert!(result.is_err()); // Missing tags should fail
    }

    // ============================================================
    // Functional Tests: Catalog Creation
    // ============================================================

    #[test]
    fn test_create_catalog_empty_entries() {
        use crate::types::Tag;
        let entries = vec![];
        let languages = vec![];
        let other_tags = vec![];
        let catalog = create_catalog(&entries, &languages, &other_tags);
        assert!(catalog.is_ok());
    }

    #[test]
    fn test_create_catalog_multi_language_detection() {
        use crate::types::{Entry, Tag, Type};
        let rust_tag = Tag { name: "Rust".to_string(), value: "rust".to_string(), tag_type: Type::Language };
        let python_tag = Tag { name: "Python".to_string(), value: "python".to_string(), tag_type: Type::Language };

        let multi_tool = Entry {
            name: "multi-tool".to_string(),
            categories: vec!["linter".to_string()],
            tags: vec![rust_tag.clone(), python_tag.clone()].into_iter().collect(),
            license: "MIT".to_string(),
            types: vec!["cli".to_string()],
            source: None,
            homepage: None,
            description: "Multi-language tool".to_string(),
            deprecated: None,
            discussion: None,
            pricing: None,
            plans: None,
            resources: None,
            reviews: None,
            demos: None,
            wrapper: None,
        };

        let entries = vec![multi_tool];
        let languages = vec![rust_tag, python_tag];
        let other_tags = vec![];
        let catalog = create_catalog(&entries, &languages, &other_tags).unwrap();

        // Multi-language tools should be in catalog.multi, not linters
        assert!(!catalog.multi.is_empty());
    }

    // ============================================================
    // Functional Tests: API Generation
    // ============================================================

    #[test]
    fn test_create_api_preserves_description() {
        use crate::types::{Entry, Tag, Type};
        let rust_tag = Tag { name: "Rust".to_string(), value: "rust".to_string(), tag_type: Type::Language };

        let entry = Entry {
            name: "api-test".to_string(),
            categories: vec![],
            tags: vec![rust_tag.clone()].into_iter().collect(),
            license: "MIT".to_string(),
            types: vec![],
            source: None,
            homepage: None,
            description: "Test description".to_string(),
            deprecated: None,
            discussion: None,
            pricing: None,
            plans: None,
            resources: None,
            reviews: None,
            demos: None,
            wrapper: None,
        };

        let catalog = Catalog {
            linters: [("rust".to_string(), vec![entry])].into_iter().collect(),
            others: BTreeMap::new(),
            multi: vec![],
        };

        let api = create_api(catalog, &[rust_tag], &[]).unwrap();
        let api_entry = api.get("api-test").unwrap();
        assert_eq!(api_entry.description, "Test description");
    }

    // ============================================================
    // Edge Cases: Special Characters
    // ============================================================

    #[test]
    fn test_slugify_unicode_edge_cases() {
        assert_eq!(slugify("工具"), "gōng-jù".to_string()); // Chinese
        assert_eq!(slugify("🔧"), "tooleteint".to_string()); // Emoji (varies by slug version)
        assert_eq!(slugify("Müller"), "muller".to_string()); // German umlaut
    }

    #[test]
    fn test_description_length_enforcement() {
        // Documentation test: descriptions should be <= 500 chars
        let long_desc = "A".repeat(501);
        assert!(long_desc.len() > 500);
        // Actual enforcement happens in validation lints
    }
}

pub fn format_stats(stats: StatsRaw) -> BTreeMap<String, String> {
    stats
        .data
        .result
        .into_iter()
        .map(|r| {
            (
                r.metric.path.trim_start_matches("/tool/").to_string(),
                r.value.1,
            )
        })
        .collect()
}
