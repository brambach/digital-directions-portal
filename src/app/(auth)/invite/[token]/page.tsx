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
  const [alreadyLoggedInWarning, setAlreadyLoggedInWarning] = useState(false);

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

          // If already signed in, show warning instead of auto-accepting
          if (isSignedIn) {
            setAlreadyLoggedInWarning(true);
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
          <p className="mt-4 text-slate-600">Validating your invite...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
            <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">❌</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Invalid Invite</h1>
            <p className="text-slate-600 mb-6">{error}</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
          <p className="mt-4 text-slate-600">Setting up your account...</p>
        </div>
      </div>
    );
  }

  // Show warning if already logged in
  if (alreadyLoggedInWarning) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
            <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Already Logged In</h1>
            <p className="text-slate-600 mb-6">
              You&apos;re currently logged in to another account. This invite is for{" "}
              <strong className="text-amber-600">{invite?.email}</strong>.
            </p>
            <p className="text-sm text-slate-500 mb-6">
              To accept this invitation, you need to sign out of your current account first.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/sign-out"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
              >
                Sign Out & Continue
                <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                Cancel & Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <Image
              src="/images/logos/long_form_purple_text.png"
              alt="Digital Directions"
              width={215}
              height={30}
              className="h-8 w-auto"
            />
          </div>

          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome to Digital Directions!
          </h1>
          <p className="text-slate-600 mb-4">
            You&apos;ve been invited to join as a{" "}
            <strong className="text-purple-600">{invite?.role === "admin" ? "team member" : "client"}</strong>
            {invite?.clientName && (
              <>
                {" "}
                for <strong className="text-purple-600">{invite.clientName}</strong>
              </>
            )}
          </p>
          <p className="text-sm text-slate-500">
            Email: <strong className="text-slate-700">{invite?.email}</strong>
          </p>
        </div>

        <SignUp
          routing="hash"
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-white shadow-lg border-slate-200",
            },
          }}
          afterSignUpUrl={`/invite/${token}/complete`}
          signInUrl="/sign-in"
          redirectUrl={`/invite/${token}/complete`}
        />

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-purple-600 hover:text-purple-700 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
