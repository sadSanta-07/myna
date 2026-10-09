import localFont from "next/font/local";

export const poppins = localFont({
  src: "../components/fonts/Poppins-Regular.woff2",
  variable: "--font-poppins",
  display: "swap",
});

export const instrumentSerif = localFont({
  src: "../components/fonts/InstrumentSerif-Regular.ttf",
  variable: "--font-instrument",
  display: "swap",
});

export const specialGothic = localFont({
  src: "../components/fonts/SpecialGothicExpandedOne-Regular.woff2",
  variable: "--font-gothic",
  display: "swap",
});