import Link from "next/link";
import Image from "next/image";
import { ChevronsRight, FolderOpen, MessageSquare, FileText } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-[#F9FAFF] relative overflow-hidden">
      {/* Ambient Background Gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/40 via-purple-50/10 to-transparent pointer-events-none z-0"></div>

      <div className="text-center relative z-10 max-w-2xl">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <Image
            src="/images/dd-logo.png"
            alt="Digital Directions"
            width={80}
            height={80}
            className="w-20 h-20"
          />
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-6xl font-semibold text-slate-900 tracking-tight leading-[1.1] mb-4">
          Digital Directions
        </h1>
        <p className="text-xl text-slate-500 mb-12 font-light">
          Your Client Portal for Project Updates & Support
        </p>

        {/* CTA */}
        <div className="flex flex-col gap-6 items-center">
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 appearance-none bg-white text-[#0f172a] px-8 py-4 font-semibold border-radius-full border border-slate-200 cursor-pointer tracking-tight transition-transform hover:translate-y-[-2px] hover:border-slate-300 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-1px_rgba(0,0,0,0.03)] rounded-full text-base group"
          >
            <span>Sign In to Portal</span>
            <ChevronsRight className="w-5 h-5 group-hover:translate-x-1 transition-transform stroke-[2.5]" />
          </Link>
          <p className="text-sm text-slate-400">
            Invite-only access • Contact your consultant for an invitation
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-20">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4 mx-auto">
              <FolderOpen className="w-6 h-6 text-indigo-600" strokeWidth={1.5} />
            </div>
            <h3 className="text-slate-900 font-semibold mb-2">Track Progress</h3>
            <p className="text-slate-500 text-sm">Monitor your HiBob implementation in real-time</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4 mx-auto">
              <MessageSquare className="w-6 h-6 text-indigo-600" strokeWidth={1.5} />
            </div>
            <h3 className="text-slate-900 font-semibold mb-2">Stay Connected</h3>
            <p className="text-slate-500 text-sm">Direct messaging with your consultant team</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4 mx-auto">
              <FileText className="w-6 h-6 text-indigo-600" strokeWidth={1.5} />
            </div>
            <h3 className="text-slate-900 font-semibold mb-2">Access Files</h3>
            <p className="text-slate-500 text-sm">Secure document sharing and storage</p>
          </div>
        </div>
      </div>
    </main>
  );
}
