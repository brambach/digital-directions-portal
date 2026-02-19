"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ManagePhaseTemplateDialog } from "@/components/manage-phase-template-dialog";
import { toast } from "sonner";
import {
  Plus,
  Layers,
  Edit2,
  Trash2,
  Calendar,
  AlertCircle,
} from "lucide-react";
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

interface PhaseTemplate {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  phases: {
    id: string;
    name: string;
    description: string | null;
    orderIndex: number;
    estimatedDays: number | null;
  }[];
}

export function PhaseTemplateList() {
  const router = useRouter();
  const [templates, setTemplates] = useState<PhaseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PhaseTemplate | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<PhaseTemplate | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/phase-templates");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setDialogOpen(true);
  };

  const handleEdit = (template: PhaseTemplate) => {
    setSelectedTemplate(template);
    setDialogOpen(true);
  };

  const handleDeleteClick = (template: PhaseTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/phase-templates/${templateToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete template");
      }

      toast.success("Template deleted successfully");
      router.refresh();
      fetchTemplates();
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    } finally {
      setDeleting(false);
    }
  };

  const handleSuccess = () => {
    fetchTemplates();
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-6 border border-slate-100 animate-pulse"
          >
            <div className="space-y-3">
              <div className="h-6 bg-slate-200 rounded w-3/4" />
              <div className="h-4 bg-slate-200 rounded w-full" />
              <div className="h-4 bg-slate-200 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Phase Templates
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage reusable project phase templates
          </p>
        </div>
        <Button
          onClick={handleCreate}
          size="sm"
          className="rounded-xl font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <Layers className="w-16 h-16 text-slate-300 mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-slate-600 font-medium mb-2">No phase templates yet</p>
          <p className="text-sm text-slate-500 mb-6">
            Create your first template to streamline project setup
          </p>
          <Button
            onClick={handleCreate}
            size="sm"
            className="rounded-xl font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create First Template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            const totalDays = template.phases.reduce(
              (sum, phase) => sum + (phase.estimatedDays || 0),
              0
            );

            return (
              <div
                key={template.id}
                className="bg-white rounded-2xl p-6 border border-slate-100 hover:border-purple-200 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                      <Layers className="w-5 h-5 text-purple-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">
                        {template.name}
                      </h3>
                      {template.isDefault && (
                        <span className="inline-block mt-1 text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium uppercase tracking-wider">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(template)}
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                      title="Edit template"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(template)}
                      className="p-2 rounded-lg hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors"
                      title="Delete template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {template.description && (
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                    {template.description}
                  </p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Layers className="w-4 h-4 text-slate-400" />
                    <span>
                      {template.phases.length}{" "}
                      {template.phases.length === 1 ? "phase" : "phases"}
                    </span>
                  </div>
                  {totalDays > 0 && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>~{totalDays} days estimated</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex flex-wrap gap-1.5">
                    {template.phases.slice(0, 3).map((phase, index) => (
                      <span
                        key={phase.id}
                        className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded-md font-medium"
                      >
                        {index + 1}. {phase.name}
                      </span>
                    ))}
                    {template.phases.length > 3 && (
                      <span className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded-md">
                        +{template.phases.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <ManagePhaseTemplateDialog
        template={selectedTemplate}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Delete Template
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{templateToDelete?.name}&rdquo;? This will
              not affect existing projects using this template, but it will no longer
              be available for new projects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? "Deleting..." : "Delete Template"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
