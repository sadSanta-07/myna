import "./globals.css";
import {
  poppins,
  instrumentSerif,
  specialGothic,
} from "@/lib/fonts";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://myna-alpha.vercel.app"),

  title: {
    default: "MYNA CLI — Share Your Terminal with Teammates",
    template: "%s | MYNA CLI",
  },

  description:
    "MYNA is an open-source terminal-sharing CLI. Share a live terminal with teammates through a browser or CLI using peer-to-peer WebRTC.",

  verification: {
    google: "-PzfVNWLVXZ0Bdm5cZdfFhkpAzKOc4dEXdooDuHtA4Q",
  },

  alternates: {
    canonical: "/",
  },

  openGraph: {
    title: "MYNA CLI — Open-Source Terminal Sharing",
    description:
      "Share your terminal with teammates through a browser or CLI using WebRTC.",
    url: "https://myna-alpha.vercel.app/",
    siteName: "MYNA",
    type: "website",
  },
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
