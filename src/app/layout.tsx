import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Fraunces } from "next/font/google";
import { AuthProvider } from "@/components/auth";
import { NativeLinks } from "@/components/native-links";
import { PushSetup } from "@/components/push-setup";
import { TabBar } from "@/components/tab-bar";
import { TopBar } from "@/components/top-bar";
import "./globals.css";

// One family for everything: Fraunces, with its "soft" axis rounding the letters and the "wonky" axis
// adding a hand-made quirk to big headlines. Optical sizing adjusts the shapes for each text size.
const fraunces = Fraunces({
  variable: "--ff-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK", "opsz"],
});

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
    { media: "(prefers-color-scheme: light)", color: "#F2E8D3" },
    { media: "(prefers-color-scheme: dark)", color: "#1B1714" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={fraunces.variable}>
      <body>
        <AuthProvider>
          <NativeLinks />
          <PushSetup />
          <div className="wrap">
            <TopBar />
            <main>{children}</main>
            <Suspense fallback={null}>
              <TabBar />
            </Suspense>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
