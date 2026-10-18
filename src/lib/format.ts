const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** Formats integer cents as US dollars, e.g. 4200 -> "$42.00". */
export function formatPrice(cents: number): string {
  return currency.format(cents / 100);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
