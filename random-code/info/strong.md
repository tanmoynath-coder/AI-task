# Strong Prompt Example

## Prompt

```
@test.js Explain what this code does.
Identify any issues and suggest improvements.
```

## Output Summary

- **Format**: Structured sections with tables
- **Depth**: Intermediate → Advanced analysis
- **Structure**: Explanation → Issues → Improvements → Refactored Code

## Code Explanation

The `processOrder` function handles order fulfillment:

| Step | Behavior |
|------|----------|
| 1. Guard clause | Exits early if `order` is falsy |
| 2. Payment check | If `paymentStatus === "paid"`, ship only |
| 3. Else branch | Charge customer, then ship |

## Issues Identified

| Issue | Severity | Description |
|-------|----------|-------------|
| Code Duplication | Medium | `shipOrder()` called in both branches |
| Missing Error Handling | High | No try/catch; failures leave order in unknown state |
| Implicit Return Value | Medium | Returns `undefined` - no success indication |
| No Logging | Low | No audit trail |
| Magic String | Low | `"paid"` should be a constant |

## Improved Version

```javascript
function processOrder(order) {
  if (!order) {
    throw new Error("Order is required");
  }

  try {
    if (order.paymentStatus !== "paid") {
      chargeCustomer(order);
    }
    shipOrder(order);

    return { ...order, processed: true };
  } catch (error) {
    console.error(`Failed to process order ${order.id}:`, error);
    throw error;
  }
}
```

## Improvements Checklist

- ✅ Removed duplication
- ✅ Explicit validation error
- ✅ Try/catch with logging
- ✅ Return value for chaining
- ✅ Clearer boolean logic

---

**Takeaway**: Explicit requests for "issues + improvements" trigger structured refactoring suggestions. Still lacks deep production analysis.
