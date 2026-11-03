import { Archivo, Jost } from "next/font/google";

/*
 * The typefaces of booking flows we've built, used only where those flows are shown
 * (the booking replay and the Make it yours configurator): EV Exec's, and Alex K Bells'
 * for the bold look. Not preloaded, so they never compete with the hero for bandwidth.
 * Each section that needs one adds its variable class.
 */
export const jost = Jost({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-jost",
  display: "swap",
  preload: false,
});
export const archivo = Archivo({
  subsets: ["latin"],
  weight: ["600", "800"],
  variable: "--font-archivo",
  display: "swap",
  preload: false,
});
