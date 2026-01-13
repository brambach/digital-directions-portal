import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <div className="flex items-center justify-center mb-6">
          <Image
            src="/images/dd-logo.png"
            alt="Digital Directions"
            width={200}
            height={50}
            className="h-auto"
          />
        </div>
        <p className="text-lg text-gray-600 mb-6">Your Client Portal for Project Updates & Support</p>

        <div className="flex flex-col gap-4 items-center">
          <Link
            href="/sign-in"
            className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors font-medium"
          >
            Sign In to Portal
          </Link>
          <p className="text-sm text-gray-500">
            Invite-only access • Contact your consultant for an invitation
          </p>
        </div>
      </div>
    </main>
  );
}
