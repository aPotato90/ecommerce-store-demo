export const CATEGORIES = ["home", "kitchen", "desk", "outdoor"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  home: "Home",
  kitchen: "Kitchen",
  desk: "Desk",
  outdoor: "Outdoor",
};

export const CATEGORY_BLURBS: Record<Category, string> = {
  home: "Soft light, calm textures and pieces that age well.",
  kitchen: "Hard-working tools for slow mornings and long dinners.",
  desk: "A tidier, quieter place to do your best work.",
  outdoor: "Durable gear for trailheads, parks and back gardens.",
};

/** Shapes the `ProductImage` component knows how to draw. */
export const VISUAL_KINDS = [
  "vase",
  "throw",
  "candle",
  "lamp",
  "pourover",
  "mug",
  "board",
  "kettle",
  "notebook",
  "riser",
  "mat",
  "clock",
  "bottle",
  "backpack",
  "lantern",
  "stool",
] as const;
export type VisualKind = (typeof VISUAL_KINDS)[number];

export type VariantOption = {
  id: string;
  label: string;
  /** Hex colour used for the swatch and to tint the generated product visual. */
  swatch?: string;
};

export type ProductVariants = {
  kind: "colour" | "size";
  options: VariantOption[];
};

export type ProductVisual = {
  kind: VisualKind;
  /** Two-stop background gradient. */
  background: [string, string];
  /** Main body colour when no colour variant is selected. */
  body: string;
  accent: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  /** One-line summary for cards and metadata. */
  tagline: string;
  description: string;
  details: string[];
  /** Unit price in cents (USD). */
  price: number;
  category: Category;
  tags: string[];
  /** Average rating from 1 to 5, one decimal place. */
  rating: number;
  reviewCount: number;
  stock: number;
  featured: boolean;
  variants?: ProductVariants;
  visual: ProductVisual;
};
