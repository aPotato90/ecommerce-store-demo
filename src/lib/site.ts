export const siteConfig = {
  name: "Kestrel & Co.",
  shortName: "Kestrel",
  description:
    "Kestrel & Co. is a fictional homeware and outdoor goods shop: a portfolio demo of a full-stack Next.js storefront with Stripe test-mode checkout.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  portfolioUrl: process.env.NEXT_PUBLIC_PORTFOLIO_URL || "https://example.com",
  author: "Emmanuel Kelvin",
  supportEmail: "hello@example.com",
  disclaimer: "Demo store. No real orders. Stripe test mode.",
};

export const mainNav = [
  { href: "/shop", label: "Shop all" },
  { href: "/shop?category=home", label: "Home" },
  { href: "/shop?category=kitchen", label: "Kitchen" },
  { href: "/shop?category=desk", label: "Desk" },
  { href: "/shop?category=outdoor", label: "Outdoor" },
] as const;
