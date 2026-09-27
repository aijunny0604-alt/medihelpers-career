// Display the stored ledger only. Missing or inconsistent tax data is not zero VAT.
export function paymentAmounts(payment) {
  const read = value => value !== null && value !== undefined && value !== '' &&
    ['number', 'string'].includes(typeof value) && Number.isSafeInteger(Number(value)) && Number(value) >= 0 ? Number(value) : null;
  const total = read(payment.totalAmount);
  const supply = read(payment.supplyAmount);
  const tax = read(payment.taxAmount);
  return {total, supply:total !== null && supply !== null && tax !== null && supply + tax === total ? supply : null,
    tax:total !== null && supply !== null && tax !== null && supply + tax === total ? tax : null};
}
