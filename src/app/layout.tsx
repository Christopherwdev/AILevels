import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import OverlayWrapper from "@/components/OverlayWrapper";
import { createClient } from "@/utils/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Precision Edu | A-Levels Study Tools (Edexcel & Cambridge)",
  description: "Functional educational dashboard and past papers search engine for A-Level and IGCSE students.",
  icons: {
    icon: "/Precision Icon.svg",
    apple: "/Precision Icon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const saved = localStorage.getItem('theme');
                  if (saved === 'light' || (!saved && !window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.remove('dark');
                  } else {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })()
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 transition-colors duration-300">
        <OverlayWrapper>
          <div className={user ? "flex flex-col lg:flex-row min-h-screen w-full" : "flex flex-col min-h-screen w-full"}>
            <Navbar userEmail={user?.email || null} />
            <main className="flex-1 flex flex-col min-w-0">{children}</main>
          </div>
        </OverlayWrapper>
      </body>
    </html>
  );
}

