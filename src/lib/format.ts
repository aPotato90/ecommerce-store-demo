const currency = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" });

/** Formats integer kobo as Nigerian naira, e.g. 1_850_000 -> "₦18,500.00". */
export function formatPrice(kobo: number): string {
  return currency.format(kobo / 100);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
