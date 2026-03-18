import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClipMint — AI Video Clips with Professional Animated Captions",
  description:
    "Upload one long video and get 10+ platform-ready clips with professional animated captions. AI detects viral moments, clips them, and adds studio-quality captions. Try free.",
  keywords: [
    "AI video clipper",
    "content repurposer",
    "short-form video",
    "animated captions",
    "viral clips",
    "YouTube shorts",
    "Instagram reels",
    "TikTok clips",
    "ClipMint",
  ],
  openGraph: {
    title: "ClipMint — AI Video Clips with Animated Captions",
    description:
      "Turn one video into 10+ viral clips with professional animated captions. Free to start.",
    type: "website",
    url: "https://novamintnetworks.in",
    siteName: "ClipMint",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClipMint — AI Video Clips with Animated Captions",
    description:
      "Turn one video into 10+ viral clips with professional animated captions.",
  },
  robots: { index: true, follow: true },
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
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="bg-grid">{children}</body>
    </html>
  );
}
