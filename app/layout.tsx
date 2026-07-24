import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stable Rocks Minting DApp",
  description: "Mint your exclusive Stable Rocks NFT on Stable Chain",
  icons: {
    icon: "/Logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-[#093528] text-white antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}