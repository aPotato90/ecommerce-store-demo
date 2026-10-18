/** "kc-0123…cdef" style short form of a Paystack reference for headings and lists. */
export function shortReference(reference: string): string {
  return reference.length > 14
    ? `${reference.slice(0, 7)}…${reference.slice(-4)}`
    : reference;
}

/** "08030000000" → "0803 000 0000"; "+2348030000000" → "+234 803 000 0000". */
export function formatPhone(phone: string): string {
  const local = phone.match(/^0(\d{3})(\d{3})(\d{4})$/);
  if (local) return `0${local[1]} ${local[2]} ${local[3]}`;
  const intl = phone.match(/^\+234(\d{3})(\d{3})(\d{4})$/);
  if (intl) return `+234 ${intl[1]} ${intl[2]} ${intl[3]}`;
  return phone;
}
