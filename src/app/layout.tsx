import type { Metadata } from "next";
import { Sour_Gummy, Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import ConditionalNavigation from "@/components/ConditionalNavigation";

const sourGummy = Sour_Gummy({
  subsets: ["latin"],
  weight: ["100","200","300","400","500","600","700","800","900"],
  variable: "--font-sour-gummy",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["100","200","300","400","500","600","700","800","900"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: 'FinanceFlow',
  description: 'Personal finance tracker',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FinanceFlow'
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sourGummy.variable} ${outfit.variable} font-outfit antialiased bg-[#282427]`}>
        <Providers>
          <div className="flex flex-col md:flex-row">
            <ConditionalNavigation />
            <main className="flex-1 min-h-screen w-full md:w-auto">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}