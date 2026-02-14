import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
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
    <html lang="en">
      <body className={geist.className}>
        <ClerkProvider
          appearance={{
            baseTheme: undefined,
            variables: {
              colorPrimary: "#6d28d9",
              colorBackground: "#FFFFFF",
              colorText: "#111827",
              colorTextSecondary: "#6B7280",
              colorInputBackground: "#FFFFFF",
              colorInputText: "#111827",
              borderRadius: "1rem",
            },
            elements: {
              card: "shadow-sm border-gray-100",
              headerTitle: "text-gray-900",
              headerSubtitle: "text-gray-500",
              formButtonPrimary: "bg-violet-700 hover:bg-violet-800 text-sm font-semibold transition-all duration-200",
              formFieldInput: "border-gray-200 text-gray-900 focus:border-violet-600 focus:ring-violet-600/10",
              footerActionLink: "text-violet-700 hover:text-violet-800",
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
