import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/src/contexts/AuthContext";
import CommonDialog from "@/src/components/CommonDialog";
import PWARegistration from "@/src/components/PWARegistration";
import Header from "@/src/components/Header";
import Footer from "@/src/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CANDY",
  description: "Sweet & Colorful Life",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CANDY",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#9B7CC3",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} with-fixed-header`}>
        <AuthProvider>
          <Header />
          {children}
          <Footer />
          <CommonDialog />
          <PWARegistration />
        </AuthProvider>
      </body>
    </html>
  );
}
