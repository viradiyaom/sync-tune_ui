import type { Metadata } from "next";
import "./globals.css";
import { ToastContainer, toast } from "react-toastify";

export const metadata: Metadata = {
  title: "Sync Tune",
  description: "Your Music. Every Device. Perfectly in Sync.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        {children}
        <ToastContainer theme="dark" position="bottom-center" />
      </body>
    </html>
  );
}
