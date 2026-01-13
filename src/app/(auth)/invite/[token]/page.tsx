"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { SignUp, useUser, useSignUp } from "@clerk/nextjs";
import { Loader2, ChevronRight } from "lucide-react";

interface InviteData {
  email: string;
  role: "admin" | "client";
  clientName?: string;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn } = useUser();
  const { signUp } = useSignUp();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [acceptingInvite, setAcceptingInvite] = useState(false);

  const acceptInvite = useCallback(async () => {
    setAcceptingInvite(true);
    try {
      const response = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error("Failed to accept invite");
      }

      const data = await response.json();

      // Redirect to appropriate dashboard
      if (data.role === "admin") {
        router.push("/dashboard/admin");
      } else {
        router.push("/dashboard/client");
      }
    } catch (err) {
      console.error("Error accepting invite:", err);
      setError("Failed to accept invite");
      setAcceptingInvite(false);
    }
  }, [token, router]);

  useEffect(() => {
    if (!token) {
      setError("Invalid invite link");
      setLoading(false);
      return;
    }

    // Validate the invite token
    async function validateInvite() {
      try {
        const response = await fetch("/api/invites/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Invalid invite");
          setLoading(false);
          return;
        }

        const data = await response.json();
        if (data.valid) {
          setInvite(data.invite);

          // If already signed in, accept the invite immediately
          if (isSignedIn) {
            acceptInvite();
          }
        } else {
          setError("Invalid or expired invite");
        }
        setLoading(false);
      } catch (err) {
        console.error("Error validating invite:", err);
        setError("Failed to validate invite");
        setLoading(false);
      }
    }

    validateInvite();
  }, [token, isSignedIn, acceptInvite]);

  // After successful Clerk signup, accept the invite
  const handleSignUpComplete = async () => {
    await acceptInvite();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-500" />
          <p className="mt-4 text-slate-400">Validating your invite...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="glass-panel rounded-2xl p-8">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">❌</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Invalid Invite</h1>
            <p className="text-slate-400 mb-6">{error}</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black rounded-full hover:shadow-[0_0_25px_-5px_rgba(255,255,255,0.5)] hover:-translate-y-0.5 transition-all font-semibold"
            >
              Go to Home
              <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (acceptingInvite) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-500" />
          <p className="mt-4 text-slate-400">Setting up your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <Image
              src="/images/dd-logo.png"
              alt="Digital Directions"
              width={64}
              height={64}
              className="w-16 h-16"
            />
          </div>

          <h1 className="text-3xl font-bold text-white mb-2 bg-gradient-to-br from-white via-white to-slate-400 bg-clip-text text-transparent">
            Welcome to Digital Directions!
          </h1>
          <p className="text-slate-400 mb-4">
            You&apos;ve been invited to join as a{" "}
            <strong className="text-indigo-400">{invite?.role === "admin" ? "team member" : "client"}</strong>
            {invite?.clientName && (
              <>
                {" "}
                for <strong className="text-indigo-400">{invite.clientName}</strong>
              </>
            )}
          </p>
          <p className="text-sm text-slate-500">
            Email: <strong className="text-slate-400">{invite?.email}</strong>
          </p>
        </div>

        <SignUp
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "glass-panel shadow-2xl border-white/10",
            },
          }}
          afterSignUpUrl={`/api/invites/accept?token=${token}`}
          signInUrl="/sign-in"
          redirectUrl={`/api/invites/accept?token=${token}`}
        />

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
