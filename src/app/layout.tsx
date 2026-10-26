import * as stylex from "@stylexjs/stylex";
import type { Metadata, Viewport } from "next";
import { Cantarell, Petit_Formal_Script } from "next/font/google";
import type { ReactNode } from "react";
import { colors, typography } from "../styles/tokens.stylex";
import "./globals.css";
import { ServiceWorkerRegister } from "./sw-register";

// Stryker disable all
const petitFormalScript = Petit_Formal_Script({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-petit",
  display: "swap",
});

const cantarell = Cantarell({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-cantarell",
  display: "swap",
});
// Stryker restore all

export const metadata: Metadata = {
  title: "Chapter 0",
  description: "Book reader inside your browser",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Chapter 0",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBFBF9" },
    { media: "(prefers-color-scheme: dark)", color: "#141312" },
  ],
};

// Stryker disable all
const styles = stylex.create({
  html: {
    colorScheme: "light dark",
    boxSizing: "border-box",
  },
  body: {
    backgroundColor: colors.background,
    color: colors.textPrimary,
    fontFamily: typography.fontSans,
    margin: 0,
    boxSizing: "border-box",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
  },
});
// Stryker restore all

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const htmlProps = stylex.props(styles.html);

  return (
    <html
      lang="en"
      className={`${petitFormalScript.variable} ${cantarell.variable} ${htmlProps.className}`}
    >
      <body {...stylex.props(styles.body)}>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
