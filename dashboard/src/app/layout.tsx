import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClipMint — AI Content Repurposer",
  description:
    "Upload one long video → get 10+ platform-ready clips with professional animated captions. Powered by AI.",
  keywords: [
    "AI content repurposer",
    "video clips",
    "short-form content",
    "captions",
    "Remotion",
    "ClipMint",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-grid">{children}</body>
    </html>
  );
}
