import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Providers } from "@/components/providers";
import { BusinessProvider } from "@/components/business-provider";
import { getBusiness } from "@/lib/business";
import { site } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Serif italic for warm, human accents (hero line, moments strip).
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Chauffeur-driven van & SUV hire in Ghana`,
    template: `%s | ${site.shortName}`,
  },
  description: site.description,
  // Home-screen app on iPhone (Android uses app/manifest.ts).
  appleWebApp: { capable: true, title: site.shortName, statusBarStyle: "default" },
  openGraph: {
    type: "website",
    locale: "en_GH",
    siteName: site.name,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const business = await getBusiness();
  return (
    <html
      lang="en-GH"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <BusinessProvider value={business}>
          <Providers>{children}</Providers>
        </BusinessProvider>
      </body>
    </html>
  );
}
