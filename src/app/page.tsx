import Image from "next/image";
import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

function SignInSkeleton() {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 space-y-4 animate-pulse">
      {/* Email field */}
      <div className="space-y-2">
        <div className="h-3.5 w-16 rounded-md bg-slate-100" />
        <div className="h-10 w-full rounded-lg bg-slate-100" />
      </div>
      {/* Password field */}
      <div className="space-y-2">
        <div className="h-3.5 w-20 rounded-md bg-slate-100" />
        <div className="h-10 w-full rounded-lg bg-slate-100" />
      </div>
      {/* Button */}
      <div className="h-10 w-full rounded-lg bg-violet-100" />
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F4F5F9] flex flex-col items-center justify-center px-4">
      {/* Logo + Title */}
      <div className="flex items-center gap-3 mb-2">
        <Image
          src="/images/logos/purple_button.png"
          alt="Digital Directions"
          width={36}
          height={36}
          className="w-9 h-9"
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

      {/* Clerk Sign In — skeleton shown while JS hydrates */}
      <Suspense fallback={<SignInSkeleton />}>
        <SignIn
          appearance={{
            elements: {
              rootBox: "w-full max-w-sm",
              card: "shadow-none border border-slate-200 rounded-2xl",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              socialButtonsBlockButton:
                "border-slate-200 hover:bg-slate-50 text-slate-700",
              formFieldInput:
                "border-slate-200 focus:border-violet-500 focus:ring-violet-500",
              formButtonPrimary:
                "bg-[#7C1CFF] hover:bg-violet-700 text-white rounded-lg",
              footerActionLink: "text-[#7C1CFF] hover:text-violet-700",
            },
          }}
          routing="hash"
        />
      </Suspense>

      {/* Footer */}
      <p className="mt-12 text-xs text-slate-400">
        © 2026 Digital Directions
      </p>
    </main>
  );
}
