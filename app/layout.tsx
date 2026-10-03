import type { Metadata, Viewport } from "next";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { ToastContainer } from "react-toastify";
import { ThemeProvider } from "next-themes";


import "./globals.css";
import { geistMono, geistSans } from "@/utils/fonts";
import { THEME_COLORS } from "@/utils/bgs-colors";
import { OfflineIndicator } from "./components/offline-indicator";
import Providers from "./components/providers";



export const metadata: Metadata = {
  title: "My Notes",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/logo128.png", sizes: "128x128" }],
    apple: [{ url: "/logo512.png", sizes: "512x512" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
  ],
};

// Stable QueryClient instance - created once, not on every render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
         <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
        <Providers>
          <HydrationBoundary state={dehydrate(queryClient)}>
            {children}
            <ToastContainer
              position="bottom-right"
              hideProgressBar
              toastClassName="bg-accent-foreground! text-accent/90! "
            />
          </HydrationBoundary>
        </Providers>
        <OfflineIndicator />
        </ThemeProvider>
      </body>
    </html>
  );
}
