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
              colorPrimary: "#6366F1",
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
              formButtonPrimary: "bg-[#6366F1] hover:bg-[#4F46E5] text-sm font-semibold transition-all duration-200",
              formFieldInput: "border-gray-200 text-gray-900 focus:border-[#6366F1] focus:ring-[#6366F1]/10",
              footerActionLink: "text-[#6366F1] hover:text-[#4F46E5]",
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
