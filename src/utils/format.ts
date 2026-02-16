export function formatCurrencyEUR(amount: number): string {
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
  } catch {
    return `${amount.toFixed(0)} €`;
  }
}
