"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Building2, FolderOpen, Ticket, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, staggerItem } from "@/components/motion/stagger-list";

interface SearchResult {
    id: string;
    label: string;
    sub?: string;
    href: string;
}

interface SearchResults {
    clients: { id: string; companyName: string; contactName: string; status: string }[];
    projects: { id: string; name: string; status: string; clientId: string }[];
    tickets: { id: string; title: string; status: string; priority: string }[];
}

interface GlobalSearchProps {
    role: "admin" | "client";
    placeholder?: string;
}

export function GlobalSearch({ role, placeholder }: GlobalSearchProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResults | null>(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const defaultPlaceholder = role === "admin"
        ? "Search clients, projects, tickets…"
        : "Search projects, tickets...";

    const doSearch = useCallback(async (q: string) => {
        if (q.length < 2) {
            setResults(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
            const data: SearchResults = await res.json();
            setResults(data);
            setOpen(true);
        } catch {
            setResults(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (val.length < 2) {
            setResults(null);
            setOpen(false);
            return;
        }
        debounceRef.current = setTimeout(() => doSearch(val), 300);
    };

    // Close on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    // Close on Escape
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            setOpen(false);
            inputRef.current?.blur();
        }
    };

    const handleSelect = (href: string) => {
        setOpen(false);
        setQuery("");
        setResults(null);
        router.push(href);
    };

    const hasResults = results && (
        results.clients.length > 0 ||
        results.projects.length > 0 ||
        results.tickets.length > 0
    );

    const clientResults: SearchResult[] = (results?.clients ?? []).map((c) => ({
        id: c.id,
        label: c.companyName,
        sub: c.contactName,
        href: `/dashboard/admin/clients/${c.id}`,
    }));

    const projectResults: SearchResult[] = (results?.projects ?? []).map((p) => ({
        id: p.id,
        label: p.name,
        sub: p.status.replace("_", " "),
        href: role === "admin"
            ? `/dashboard/admin/projects/${p.id}`
            : `/dashboard/client/projects/${p.id}`,
    }));

    const ticketResults: SearchResult[] = (results?.tickets ?? []).map((t) => ({
        id: t.id,
        label: t.title,
        sub: `${t.priority} priority · ${t.status.replace("_", " ")}`,
        href: role === "admin"
            ? `/dashboard/admin/tickets/${t.id}`
            : `/dashboard/client/tickets/${t.id}`,
    }));

    return (
        <div ref={containerRef} className="relative w-full">
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                {loading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-violet-400 animate-spin" />
                )}
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => { if (results && hasResults) setOpen(true); }}
                    placeholder={placeholder ?? defaultPlaceholder}
                    className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-violet-300 focus:ring-2 focus:ring-violet-100 rounded-lg text-[13px] text-slate-700 placeholder:text-slate-400 outline-none transition-all"
                />
            </div>

            <AnimatePresence>
            {open && query.length >= 2 && (
                <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="absolute top-full mt-1.5 left-0 w-[380px] bg-white rounded-xl border border-slate-200 shadow-lg z-[9999] overflow-hidden"
                >
                    {!hasResults && !loading && (
                        <div className="px-4 py-6 text-center text-[13px] text-slate-400">
                            No results for &ldquo;{query}&rdquo;
                        </div>
                    )}

                    {clientResults.length > 0 && (
                        <Section icon={<Building2 className="w-3.5 h-3.5" />} label="Clients">
                            {clientResults.map((r) => (
                                <ResultRow key={r.id} result={r} onSelect={handleSelect} />
                            ))}
                        </Section>
                    )}

                    {projectResults.length > 0 && (
                        <Section icon={<FolderOpen className="w-3.5 h-3.5" />} label="Projects">
                            {projectResults.map((r) => (
                                <ResultRow key={r.id} result={r} onSelect={handleSelect} />
                            ))}
                        </Section>
                    )}

                    {ticketResults.length > 0 && (
                        <Section icon={<Ticket className="w-3.5 h-3.5" />} label="Tickets">
                            {ticketResults.map((r) => (
                                <ResultRow key={r.id} result={r} onSelect={handleSelect} />
                            ))}
                        </Section>
                    )}
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
}

function Section({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
    return (
        <div>
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border-b border-slate-100">
                <span className="text-slate-400">{icon}</span>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
            </div>
            <motion.div variants={staggerContainer} initial="hidden" animate="show">{children}</motion.div>
        </div>
    );
}

function ResultRow({ result, onSelect }: { result: SearchResult; onSelect: (href: string) => void }) {
    return (
        <motion.button
            variants={staggerItem}
            onClick={() => onSelect(result.href)}
            className="w-full flex items-start gap-2 px-3 py-2.5 hover:bg-violet-50 transition-colors text-left border-b border-slate-50 last:border-0"
        >
            <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-slate-800 truncate">{result.label}</p>
                {result.sub && (
                    <p className="text-[11px] text-slate-400 capitalize truncate">{result.sub}</p>
                )}
            </div>
        </motion.button>
    );
}
