import type { Metadata } from "next";
import "./globals.css";

import {
  poppins,
  instrumentSerif,
  specialGothic,
} from "@/lib/fonts";

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
      className={`${poppins.variable} ${instrumentSerif.variable} ${specialGothic.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}