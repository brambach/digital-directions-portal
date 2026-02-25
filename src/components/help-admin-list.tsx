"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HelpArticleDialog } from "@/components/help-article-dialog";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string | null;
  loomUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "portal", label: "Portal" },
  { value: "lifecycle", label: "Lifecycle" },
  { value: "integrations", label: "Integrations" },
  { value: "support", label: "Support" },
];

const CATEGORY_COLORS: Record<string, string> = {
  portal: "bg-violet-50 text-violet-700",
  lifecycle: "bg-sky-50 text-sky-700",
  integrations: "bg-emerald-50 text-emerald-700",
  support: "bg-amber-50 text-amber-700",
};

export function HelpAdminList() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
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

  async function handleDelete(slug: string) {
    if (!confirm("Are you sure you want to delete this article?")) return;

    await fetch(`/api/help-articles/${slug}`, { method: "DELETE" });
    fetchArticles();
  }

  function handleEdit(article: Article) {
    setEditingArticle(article);
    setDialogOpen(true);
  }

  function handleCreate() {
    setEditingArticle(null);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles..."
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all",
                categoryFilter === cat.value
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <Button onClick={handleCreate} size="sm" className="rounded-xl font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          New Article
        </Button>
      </div>

      {/* Article List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse"
            >
              <div className="h-5 bg-slate-100 rounded w-1/3 mb-3" />
              <div className="h-4 bg-slate-50 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <p className="text-[15px] font-semibold text-slate-700">No articles found</p>
          <p className="text-[13px] text-slate-400 mt-1">
            {search || categoryFilter
              ? "Try adjusting your filters"
              : "Create your first help article to get started"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <div
              key={article.id}
              className="bg-white rounded-2xl border border-slate-100 p-5 hover:border-violet-200 transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="text-[15px] font-semibold text-slate-800 truncate">
                      {article.title}
                    </h3>
                    {article.loomUrl && (
                      <Video className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[12px]">
                    {article.category && (
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full font-semibold capitalize",
                          CATEGORY_COLORS[article.category] || "bg-slate-100 text-slate-600"
                        )}
                      >
                        {article.category}
                      </span>
                    )}
                    <span className="text-slate-400">
                      /{article.slug}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-400">
                      Updated {formatDistanceToNow(new Date(article.updatedAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-[13px] text-slate-500 mt-2 line-clamp-2">
                    {article.content.substring(0, 200)}
                  </p>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <span
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold mr-1",
                      article.publishedAt
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {article.publishedAt ? (
                      <>
                        <Eye className="w-3 h-3" /> Published
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3" /> Draft
                      </>
                    )}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg h-8 w-8 p-0"
                    onClick={() => handleEdit(article)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:border-red-200"
                    onClick={() => handleDelete(article.slug)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <HelpArticleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        article={editingArticle}
        onSaved={fetchArticles}
      />
    </div>
  );
}
