import { z } from "zod";

import { cartItemSchema, MAX_CART_LINES } from "@/lib/shop/schemas";

export const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT Abuja",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
] as const;

/** Strips spaces, dashes, dots and brackets so "0803 000-0000" and "08030000000" match. */
export function normalizePhone(value: string): string {
  return value.replace(/[\s\-().]/g, "");
}

/** Nigerian mobile number: 0XXXXXXXXXX or +234XXXXXXXXXX. */
export const NIGERIAN_PHONE = /^(?:\+234|0)[789][01]\d{8}$/;

/** Delivery and contact details. Everything entered here is fake demo data. */
export const customerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "Email is too long.")
    .pipe(z.email("Enter a valid email address, e.g. you@example.com.")),
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(80, "Use 80 characters or fewer."),
  phone: z
    .string()
    .transform(normalizePhone)
    .pipe(
      z
        .string()
        .regex(NIGERIAN_PHONE, "Enter a Nigerian mobile number, e.g. 0803 000 0000."),
    ),
  addressLine1: z
    .string()
    .trim()
    .min(3, "Enter a street address.")
    .max(120, "Use 120 characters or fewer."),
  addressLine2: z.string().trim().max(120, "Use 120 characters or fewer."),
  city: z
    .string()
    .trim()
    .min(2, "Enter a city or town.")
    .max(60, "Use 60 characters or fewer."),
  state: z.enum(NIGERIAN_STATES, "Choose a state."),
});

export type CustomerInput = z.input<typeof customerSchema>;
export type Customer = z.output<typeof customerSchema>;

/**
 * What the browser may send to start a checkout: identifiers and quantities only. Names and
 * prices are looked up on the server; anything else in the payload is stripped.
 */
export const checkoutRequestSchema = z.object({
  items: z.array(cartItemSchema).min(1, "Your cart is empty.").max(MAX_CART_LINES),
  customer: customerSchema,
});

export type CheckoutRequest = z.input<typeof checkoutRequestSchema>;

/** One line of the cart as stored in Paystack metadata (compact keys keep it small). */
export const metadataLineSchema = z.object({
  p: z.string().min(1).max(64),
  v: z.string().min(1).max(64).nullable(),
  q: z.number().int().min(1),
});

/** The metadata we attach to a Paystack transaction and read back on verification. */
export const checkoutMetadataSchema = z.object({
  app: z.literal("kestrel-demo"),
  cart: z.array(metadataLineSchema).min(1).max(MAX_CART_LINES),
  customer: z.object({
    fullName: z.string().min(1).max(80),
    phone: z.string().min(1).max(20),
    address: z.string().min(1).max(300),
  }),
});

export type CheckoutMetadata = z.infer<typeof checkoutMetadataSchema>;

export function formatAddress(customer: Customer): string {
  return [customer.addressLine1, customer.addressLine2, customer.city, customer.state]
    .filter(Boolean)
    .join(", ");
}
