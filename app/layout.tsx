import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";

// Setup font variables
const inter = Inter({ 
  subsets: ["latin"], 
  variable: '--font-inter' 
});
const robotoMono = Roboto_Mono({ 
  subsets: ["latin"], 
  variable: '--font-roboto-mono' 
});

export const metadata: Metadata = {
  title: "Etherlink - Beat the Chain",
  description: "Beat Etherlink sub-block times with this typing speed test.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* NO Myna UI scripts here. 
        We will import them as components.
      */}
      <head />
      {/* Apply the font variables to the body */}
      <body className={`${inter.variable} ${robotoMono.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
