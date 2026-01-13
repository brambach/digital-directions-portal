"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function InviteCompletePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function acceptInvite() {
      try {
        const response = await fetch("/api/invites/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Failed to accept invite");
          return;
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
        setError("Failed to accept invite. Please try again.");
      }
    }

    if (token) {
      acceptInvite();
    }
  }, [token, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
            <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">❌</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Setup Failed</h1>
            <p className="text-slate-600 mb-6">{error}</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
        <p className="mt-4 text-slate-600">Completing your registration...</p>
      </div>
    </div>
  );
}
