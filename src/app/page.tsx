import Image from "next/image";
import { SignIn } from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      {/* Logo + Title */}
      <div className="flex items-center gap-3 mb-2">
        <Image
          src="/images/logos/long_form_purple_text.png"
          alt="Digital Directions"
          width={40}
          height={40}
          className="w-10 h-10"
          priority
        />
        <span className="text-xl font-semibold text-slate-900">
          Digital Directions Portal
        </span>
      </div>

      {/* Tagline */}
      <p className="text-slate-500 text-sm mb-8">
        Access your project files and updates
      </p>

      {/* Clerk Sign In */}
      <SignIn
        appearance={{
          elements: {
            rootBox: "w-full max-w-sm",
            card: "shadow-none border border-slate-200 rounded-xl",
            headerTitle: "hidden",
            headerSubtitle: "hidden",
            socialButtonsBlockButton:
              "border-slate-200 hover:bg-slate-50 text-slate-700",
            formFieldInput:
              "border-slate-200 focus:border-purple-500 focus:ring-purple-500",
            formButtonPrimary:
              "bg-purple-600 hover:bg-purple-700 text-white rounded-lg",
            footerActionLink: "text-purple-600 hover:text-purple-700",
          },
        }}
        routing="hash"
      />

      {/* Footer */}
      <p className="mt-12 text-xs text-slate-400">
        © 2026 Digital Directions
      </p>
    </main>
  );
}
