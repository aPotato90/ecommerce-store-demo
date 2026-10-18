/** "kc-0123…cdef" style short form of a Paystack reference for headings and lists. */
export function shortReference(reference: string): string {
  return reference.length > 14
    ? `${reference.slice(0, 7)}…${reference.slice(-4)}`
    : reference;
}
