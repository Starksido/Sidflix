import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { AccountSession } from "@/components/account-session";
import { RemoteNavigation } from "@/components/remote-navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["wdth", "opsz"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Sidflix",
  description: "Movies, TV shows, anime and live TV in one place.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${bricolage.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><AccountSession /><RemoteNavigation />{children}</body>
    </html>
  );
}
