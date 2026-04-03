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
    <html lang="en">
      <body className={cn(geist.className, "antialiased")}>
        <ClerkProvider
          appearance={{
            baseTheme: undefined,
            variables: {
              colorPrimary: "#7C1CFF",
              borderRadius: "0.75rem",
            },
            elements: {
              formButtonPrimary: "bg-[#7C1CFF] hover:bg-[#6B0FEE] text-sm font-semibold transition-all duration-200",
              footerActionLink: "text-[#7C1CFF] hover:text-[#6B0FEE]",
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
