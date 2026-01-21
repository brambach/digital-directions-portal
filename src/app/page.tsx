import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AuraStatsCard,
  AuraActivityChart,
  AuraTaskList,
  AuraDonutChart,
} from "@/components/aura/hero-widgets";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] relative overflow-hidden font-sans selection:bg-[#6366F1]/20">
      {/* Ambient Background - Aura Version */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Primary Aura Glows */}
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-[#6366F1]/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] bg-violet-200/20 rounded-full blur-[100px]" />
        <div className="absolute -bottom-[10%] left-1/2 -translate-x-1/2 w-[60%] h-[40%] bg-[#6366F1]/5 rounded-full blur-[100px]" />

        {/* Subtle dot pattern */}
        <div className="absolute inset-0 opacity-[0.4]" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navigation */}
        <header className="px-6 lg:px-8 py-6 w-full max-w-[1440px] mx-auto z-50">
          <nav className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3.5 group">
              <div className="relative">
                <div className="absolute inset-0 bg-[#6366F1]/20 blur-xl rounded-full scale-0 group-hover:scale-150 transition-transform duration-500 opacity-0 group-hover:opacity-100" />
                <Image
                  src="/images/dd-logo.png"
                  alt="Digital Directions"
                  width={42}
                  height={42}
                  className="relative w-10.5 h-10.5 group-hover:scale-110 transition-all duration-500 ease-out drop-shadow-sm"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900 tracking-tight leading-none mb-0.5">
                  Digital Directions
                </span>
                <span className="text-[10px] font-bold text-[#6366F1] uppercase tracking-[0.2em] leading-none">
                  Portal v2.0
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-6">
              <Link
                href="/sign-in"
                className="hidden sm:block text-xs font-bold text-slate-500 hover:text-[#6366F1] transition-colors uppercase tracking-widest"
              >
                Client Login
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-[11px] font-bold text-white bg-slate-900 rounded-full hover:bg-[#6366F1] transition-all duration-300 shadow-sm hover:shadow-indigo-200 uppercase tracking-widest"
              >
                Access Portal
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="flex-1 flex flex-col justify-center items-center px-4 lg:px-8 py-12 relative w-full max-w-[1440px] mx-auto">

          {/* Central Content */}
          <div className="relative z-20 max-w-3xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 px-4.5 py-2 rounded-full bg-white border border-slate-200/60 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] mb-8 animate-enter">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">
                Premium Implementation Portal
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-[5.5rem] leading-[1.05] font-bold text-slate-900 tracking-tight mb-8 animate-enter [animation-delay:100ms]">
              Your project. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6366F1] to-[#4F46E5]">
                Always visible.
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed font-medium animate-enter [animation-delay:200ms]">
              A high-fidelity coordination hub.
              Track velocity, manage assets, and sync with your specialists in real-time.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-enter [animation-delay:300ms]">
              <Link
                href="/sign-in"
                className="group relative px-8 py-4 bg-[#6366F1] rounded-2xl text-white font-bold text-[13px] uppercase tracking-widest hover:bg-[#4F46E5] transition-all duration-300 shadow-xl shadow-indigo-200 hover:shadow-indigo-300 flex items-center gap-3 overflow-hidden"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <div className="flex items-center gap-3 px-6 py-4 rounded-2xl border border-slate-200 bg-white/50 backdrop-blur-sm shadow-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  System Operational
                </span>
              </div>
            </div>
          </div>

          {/* Floating Widgets Layer */}
          <div className="absolute inset-0 z-10 pointer-events-none hidden lg:block overflow-hidden">
            <div className="relative w-full h-full max-w-[1600px] mx-auto">

              {/* Left Top: Activity Chart */}
              <div className="absolute top-[5%] -left-[2%] xl:left-[2%] w-[380px] animate-enter [animation-delay:400ms] lg:scale-90 xl:scale-100">
                <div className="bg-white p-2 rounded-3xl shadow-2xl shadow-slate-200/50 -rotate-6 transform hover:rotate-0 transition-transform duration-700">
                  <AuraActivityChart />
                </div>
              </div>

              {/* Right Top: Donut Chart */}
              <div className="absolute top-[8%] -right-[2%] xl:right-[2%] w-[340px] animate-enter [animation-delay:500ms] lg:scale-90 xl:scale-100">
                <div className="bg-white p-2 rounded-3xl shadow-2xl shadow-slate-200/50 rotate-6 transform hover:rotate-0 transition-transform duration-700">
                  <AuraDonutChart />
                </div>
              </div>

              {/* Left Bottom: Stats Card */}
              <div className="absolute bottom-[5%] left-[2%] xl:left-[8%] w-[280px] animate-enter [animation-delay:600ms] lg:scale-90 xl:scale-100">
                <div className="bg-white p-2 rounded-3xl shadow-2xl shadow-slate-200/50 rotate-3 transform hover:rotate-0 transition-transform duration-700">
                  <AuraStatsCard type="clients" />
                </div>
              </div>

              {/* Right Bottom: Task List */}
              <div className="absolute bottom-[8%] right-[2%] xl:right-[8%] w-[320px] animate-enter [animation-delay:700ms] lg:scale-90 xl:scale-100">
                <div className="bg-white p-2 rounded-3xl shadow-2xl shadow-slate-200/50 -rotate-3 transform hover:rotate-0 transition-transform duration-700">
                  <AuraTaskList />
                </div>
              </div>

              {/* Center Floating Elements (Sticky notes equiv) */}
              <div className="absolute top-[25%] left-[25%] opacity-40 animate-pulse-slow hidden xl:block">
                <div className="w-16 h-16 rounded-2xl bg-yellow-100 rotate-12 shadow-lg" />
              </div>

            </div>
          </div>

        </section>

        {/* Footer Minimal */}
        <footer className="w-full py-8 text-center text-slate-400 text-[10px] uppercase tracking-widest font-bold">
          <div className="flex items-center justify-center gap-6">
            <span>© 2026 Digital Directions</span>
            <span>Privacy</span>
            <span>Terms</span>
          </div>
        </footer>

      </div>
    </main>
  );
}
