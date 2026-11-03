import type { Metadata, Viewport } from "next";
import { Figtree, IBM_Plex_Mono, Instrument_Serif } from "next/font/google";
import { AuthProvider } from "@/components/auth";
import { TopBar } from "@/components/top-bar";
import "./globals.css";

const display = Instrument_Serif({ variable: "--ff-display", weight: "400", style: ["normal", "italic"], subsets: ["latin"] });
const body = Figtree({ variable: "--ff-body", subsets: ["latin"] });
const mono = IBM_Plex_Mono({ variable: "--ff-mono", weight: ["400", "500"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Bottega", template: "%s · Bottega" },
  description: "Everyone gets one room. Fill it with your taste and step into your friends'.",
  applicationName: "Bottega",
  appleWebApp: { capable: true, title: "Bottega", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E9ECE5" },
    { media: "(prefers-color-scheme: dark)", color: "#111512" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <AuthProvider>
          <div className="wrap">
            <TopBar />
            <main>{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
