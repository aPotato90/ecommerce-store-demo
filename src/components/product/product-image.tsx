import { cn } from "@/lib/utils";
import type { Product, VisualKind } from "@/lib/shop/types";

type ShapeProps = { body: string; accent: string };

const SHADE = "rgba(0,0,0,0.14)";
const DEEP = "rgba(0,0,0,0.28)";
const LIGHT = "rgba(255,255,255,0.38)";
const GLOW = "#ffd98a";

/** Line drawings for each product type, on a 400 × 400 canvas. */
const shapes: Record<VisualKind, (props: ShapeProps) => React.ReactNode> = {
  vase: ({ body, accent }) => (
    <>
      <path
        d="M200 98 C196 70 204 52 214 34"
        stroke={accent}
        strokeWidth="4"
        fill="none"
      />
      <path d="M206 62 c14 -18 34 -18 42 -12 c-10 12 -26 18 -42 12z" fill={accent} />
      <path
        d="M201 80 c-14 -14 -30 -12 -38 -6 c10 10 24 12 38 6z"
        fill={accent}
        opacity="0.8"
      />
      <path
        d="M178 92 h44 v8 c0 20 -6 30 -6 46 c0 26 64 52 64 112 c0 46 -30 66 -80 66 c-50 0 -80 -20 -80 -66 c0 -60 64 -86 64 -112 c0 -16 -6 -26 -6 -46z"
        fill={body}
      />
      <path d="M178 92 h44 v8 h-44z" fill={SHADE} />
      <path
        d="M152 236 c6 -24 22 -38 36 -50 c-6 18 -20 40 -22 66 c-2 18 2 34 10 44 c-20 -6 -30 -30 -24 -60z"
        fill={LIGHT}
      />
      <path
        d="M200 324 c50 0 80 -20 80 -66 c0 12 -8 70 -80 70 c-72 0 -80 -58 -80 -70 c0 46 30 66 80 66z"
        fill={SHADE}
      />
    </>
  ),
  throw: ({ body, accent }) => (
    <>
      <rect x="92" y="214" width="216" height="96" rx="16" fill={body} />
      <rect x="92" y="214" width="216" height="96" rx="16" fill={SHADE} />
      <rect x="104" y="150" width="200" height="90" rx="16" fill={body} />
      <rect x="104" y="128" width="192" height="44" rx="14" fill={body} />
      <path d="M104 172 h192" stroke={SHADE} strokeWidth="6" />
      {[120, 160, 200, 240, 280].map((x) => (
        <path
          key={x}
          d={`M${x} 150 v90`}
          stroke={accent}
          strokeWidth="3"
          opacity="0.35"
        />
      ))}
      {[112, 126, 140, 154, 168, 182, 196, 210, 224, 238, 252, 266, 280, 294].map((x) => (
        <path
          key={x}
          d={`M${x} 310 v16`}
          stroke={accent}
          strokeWidth="3"
          strokeLinecap="round"
        />
      ))}
      <rect x="112" y="134" width="120" height="10" rx="5" fill={LIGHT} />
    </>
  ),
  candle: ({ body, accent }) => (
    <>
      <circle cx="200" cy="120" r="46" fill={GLOW} opacity="0.35" />
      <path d="M200 92 c10 14 12 26 0 36 c-12 -10 -10 -22 0 -36z" fill="#f59e3b" />
      <path d="M200 106 c5 7 6 14 0 19 c-6 -5 -5 -12 0 -19z" fill="#ffe7a8" />
      <path d="M200 128 v26" stroke="#3a2a1e" strokeWidth="3" />
      <rect x="132" y="150" width="136" height="176" rx="18" fill={body} />
      <ellipse cx="200" cy="158" rx="62" ry="12" fill={accent} />
      <rect x="152" y="210" width="96" height="70" rx="8" fill={accent} />
      <path
        d="M170 236 h60 M176 252 h48"
        stroke={body}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect x="140" y="170" width="14" height="140" rx="7" fill={LIGHT} />
      <rect x="132" y="300" width="136" height="26" rx="13" fill={SHADE} />
    </>
  ),
  lamp: ({ body, accent }) => (
    <>
      <circle cx="200" cy="190" r="110" fill={GLOW} opacity="0.22" />
      <path d="M110 196 c0 -60 40 -96 90 -96 c50 0 90 36 90 96z" fill={body} />
      <path d="M110 196 h180 v8 h-180z" fill={SHADE} />
      <path d="M128 180 c4 -36 26 -60 56 -68 c-20 18 -32 42 -36 68z" fill={LIGHT} />
      <rect x="192" y="204" width="16" height="96" fill={accent} />
      <ellipse cx="200" cy="308" rx="66" ry="16" fill={body} />
      <ellipse cx="200" cy="314" rx="66" ry="12" fill={SHADE} />
      <ellipse cx="200" cy="198" rx="40" ry="6" fill={GLOW} opacity="0.8" />
    </>
  ),
  pourover: ({ body, accent }) => (
    <>
      <path
        d="M150 108 h100 l-24 62 h-52z"
        fill={accent}
        stroke={SHADE}
        strokeWidth="2"
      />
      <rect
        x="140"
        y="98"
        width="120"
        height="14"
        rx="7"
        fill={accent}
        stroke={SHADE}
        strokeWidth="2"
      />
      <path
        d="M164 176 h72 c0 20 40 44 40 92 c0 40 -24 58 -76 58 c-52 0 -76 -18 -76 -58 c0 -48 40 -72 40 -92z"
        fill={accent}
        opacity="0.75"
        stroke={SHADE}
        strokeWidth="2"
      />
      <path
        d="M128 262 c10 -6 134 -6 144 0 c2 38 -20 60 -72 60 c-52 0 -74 -22 -72 -60z"
        fill={body}
        opacity="0.9"
      />
      <rect x="160" y="170" width="80" height="22" rx="6" fill={body} />
      <rect x="160" y="170" width="80" height="22" rx="6" fill={SHADE} />
      <path
        d="M140 230 c4 -16 12 -26 22 -34"
        stroke={LIGHT}
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
    </>
  ),
  mug: ({ body, accent }) => (
    <>
      <g transform="translate(64 -10)">
        <path d="M236 180 c30 0 30 56 0 56" stroke={body} strokeWidth="14" fill="none" />
        <path
          d="M150 160 h90 v104 c0 22 -14 34 -45 34 c-31 0 -45 -12 -45 -34z"
          fill={body}
        />
        <path
          d="M150 160 h90 v104 c0 22 -14 34 -45 34 c-31 0 -45 -12 -45 -34z"
          fill={SHADE}
        />
      </g>
      <path d="M232 196 c36 0 36 70 0 70" stroke={body} strokeWidth="16" fill="none" />
      <path
        d="M122 178 h112 v116 c0 26 -18 40 -56 40 c-38 0 -56 -14 -56 -40z"
        fill={body}
      />
      <ellipse cx="178" cy="178" rx="56" ry="10" fill={SHADE} />
      {[
        [140, 220],
        [166, 248],
        [204, 214],
        [190, 290],
        [150, 300],
        [214, 262],
        [176, 204],
      ].map(([cx, cy]) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r="2.6"
          fill={accent}
          opacity="0.55"
        />
      ))}
      <rect x="132" y="196" width="10" height="100" rx="5" fill={LIGHT} />
    </>
  ),
  board: ({ body, accent }) => (
    <>
      <rect x="84" y="174" width="232" height="140" rx="22" fill={body} />
      <rect x="84" y="290" width="232" height="24" rx="12" fill={DEEP} />
      <rect x="84" y="160" width="232" height="140" rx="22" fill={body} />
      {[124, 164, 204, 244, 284].map((x) => (
        <path
          key={x}
          d={`M${x} 166 v128`}
          stroke={accent}
          strokeWidth="2"
          opacity="0.3"
        />
      ))}
      {[196, 230, 264].map((y) => (
        <path key={y} d={`M90 ${y} h220`} stroke={accent} strokeWidth="2" opacity="0.3" />
      ))}
      <rect
        x="98"
        y="174"
        width="204"
        height="112"
        rx="14"
        fill="none"
        stroke={accent}
        strokeWidth="3"
        opacity="0.5"
      />
      <rect x="96" y="168" width="90" height="8" rx="4" fill={LIGHT} />
    </>
  ),
  kettle: ({ body, accent }) => (
    <>
      <path
        d="M150 168 c0 -50 100 -50 100 0"
        stroke={accent}
        strokeWidth="14"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M132 312 c-6 -70 10 -130 68 -130 c58 0 74 60 68 130z" fill={body} />
      <path
        d="M262 262 c30 -10 40 -46 62 -70"
        stroke={body}
        strokeWidth="12"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="200" cy="184" rx="40" ry="9" fill={SHADE} />
      <circle cx="200" cy="170" r="9" fill={accent} />
      <rect x="128" y="306" width="144" height="14" rx="7" fill={DEEP} />
      <path
        d="M152 286 c-4 -40 4 -72 26 -88"
        stroke={LIGHT}
        strokeWidth="10"
        fill="none"
        strokeLinecap="round"
      />
    </>
  ),
  notebook: ({ body, accent }) => (
    <>
      <g transform="rotate(-10 200 230)">
        <rect x="120" y="120" width="140" height="196" rx="8" fill={body} />
        <rect x="120" y="120" width="140" height="196" rx="8" fill={DEEP} />
      </g>
      <g transform="rotate(-3 200 230)">
        <rect x="130" y="116" width="140" height="196" rx="8" fill={body} />
        <rect x="130" y="116" width="140" height="196" rx="8" fill={SHADE} />
      </g>
      <g transform="rotate(5 200 230)">
        <rect x="140" y="112" width="140" height="196" rx="8" fill={body} />
        <path d="M152 112 v196" stroke={SHADE} strokeWidth="3" strokeDasharray="6 6" />
        <rect x="174" y="150" width="86" height="40" rx="4" fill={accent} />
        <path
          d="M184 164 h56 M184 176 h40"
          stroke={body}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
    </>
  ),
  riser: ({ body, accent }) => (
    <>
      <rect x="120" y="96" width="160" height="100" rx="8" fill={accent} />
      <rect x="128" y="104" width="144" height="84" rx="4" fill="#3b4a5a" />
      <path
        d="M140 170 l40 -40 l30 30 l20 -20 l34 30"
        stroke="#6f8aa3"
        strokeWidth="4"
        fill="none"
      />
      <rect x="190" y="196" width="20" height="18" fill={accent} />
      <rect x="160" y="212" width="80" height="8" rx="4" fill={accent} />
      <rect x="70" y="220" width="260" height="22" rx="6" fill={body} />
      <rect x="70" y="236" width="260" height="6" rx="3" fill={SHADE} />
      <rect x="84" y="242" width="10" height="60" fill={accent} />
      <rect x="306" y="242" width="10" height="60" fill={accent} />
      <rect x="120" y="282" width="140" height="18" rx="4" fill="#d7d2c8" />
      <rect x="78" y="224" width="120" height="5" rx="2.5" fill={LIGHT} />
      <rect x="40" y="302" width="320" height="6" rx="3" fill={SHADE} />
    </>
  ),
  mat: ({ body, accent }) => (
    <>
      <path d="M60 300 l40 -120 h200 l40 120z" fill={accent} />
      <path d="M66 294 l38 -108 h192 l38 108z" fill={body} />
      <path d="M124 270 l18 -60 h104 l14 60z" fill="#ebe7e0" />
      {[226, 240, 254].map((y) => (
        <path
          key={y}
          d={`M${140 - (y - 226) / 4} ${y} h${108 + (y - 226) / 2}`}
          stroke="#bdb6aa"
          strokeWidth="5"
          strokeDasharray="10 4"
        />
      ))}
      <ellipse cx="294" cy="246" rx="16" ry="24" fill="#ebe7e0" />
      <path d="M294 226 v14" stroke="#bdb6aa" strokeWidth="2" />
      <path d="M66 294 h268" stroke={SHADE} strokeWidth="6" />
    </>
  ),
  clock: ({ body, accent }) => (
    <>
      <rect x="110" y="104" width="180" height="200" rx="28" fill={body} />
      <rect x="110" y="284" width="180" height="20" rx="10" fill={SHADE} />
      <circle cx="200" cy="196" r="70" fill="#fbfaf7" />
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i * Math.PI) / 6;
        const r1 = i % 3 === 0 ? 52 : 58;
        return (
          <path
            key={i}
            d={`M${200 + r1 * Math.sin(angle)} ${196 - r1 * Math.cos(angle)} L${200 + 64 * Math.sin(angle)} ${196 - 64 * Math.cos(angle)}`}
            stroke={accent}
            strokeWidth={i % 3 === 0 ? 4 : 2}
            strokeLinecap="round"
          />
        );
      })}
      <path d="M200 196 L200 150" stroke={accent} strokeWidth="6" strokeLinecap="round" />
      <path d="M200 196 L236 210" stroke={accent} strokeWidth="5" strokeLinecap="round" />
      <path
        d="M200 196 L170 246"
        stroke="#c0522e"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="200" cy="196" r="6" fill={accent} />
      <rect x="122" y="118" width="12" height="150" rx="6" fill={LIGHT} />
    </>
  ),
  bottle: ({ body, accent }) => (
    <>
      <circle cx="200" cy="96" r="18" fill="none" stroke={accent} strokeWidth="8" />
      <rect x="170" y="100" width="60" height="40" rx="10" fill={accent} />
      <rect x="176" y="136" width="48" height="14" fill={DEEP} />
      <path
        d="M160 176 c0 -20 16 -30 40 -30 c24 0 40 10 40 30 v140 c0 14 -10 22 -24 22 h-32 c-14 0 -24 -8 -24 -22z"
        fill={body}
      />
      <path
        d="M160 176 c0 -20 16 -30 40 -30 c24 0 40 10 40 30 v140 c0 14 -10 22 -24 22 h-32 c-14 0 -24 -8 -24 -22z"
        fill="none"
        stroke={SHADE}
        strokeWidth="2"
      />
      <rect x="170" y="178" width="12" height="140" rx="6" fill={LIGHT} />
      <rect x="160" y="300" width="80" height="38" rx="0" fill={SHADE} />
    </>
  ),
  backpack: ({ body, accent }) => (
    <>
      <path
        d="M170 108 c0 -26 60 -26 60 0"
        stroke={accent}
        strokeWidth="10"
        fill="none"
      />
      <path
        d="M128 150 c0 -32 24 -46 72 -46 c48 0 72 14 72 46 v150 c0 18 -12 28 -30 28 h-84 c-18 0 -30 -10 -30 -28z"
        fill={body}
      />
      <path d="M128 150 c0 -32 24 -46 72 -46 c48 0 72 14 72 46 v26 h-144z" fill={SHADE} />
      <rect
        x="150"
        y="226"
        width="100"
        height="78"
        rx="14"
        fill={body}
        stroke={DEEP}
        strokeWidth="3"
      />
      <path d="M150 246 h100" stroke={DEEP} strokeWidth="3" />
      <rect x="168" y="170" width="12" height="70" rx="4" fill={accent} />
      <rect x="220" y="170" width="12" height="70" rx="4" fill={accent} />
      <rect x="164" y="206" width="20" height="14" rx="3" fill="#c9b48a" />
      <rect x="216" y="206" width="20" height="14" rx="3" fill="#c9b48a" />
      <rect x="138" y="140" width="10" height="150" rx="5" fill={LIGHT} />
    </>
  ),
  lantern: ({ body, accent }) => (
    <>
      <circle cx="200" cy="220" r="96" fill={accent} opacity="0.25" />
      <path d="M160 116 c0 -40 80 -40 80 0" stroke={body} strokeWidth="8" fill="none" />
      <path d="M152 140 h96 l14 26 h-124z" fill={body} />
      <rect x="146" y="166" width="108" height="12" rx="4" fill={body} />
      <rect x="146" y="166" width="108" height="12" rx="4" fill={SHADE} />
      <rect x="156" y="178" width="88" height="110" rx="10" fill={accent} opacity="0.9" />
      <rect x="196" y="190" width="8" height="86" rx="4" fill="#fff4d2" />
      {[170, 230].map((x) => (
        <rect key={x} x={x - 3} y="178" width="6" height="110" fill={body} />
      ))}
      <rect x="140" y="288" width="120" height="30" rx="8" fill={body} />
      <rect x="140" y="306" width="120" height="12" rx="6" fill={SHADE} />
    </>
  ),
  stool: ({ body, accent }) => (
    <>
      <path
        d="M130 318 L250 150 M270 318 L150 150 M200 330 L200 156"
        stroke={body}
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d="M130 318 L250 150 M270 318 L150 150"
        stroke={SHADE}
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d="M128 152 c24 18 120 18 144 0 l-12 -22 c-30 10 -90 10 -120 0z"
        fill={accent}
      />
      <path d="M128 152 c24 18 120 18 144 0" stroke={DEEP} strokeWidth="3" fill="none" />
      <path
        d="M144 136 c26 8 82 8 110 0"
        stroke={LIGHT}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
    </>
  ),
};

