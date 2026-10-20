import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ServiceWorkerRegister } from "./sw-register";

export const metadata: Metadata = {
  title: "Chapter 0",
  description: "Local-first in-browser document reader",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Chapter 0",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
