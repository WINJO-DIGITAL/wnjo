import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Playfair_Display } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Reveal } from "@/components/interactive/Reveal";
import { StickyCta } from "@/components/StickyCta";
import { site, siteUrl } from "@/lib/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
/** The one serif: headings, italic accents and statements. */
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  style: ["normal", "italic"],
});

const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

const url = siteUrl();

export const metadata: Metadata = {
  ...(url && { metadataBase: new URL(url) }),
  title: {
    default: `${site.name} | Websites, apps and booking software`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: site.locale,
    title: `${site.name} | Websites, apps and booking software`,
    description: site.description,
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: site.themeColor,
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" data-scroll-behavior="smooth" className={`${inter.variable} ${playfair.variable} ${mono.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Header />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <Footer />
        <Reveal />
        <StickyCta />
      </body>
    </html>
  );
}
