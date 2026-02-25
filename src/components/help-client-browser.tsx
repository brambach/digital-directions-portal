"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  BookOpen,
  ArrowRight,
  Video,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DigiMascot } from "@/components/digi-mascot";
import { LoomEmbed } from "@/components/loom-embed";

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string | null;
  loomUrl: string | null;
  publishedAt: string | null;
}

const CATEGORIES = [
  { value: "", label: "All Articles", icon: "📚" },
  { value: "portal", label: "Portal Guide", icon: "🖥️" },
  { value: "lifecycle", label: "Lifecycle", icon: "🔄" },
  { value: "integrations", label: "Integrations", icon: "🔗" },
  { value: "support", label: "Support", icon: "💬" },
];

const CATEGORY_COLORS: Record<string, string> = {
  portal: "bg-violet-50 text-violet-700 border-violet-100",
  lifecycle: "bg-sky-50 text-sky-700 border-sky-100",
  integrations: "bg-emerald-50 text-emerald-700 border-emerald-100",
  support: "bg-amber-50 text-amber-700 border-amber-100",
};

function renderMarkdown(content: string) {
  // Simple markdown rendering: headings, bold, lists, paragraphs
  return content.split("\n").map((line, i) => {
    if (line.startsWith("### ")) {
      return (
        <h3 key={i} className="text-[15px] font-bold text-slate-800 mt-5 mb-2">
          {line.replace("### ", "")}
        </h3>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <h2 key={i} className="text-[17px] font-bold text-slate-900 mt-6 mb-2">
          {line.replace("## ", "")}
        </h2>
      );
    }
    if (line.startsWith("# ")) {
      return (
        <h1 key={i} className="text-[20px] font-bold text-slate-900 mt-6 mb-3">
          {line.replace("# ", "")}
        </h1>
      );
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      return (
        <li key={i} className="text-[14px] text-slate-600 leading-relaxed ml-4 list-disc">
          {line.replace(/^[-*] /, "")}
        </li>
      );
    }
    if (line.match(/^\d+\. /)) {
      return (
        <li key={i} className="text-[14px] text-slate-600 leading-relaxed ml-4 list-decimal">
          {line.replace(/^\d+\. /, "")}
        </li>
      );
    }
    if (line.trim() === "") {
      return <div key={i} className="h-3" />;
    }
    // Bold text
    const withBold = line.replace(
      /\*\*(.+?)\*\*/g,
      '<strong class="font-semibold text-slate-800">$1</strong>'
    );
    return (
      <p
        key={i}
        className="text-[14px] text-slate-600 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: withBold }}
      />
    );
  });
}

export function HelpClientBrowser() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("published", "true");
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);

      const res = await fetch(`/api/help-articles?${params}`);
      const data = await res.json();
      setArticles(Array.isArray(data) ? data : []);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Article detail view
  if (selectedArticle) {
    return (
      <div className="space-y-5">
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl font-semibold"
          onClick={() => setSelectedArticle(null)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to articles
        </Button>

        <div className="bg-white rounded-2xl border border-slate-100 p-8">
          <div className="max-w-3xl">
            {selectedArticle.category && (
              <span
                className={cn(
                  "inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize mb-4 border",
                  CATEGORY_COLORS[selectedArticle.category] || "bg-slate-100 text-slate-600 border-slate-200"
                )}
              >
                {selectedArticle.category}
              </span>
            )}

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-6">
              {selectedArticle.title}
            </h1>

            {selectedArticle.loomUrl && (
              <div className="mb-8">
                <LoomEmbed
                  url={selectedArticle.loomUrl}
                  title={selectedArticle.title}
                />
              </div>
            )}

            <div className="prose prose-slate max-w-none">
              {renderMarkdown(selectedArticle.content)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white rounded-2xl border border-slate-100 p-8">
        <div className="flex items-center gap-4">
          <DigiMascot variant="neutral" size="sm" />
          <div className="flex-1">
            <h2 className="text-[17px] font-bold text-slate-800 mb-1">
              How can we help?
            </h2>
            <p className="text-[13px] text-slate-500 mb-4">
              Search our knowledge base or browse by category
            </p>
            <div className="relative max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search for articles..."
                className="pl-9 h-11"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategoryFilter(cat.value)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all border",
              categoryFilter === cat.value
                ? "bg-white text-slate-900 border-violet-200 shadow-sm"
                : "bg-white/50 text-slate-500 border-transparent hover:bg-white hover:border-slate-200"
            )}
          >
            <span>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Articles Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-100 p-6 animate-pulse"
            >
              <div className="h-4 bg-slate-100 rounded w-1/4 mb-3" />
              <div className="h-5 bg-slate-100 rounded w-3/4 mb-3" />
              <div className="h-4 bg-slate-50 rounded w-full mb-2" />
              <div className="h-4 bg-slate-50 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <DigiMascot variant="confused" size="sm" className="mx-auto mb-4" />
          <p className="text-[15px] font-semibold text-slate-700">No articles found</p>
          <p className="text-[13px] text-slate-400 mt-1">
            {search
              ? "Try different search terms"
              : "No articles in this category yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {articles.map((article) => (
            <button
              key={article.id}
              onClick={() => setSelectedArticle(article)}
              className="bg-white rounded-2xl border border-slate-100 p-6 text-left hover:border-violet-200 hover:shadow-md hover:shadow-violet-500/5 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                {article.category && (
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize border",
                      CATEGORY_COLORS[article.category] || "bg-slate-100 text-slate-600 border-slate-200"
                    )}
                  >
                    {article.category}
                  </span>
                )}
                <div className="flex items-center gap-1.5">
                  {article.loomUrl && (
                    <Video className="w-3.5 h-3.5 text-violet-500" />
                  )}
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>

              <h3 className="text-[15px] font-semibold text-slate-800 mb-2 group-hover:text-violet-700 transition-colors">
                {article.title}
              </h3>
              <p className="text-[13px] text-slate-500 line-clamp-2">
                {article.content.substring(0, 150)}...
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
