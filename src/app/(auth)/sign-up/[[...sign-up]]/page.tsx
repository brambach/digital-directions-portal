import Image from "next/image";
import Link from "next/link";
import { Mail, UserPlus } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
          <div className="text-center mb-6">
            <Image
              src="/images/logos/long_form_purple_text.png"
              alt="Digital Directions"
              width={120}
              height={30}
              className="mx-auto mb-4"
            />
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Invite Only
            </h1>
            <p className="text-gray-600">
              Digital Directions Portal is invitation-only. You&apos;ll need an invite to create an account.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
              <div className="flex gap-3">
                <UserPlus className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">For Team Members</h3>
                  <p className="text-sm text-gray-600">
                    Ask an existing admin to send you an invite from the admin dashboard.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
              <div className="flex gap-3">
                <Mail className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">For Clients</h3>
                  <p className="text-sm text-gray-600">
                    Check your email for an invite from Digital Directions, or contact your implementation consultant.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600 mb-4">
              Already have an account?
            </p>
            <Link
              href="/sign-in"
              className="inline-block w-full px-6 py-2.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium"
            >
              Sign In
            </Link>
          </div>

          <div className="mt-4 text-center">
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
