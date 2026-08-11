import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { Inter } from "next/font/google";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "./globals.css";
import "@style/misans.css"
import ThemeRegistry from "@/components/layout/ThemeRegistry/ThemeRegistry";
import { I18nProvider } from "@/lib/i18n";
import LoadingBar from "@/components/layout/LoadingBar";
import SITE_CONFIG from "@/var/config";
import AuthLifecycle from "@/components/auth/AuthLifecycle";
import Navbar from "@/components/layout/Navbar";
import { NavbarLoginStatusProvider } from "@/components/layout/NavbarLoginStatus";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: SITE_CONFIG.siteName,
  description: SITE_CONFIG.description,
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ maxWidth: "100vw", overflowX: "hidden" ,hyphens: "auto",
      overflowWrap: "break-word"
    }} suppressHydrationWarning className={`${nunito.variable} ${inter.variable}`}>
      <body className="min-h-full antialiased" suppressHydrationWarning>
        <ThemeRegistry>
        <I18nProvider>
          <AuthLifecycle>
            <NavbarLoginStatusProvider>
              <LoadingBar />
              <Navbar />
              {children}
            </NavbarLoginStatusProvider>
          </AuthLifecycle>
        </I18nProvider>
      </ThemeRegistry>
      </body>
    </html>
  );
}
