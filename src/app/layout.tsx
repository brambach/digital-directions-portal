import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
    <ClerkProvider
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: "#8B5CF6",
          colorBackground: "#FFFFFF",
          colorText: "#0F172A",
          colorTextSecondary: "#64748B",
          colorInputBackground: "#FFFFFF",
          colorInputText: "#0F172A",
          borderRadius: "0.5rem",
        },
        elements: {
          card: "shadow-lg border-slate-200",
          headerTitle: "text-slate-900",
          headerSubtitle: "text-slate-600",
          formButtonPrimary: "bg-purple-600 hover:bg-purple-700 text-sm font-semibold",
          formFieldInput: "border-slate-300 text-slate-900 focus:border-purple-500",
          footerActionLink: "text-purple-600 hover:text-purple-700",
        },
      }}
    >
      <html lang="en">
        <body className={inter.className}>
          {children}
          <Toaster richColors position="top-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}
