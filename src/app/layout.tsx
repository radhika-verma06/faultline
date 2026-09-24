import type { Metadata } from "next";

import "./globals.css";

const DESCRIPTION =
  "Every wrong answer has a reason. Faultline infers which of twenty named misconceptions a student is holding from a handful of answers, shows them the exact crack, and teaches only that.";

export const metadata: Metadata = {
  title: "Faultline — the exact crack in a student's understanding",
  description: DESCRIPTION,
  applicationName: "Faultline",
  keywords: [
    "misconception diagnosis",
    "adaptive learning",
    "physics education",
    "computerised adaptive testing",
    "edtech",
  ],
  authors: [{ name: "Radhika Verma" }],
  metadataBase: new URL("https://radhika-verma06.github.io/faultline/"),
  openGraph: {
    type: "website",
    title: "Faultline",
    description: DESCRIPTION,
    siteName: "Faultline",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "Faultline",
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
