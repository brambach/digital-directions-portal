import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Sparkles,
  FolderKanban,
  MessageCircle,
  ShieldCheck,
  Activity,
  ChevronRight,
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] relative overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Gradient mesh */}
        <div className="absolute inset-0 bg-gradient-page" />
        {/* Soft orbs */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-200/25 rounded-full blur-[128px]" />
        <div className="absolute top-1/4 right-1/3 w-[400px] h-[400px] bg-indigo-200/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-violet-100/30 rounded-full blur-[100px]" />
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 bg-dots" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Navigation */}
        <header className="px-6 lg:px-8 py-5">
          <div className="max-w-6xl mx-auto">
            <nav className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3 group">
                <Image
                  src="/images/dd-logo.png"
                  alt="Digital Directions"
                  width={40}
                  height={40}
                  className="w-10 h-10 group-hover:scale-105 transition-transform"
                  priority
                />
                <span className="text-heading text-lg text-slate-900 hidden sm:block">
                  Digital Directions
                </span>
              </Link>

              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Sign In
                <ChevronRight className="w-4 h-4" />
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        <section className="px-6 lg:px-8 pt-20 pb-28 lg:pt-28 lg:pb-36">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm ring-1 ring-slate-200/60 shadow-sm mb-10 animate-fade-in-up opacity-0 stagger-1">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-700">
                Client Portal for HiBob Implementations
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-display text-[2.75rem] sm:text-5xl lg:text-6xl text-slate-900 mb-7 animate-fade-in-up opacity-0 stagger-2 leading-[1.08]">
              Your project.{" "}
              <span className="relative">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-violet-600 to-indigo-600">
                  Always visible.
                </span>
                <svg
                  className="absolute -bottom-1 left-0 w-full h-3 text-violet-300/50"
                  viewBox="0 0 200 12"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M2 8.5C50 2 150 2 198 8.5"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-in-up opacity-0 stagger-3">
              Track progress, share files, and stay connected with your
              Digital Directions consultant team—all in one place.
            </p>

            {/* CTA Group */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 animate-fade-in-up opacity-0 stagger-4">
              <Link href="/sign-in" className="glow-btn group">
                <span>Access Your Portal</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <span className="text-sm text-slate-400 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                Invite-only access
              </span>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-6 lg:px-8 pb-28 lg:pb-36">
          <div className="max-w-5xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-12 animate-fade-in-up opacity-0 stagger-4">
              <p className="text-label text-violet-600 mb-3">Features</p>
              <h2 className="text-heading text-2xl sm:text-3xl text-slate-900">
                Everything you need to stay informed
              </h2>
            </div>

            {/* Feature Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  icon: FolderKanban,
                  title: "Track Progress",
                  description:
                    "Monitor every phase of your HiBob implementation in real-time.",
                  gradient: "from-violet-500 to-violet-600",
                  shadow: "shadow-violet-500/25",
                  delay: "stagger-5",
                },
                {
                  icon: MessageCircle,
                  title: "Direct Messaging",
                  description:
                    "Communicate directly with your consultant team, all in context.",
                  gradient: "from-sky-500 to-sky-600",
                  shadow: "shadow-sky-500/25",
                  delay: "stagger-5",
                },
                {
                  icon: ShieldCheck,
                  title: "Secure Files",
                  description:
                    "Share documents safely with encrypted storage and access controls.",
                  gradient: "from-emerald-500 to-emerald-600",
                  shadow: "shadow-emerald-500/25",
                  delay: "stagger-6",
                },
                {
                  icon: Activity,
                  title: "Live Integrations",
                  description:
                    "Monitor your HiBob integration health with real-time status updates.",
                  gradient: "from-amber-500 to-orange-500",
                  shadow: "shadow-amber-500/25",
                  delay: "stagger-6",
                },
              ].map((feature, index) => (
                <div
                  key={index}
                  className={`group card-elevated p-6 animate-fade-in-up opacity-0 ${feature.delay} hover:border-slate-200 transition-all duration-300`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg ${feature.shadow} group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300`}
                  >
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-heading text-base text-slate-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="px-6 lg:px-8 pb-20 lg:pb-28">
          <div className="max-w-3xl mx-auto">
            <div className="card-elevated-lg p-8 text-center animate-fade-in-up opacity-0 stagger-7">
              <div className="flex justify-center mb-5">
                <div className="flex -space-x-3">
                  {[
                    { initials: "DD", gradient: "from-violet-500 to-violet-600" },
                    { initials: "HB", gradient: "from-sky-500 to-sky-600" },
                    { initials: "HR", gradient: "from-emerald-500 to-emerald-600" },
                  ].map((avatar, i) => (
                    <div
                      key={i}
                      className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatar.gradient} ring-3 ring-white flex items-center justify-center text-white text-xs font-semibold shadow-md`}
                    >
                      {avatar.initials}
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-slate-600 mb-2">
                Trusted by organizations implementing{" "}
                <span className="font-semibold text-slate-900">HiBob HR</span>
              </p>
              <p className="text-sm text-slate-400">
                Streamlined communication • Real-time updates • Secure file sharing
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-6 lg:px-8 py-8 border-t border-slate-100 bg-white/50 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <Image
                src="/images/dd-logo.png"
                alt="Digital Directions"
                width={20}
                height={20}
                className="w-5 h-5 opacity-60"
              />
              <span>© {new Date().getFullYear()} Digital Directions</span>
            </div>
            <p className="text-sm text-slate-400">
              HiBob Implementation Specialists
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
