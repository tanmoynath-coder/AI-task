# Prompt Engineering - Evolution Analysis

## Comparative Summary

| Prompt Version | Output Quality | Key Difference |
|----------------|----------------|----------------|
| **V1**: "Explain this code." | Basic understanding | Single paragraph. Identifies duplication. No structure. |
| **V2**: "Explain what this code does. Identify issues and suggest improvements." | Intermediate analysis | Structured sections. Refactored code. Surface-level. |
| **V3**: Senior engineer persona + 8 sections + constraints | Production-grade review | Deep analysis: idempotency, concurrency, security, transactions, rollback, audit logging. |

---

## What Drove the Improvement

| Factor | V1 → V2 | V2 → V3 |
|--------|---------|---------|
| **Specificity** | Added "issues + improvements" | Added 8 explicit sections |
| **Persona** | None | "Senior backend engineer" |
| **Constraints** | None | "Be precise. Do not give generic advice" |
| **Structure** | Free-form | Mandatory section headers |
| **Depth signals** | None | "Edge cases", "idempotency", "failure handling" |

---

## Key Takeaway

### Prompt Specificity ∝ Output Depth

The V3 prompt works because it:

1. **Sets expertise level** - "senior backend engineer"
2. **Defines exact output structure** - 8 mandatory sections
3. **Names specific concerns** - idempotency, concurrency, security
4. **Constrains vagueness** - "Do not give generic advice"
5. **Requires actionable deliverables** - refactored production code

---

## Prompt Hierarchy (Best → Worst)

```
1. Persona + Structured Sections + Constraints + Domain-Specific Terms
2. Explicit Task + Structure Request
3. Generic Request (no structure, no constraints)
```

---

## Reusable Template

```
You are a [ROLE] performing [TASK].

Analyze the following in detail.

Provide output in these sections:

1. [Section 1] - [Specific guidance]
2. [Section 2] - [Specific guidance]
3. [Section 3] - [Specific guidance]
...

Be precise. Do not give generic advice.
```
