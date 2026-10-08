import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";

import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Navbar } from "@/components/layout/navbar";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "Lost Found App",
  description: "Get lucky and find your belongings.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Navbar />
        <MobileHeader />
        {children}
        <BottomTabBar />
      </body>
    </html>
  );
}
