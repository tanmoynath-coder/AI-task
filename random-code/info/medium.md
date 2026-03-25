# Medium Prompt Example

## Prompt

```
@test.js Explain what this code does.
Identify any issues and suggest improvements.
```

## Output Summary

- **Format**: Structured sections
- **Depth**: Intermediate analysis
- **Structure**: Explanation → Issues → Improvements

## Code Explanation

The `processOrder` function handles order fulfillment:

1. **Guard clause**: Exits early if `order` is falsy
2. **Payment check**: If already paid, just ship the order
3. **Payment + ship**: If not paid, charge customer then ship

## Issues Identified

| Issue | Description |
|-------|-------------|
| Code Duplication | `shipOrder()` called in both branches (violates DRY) |
| Missing Error Handling | No try/catch around `chargeCustomer` or `shipOrder` |
| Implicit Return Value | Function returns `undefined` in all cases |
| No Logging | No visibility into processing outcome |

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

- ✅ Removed duplication - `shipOrder` called once
- ✅ Explicit error for missing order
- ✅ Error handling with logging
- ✅ Returns processed order for chaining
- ✅ Clearer condition (`!== "paid"` instead of `=== "paid"` with else)

---

**Takeaway**: Adding "identify issues + suggest improvements" yields structured, actionable output. Still surface-level on production concerns.
