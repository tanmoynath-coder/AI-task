# Weak Prompt Example

## Prompt

```
@test.js Explain this code.
```

## Output Summary

- **Format**: Single paragraph
- **Depth**: Surface-level explanation
- **Structure**: None

## Code Explanation

The `processOrder` function handles order fulfillment:

1. **Line 2**: Returns early if `order` is null/undefined (guard clause)
2. **Lines 4-5**: If already paid, ships the order
3. **Lines 6-8**: If not paid, charges customer then ships

## Key Observation

**Code smell identified**: `shipOrder(order)` is duplicated in both branches.

## Suggested Refactor

```javascript
function processOrder(order) {
  if (!order) return;

  if (order.paymentStatus !== "paid") {
    chargeCustomer(order);
  }
  shipOrder(order);
}
```

---

**Takeaway**: Basic prompts yield basic explanations. No analysis of edge cases, error handling, or production concerns.
