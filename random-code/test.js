function processOrder(order) {
  if (!order) return;

  if (order.paymentStatus === "paid") {
    shipOrder(order);
  } else {
    chargeCustomer(order);
    shipOrder(order);
  }
}