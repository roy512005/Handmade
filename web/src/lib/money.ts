/** All money is integer paise. Never use floats for amounts. */
export type Paise = number;

export function rupeesToPaise(rupees: string | number): Paise {
  const [whole, frac = ""] = String(rupees).split(".");
  return Number(whole) * 100 + Number((frac + "00").slice(0, 2));
}

export function formatINR(paise: Paise): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
  }).format(rupees);
}

/** Commission in paise for a rate in basis points (1200 = 12%), rounded half-up. */
export function commissionPaise(amount: Paise, rateBps: number): Paise {
  return Math.round((amount * rateBps) / 10_000);
}

export function discountPercent(price: Paise, original: Paise): number {
  return original > price ? Math.round(((original - price) / original) * 100) : 0;
}

/** Parse a user-entered rupee amount ("1,299.50") into paise; null if invalid. */
export function parseRupees(input: string): Paise | null {
  const s = input.replace(/[,\s₹]/g, "");
  return /^\d+(\.\d{1,2})?$/.test(s) ? rupeesToPaise(s) : null;
}
