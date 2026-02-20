import { formatMoney } from "../localization/money";

export { formatMoney };

// Backward-compatible alias while migrating call sites.
export function formatCurrencyEUR(amount: number): string {
  return formatMoney(amount);
}

