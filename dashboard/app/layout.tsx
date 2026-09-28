import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dubai Residentials — Listing Monitor",
  description: "Detect unauthorized property listings across Bayut",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="flex h-screen overflow-hidden bg-[#EAE4DC] dark:bg-[#1C1814] text-[#1C1917] dark:text-[#F0EAE2]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pt-0 md:pt-0 mt-12 md:mt-0">
          {children}
        </main>
      </body>
    </html>
  );
}
