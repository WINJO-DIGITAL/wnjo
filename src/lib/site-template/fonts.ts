import { Archivo, Barlow_Condensed, Cormorant_Garamond, DM_Sans, Figtree, Hanken_Grotesk, Inter, Jost, Manrope, Nunito, Playfair_Display, Young_Serif } from "next/font/google";

/**
 * The typefaces for customers' websites. Next.js downloads them when the site is built and serves them from our own
 * address, so a visitor's browser never contacts Google. Each font is a CSS variable; the site's stylesheet picks the
 * ones its style uses and falls back to the device's own fonts where a variable isn't set (the staff screens, the
 * tests). A browser downloads a font only when text actually uses it, so a site loads the one or two it needs.
 *
 * Athletic: Archivo, wide and heavy. Precision: Manrope headings, DM Sans text. Boutique: Young Serif headings, Hanken
 * Grotesk text. Executive: Jost. Hearth: Playfair Display, Inter text. Heritage: Cormorant Garamond, Inter text.
 * Tradesman: Archivo. Clinic: Figtree. The four older looks keep theirs (Inter, Playfair, Nunito, Barlow Condensed).
 */
const body = Inter({ subsets: ["latin"], variable: "--tpl-font-body", display: "swap" });
const classic = Playfair_Display({ subsets: ["latin"], variable: "--tpl-font-classic", display: "swap", preload: false });
const warm = Nunito({ subsets: ["latin"], variable: "--tpl-font-warm", display: "swap", preload: false });
const bold = Barlow_Condensed({ subsets: ["latin"], variable: "--tpl-font-bold", weight: ["600", "700", "800"], display: "swap", preload: false });

const archivo = Archivo({ subsets: ["latin"], variable: "--tpl-font-archivo", axes: ["wdth"], display: "swap", preload: false });
const manrope = Manrope({ subsets: ["latin"], variable: "--tpl-font-manrope", display: "swap", preload: false });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--tpl-font-dmsans", display: "swap", preload: false });
const youngSerif = Young_Serif({ subsets: ["latin"], variable: "--tpl-font-youngserif", weight: "400", display: "swap", preload: false });
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--tpl-font-hanken", display: "swap", preload: false });
const jost = Jost({ subsets: ["latin"], variable: "--tpl-font-jost", display: "swap", preload: false });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], variable: "--tpl-font-cormorant", weight: ["500", "600", "700"], display: "swap", preload: false });
const figtree = Figtree({ subsets: ["latin"], variable: "--tpl-font-figtree", display: "swap", preload: false });

/** Put this on an element around a site, and the site's stylesheet can use the fonts. */
export const siteFontClasses = [body, classic, warm, bold, archivo, manrope, dmSans, youngSerif, hanken, jost, cormorant, figtree].map((f) => f.variable).join(" ");
