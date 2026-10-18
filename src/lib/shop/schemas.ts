import { z } from "zod";

import { CATEGORIES, VISUAL_KINDS } from "./types";

/** Most of any single line a shopper can add, even when stock is higher. */
export const MAX_QUANTITY_PER_LINE = 10;
/** Upper bound on distinct cart lines (matches the order item limit in firestore.rules). */
export const MAX_CART_LINES = 6;

const hexColour = z.string().regex(/^#[0-9a-f]{6}$/i, "Expected a #rrggbb colour");
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Expected a kebab-case slug");

export const variantOptionSchema = z.object({
  id: slug,
  label: z.string().min(1).max(40),
  swatch: hexColour.optional(),
});

export const productSchema = z.object({
  id: z.string().regex(/^prd_[a-z0-9_]+$/),
  slug,
  name: z.string().min(1).max(80),
  tagline: z.string().min(1).max(120),
  description: z.string().min(1).max(1000),
  details: z.array(z.string().min(1).max(120)).max(8),
  price: z.number().int().positive(),
  category: z.enum(CATEGORIES),
  tags: z.array(z.string().min(1).max(30)).max(8),
  rating: z.number().min(1).max(5),
  reviewCount: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative(),
  featured: z.boolean(),
  variants: z
    .object({
      kind: z.enum(["colour", "size"]),
      options: z.array(variantOptionSchema).length(3),
    })
    .optional(),
  visual: z.object({
    kind: z.enum(VISUAL_KINDS),
    background: z.tuple([hexColour, hexColour]),
    body: hexColour,
    accent: hexColour,
  }),
});

export const catalogueSchema = z.array(productSchema);

/**
 * A cart line as stored in the browser. It only carries identifiers and a quantity:
 * names and prices are always looked up from the catalogue, never trusted from storage.
 */
export const cartItemSchema = z.object({
  productId: z.string().min(1).max(64),
  variantId: z.string().min(1).max(64).nullable(),
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE),
});

export const storedCartSchema = z.object({
  version: z.literal(1),
  items: z.array(cartItemSchema).max(MAX_CART_LINES),
});

export type CartItem = z.infer<typeof cartItemSchema>;
export type StoredCart = z.infer<typeof storedCartSchema>;

/** Input to `priceCart`: one line with a server-resolved unit price. */
export const priceLineInputSchema = z.object({
  unitPrice: z.number().int().nonnegative(),
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE),
});
