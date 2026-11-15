import { Barlow_Condensed, Inter, Nunito, Playfair_Display } from "next/font/google";

/**
 * The typefaces for customers' websites, one pairing per look. Next.js downloads them when the site is built and serves
 * them from our own address, so a visitor's browser never contacts Google. Each font is described by a CSS variable;
 * the site's stylesheet picks the one its look uses and falls back to the device's own fonts where the variable isn't
 * set (the staff screens, the tests). The browser downloads a font only when text actually uses it, so a site loads
 * the one or two it needs, not all four.
 *
 * Classic: Playfair Display headings. Warm: Nunito throughout. Bold: Barlow Condensed headings, in capitals.
 * Minimal: Inter. Inter is also the body text of classic and bold.
 */
const body = Inter({ subsets: ["latin"], variable: "--tpl-font-body", display: "swap" });
const classic = Playfair_Display({ subsets: ["latin"], variable: "--tpl-font-classic", display: "swap", preload: false });
const warm = Nunito({ subsets: ["latin"], variable: "--tpl-font-warm", display: "swap", preload: false });
const bold = Barlow_Condensed({ subsets: ["latin"], variable: "--tpl-font-bold", weight: ["600", "700", "800"], display: "swap", preload: false });

/** Put this on an element around a site, and the site's stylesheet can use the fonts. */
export const siteFontClasses = [body, classic, warm, bold].map((f) => f.variable).join(" ");
