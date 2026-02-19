import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Digital Directions Portal",
  description: "Client portal for project tracking, file sharing, and support tickets",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }}>
      <body className={cn(geist.className, "antialiased")}>
        <ClerkProvider
          appearance={{
            baseTheme: undefined,
            variables: {
              colorPrimary: "#7C3AED",
              colorBackground: "#151921",
              colorText: "white",
              colorTextSecondary: "#94a3b8",
              colorInputBackground: "#0B0E14",
              colorInputText: "white",
              borderRadius: "0.75rem",
            },
            elements: {
              card: "shadow-none border border-white/10",
              headerTitle: "text-white",
              headerSubtitle: "text-slate-400",
              formButtonPrimary: "bg-purple-600 hover:bg-purple-700 text-sm font-semibold transition-all duration-200",
              formFieldInput: "border-white/10 bg-slate-950 text-white focus:border-purple-600 focus:ring-purple-600/10",
              footerActionLink: "text-purple-400 hover:text-purple-500",
            },
          }}
        >
          {children}
          <Toaster richColors position="top-right" />
        </ClerkProvider>
      </body>
    </html>
  );
}
