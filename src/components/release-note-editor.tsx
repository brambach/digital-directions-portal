"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Send, Pencil, Trash2, EyeOff, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ReleaseNoteCard } from "@/components/release-note-card";

interface ReleaseNote {
  id: string;
  title: string;
  content: string;
  publishedAt: string | null;
  createdAt: string;
  phaseId: string | null;
}

interface ReleaseNoteEditorProps {
  projectId: string;
  notes: ReleaseNote[];
}

type DialogMode = "create" | "edit";

export function ReleaseNoteEditor({ projectId, notes }: ReleaseNoteEditorProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<DialogMode>("create");
  const [editingNote, setEditingNote] = useState<ReleaseNote | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingNote, setDeletingNote] = useState<ReleaseNote | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => {
    setMode("create");
    setEditingNote(null);
    setTitle("");
    setContent("");
    setDialogOpen(true);
  };

  const openEdit = (note: ReleaseNote) => {
    setMode("edit");
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setDialogOpen(true);
  };

  const handleSave = async (publish: boolean) => {
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    setLoading(true);
    try {
      const body = {
        title: title.trim(),
        content: content.trim(),
        publish,
      };

      const url =
        mode === "create"
          ? `/api/projects/${projectId}/release-notes`
          : `/api/projects/${projectId}/release-notes/${editingNote!.id}`;

      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save release note");
      }

      toast.success(
        publish
          ? "Build update published — client has been notified"
          : "Draft saved"
      );
      setDialogOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishExisting = async (note: ReleaseNote) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/release-notes/${note.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish: true }),
      });
      if (!res.ok) throw new Error("Failed to publish");
      toast.success("Build update published — client has been notified");
      router.refresh();
    } catch {
      toast.error("Failed to publish build update");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingNote) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/release-notes/${deletingNote.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Build update deleted");
      setDeleteDialogOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to delete build update");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#7C1CFF]" />
          <h3 className="font-bold text-slate-900 text-sm">Build Updates</h3>
          {notes.length > 0 && (
            <span className="text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full font-semibold">
              {notes.length}
            </span>
          )}
        </div>
        <Button size="sm" onClick={openCreate} className="rounded-full text-xs">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Update
        </Button>
      </div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">No build updates yet</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Post updates as you complete parts of the integration to keep the client informed.
          </p>
          <Button size="sm" variant="outline" onClick={openCreate} className="rounded-full">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add First Update
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="group relative">
              <ReleaseNoteCard
                note={note}
                isDraft={!note.publishedAt}
              />
              {/* Admin action buttons overlay */}
              <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!note.publishedAt && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs rounded-lg border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => handlePublishExisting(note)}
                    disabled={loading}
                  >
                    <Send className="w-3 h-3 mr-1" />
                    Publish
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0 rounded-lg"
                  onClick={() => openEdit(note)}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0 rounded-lg border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => {
                    setDeletingNote(note);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "New Build Update" : "Edit Build Update"}
            </DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "Write an update for the client. You can save as draft or publish immediately."
                : "Update the content of this build update."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="rn-title">Title</Label>
              <Input
                id="rn-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Employee upsert complete"
                maxLength={255}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rn-content">Update</Label>
              <Textarea
                id="rn-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Describe what was built, completed, or changed in this update..."
                rows={5}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            {(mode === "create" || (mode === "edit" && !editingNote?.publishedAt)) && (
              <Button
                variant="outline"
                onClick={() => handleSave(false)}
                disabled={loading || !title.trim() || !content.trim()}
                className="border-slate-300"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <EyeOff className="w-4 h-4 mr-2" />
                )}
                Save Draft
              </Button>
            )}
            <Button
              onClick={() =>
                mode === "edit" && editingNote?.publishedAt
                  ? handleSave(false)
                  : handleSave(true)
              }
              disabled={loading || !title.trim() || !content.trim()}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : mode === "edit" && editingNote?.publishedAt ? (
                <Pencil className="w-4 h-4 mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {mode === "edit" && editingNote?.publishedAt ? "Update" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Build Update</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deletingNote?.title}&rdquo;? This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