type ProductImageProps = {
  product: Pick<Product, "visual">;
  /** Selected variant id; colour variants tint the illustration. */
  variantId?: string | null;
  variants?: Product["variants"];
  /** Accessible description. Pass "" when the image is decorative (e.g. next to the name). */
  alt: string;
  className?: string;
};

/**
 * Illustrated product visual drawn in SVG: no photos, no external requests, no licensing
 * questions. Background is a CSS gradient so the SVG needs no `id` references.
 */
export function ProductImage({
  product,
  variantId,
  variants,
  alt,
  className,
}: ProductImageProps) {
  const { kind, background, body, accent } = product.visual;
  const swatch =
    variants?.kind === "colour"
      ? variants.options.find((option) => option.id === variantId)?.swatch
      : undefined;
  const Shape = shapes[kind];

  return (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden dark:brightness-[0.92]",
        className,
      )}
      style={{
        backgroundImage: `radial-gradient(circle at 28% 18%, rgba(255,255,255,0.6), transparent 55%), linear-gradient(140deg, ${background[0]}, ${background[1]})`,
      }}
    >
      <svg
        viewBox="0 0 400 400"
        className="absolute inset-0 size-full"
        {...(alt ? { role: "img", "aria-label": alt } : { "aria-hidden": true })}
        focusable="false"
      >
        <ellipse cx="200" cy="338" rx="120" ry="14" fill="rgba(0,0,0,0.1)" />
        <Shape body={swatch ?? body} accent={accent} />
      </svg>
    </div>
  );
}
