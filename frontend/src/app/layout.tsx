import type { Metadata } from "next";
import "./globals.css";

import {
  poppins,
  instrumentSerif,
  specialGothic,
} from "@/lib/fonts";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "MYNA — Share your terminal",
  description:
    "Live terminal sharing over WebRTC, isolated inside reproducible Docker environments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(poppins.variable, instrumentSerif.variable, specialGothic.variable, "font-sans", geist.variable)}
    >
      <body>{children}</body>
    </html>
  );
}