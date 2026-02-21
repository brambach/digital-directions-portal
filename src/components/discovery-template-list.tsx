"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ManageDiscoveryTemplateDialog } from "@/components/manage-discovery-template-dialog";
import { toast } from "sonner";
import {
  Plus,
  FileQuestion,
  Edit2,
  Trash2,
  AlertCircle,
  MessageSquareText,
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

interface DiscoverySection {
  id: string;
  title: string;
  description?: string;
  loomUrl?: string;
  questions: { id: string; label: string; type: string; required: boolean; options?: string[] }[];
}

interface DiscoveryTemplate {
  id: string;
  name: string;
  payrollSystem: string;
  sections: DiscoverySection[];
  version: number;
  isActive: boolean;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

const PAYROLL_BADGES: Record<string, { label: string; className: string }> = {
  keypay: { label: "KeyPay", className: "bg-blue-50 text-blue-700" },
  myob: { label: "MYOB", className: "bg-orange-50 text-orange-700" },
  deputy: { label: "Deputy", className: "bg-emerald-50 text-emerald-700" },
  generic: { label: "Generic", className: "bg-slate-100 text-slate-600" },
};

export function DiscoveryTemplateList() {
  const router = useRouter();
  const [templates, setTemplates] = useState<DiscoveryTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DiscoveryTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<DiscoveryTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/discovery-templates");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error("Error fetching discovery templates:", error);
      toast.error("Failed to load discovery templates");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setDialogOpen(true);
  };

  const handleEdit = (template: DiscoveryTemplate) => {
    setSelectedTemplate(template);
    setDialogOpen(true);
  };

  const handleDeleteClick = (template: DiscoveryTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/discovery-templates/${templateToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete template");

      toast.success("Template deleted");
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

  const handleToggleActive = async (template: DiscoveryTemplate) => {
    try {
      const response = await fetch(`/api/discovery-templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !template.isActive }),
      });

      if (!response.ok) throw new Error("Failed to update template");

      toast.success(template.isActive ? "Template deactivated" : "Template activated");
      fetchTemplates();
    } catch (error) {
      console.error("Error toggling template:", error);
      toast.error("Failed to update template");
    }
  };

  // Group templates by payroll system
  const grouped = templates.reduce<Record<string, DiscoveryTemplate[]>>((acc, t) => {
    const key = t.payrollSystem;
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

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
          <h2 className="text-lg font-semibold text-slate-900">Discovery Templates</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage questionnaire templates used during the discovery stage
          </p>
        </div>
        <Button onClick={handleCreate} size="sm" className="rounded-xl font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <FileQuestion className="w-16 h-16 text-slate-300 mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-slate-600 font-medium mb-2">No discovery templates yet</p>
          <p className="text-sm text-slate-500 mb-6">
            Create your first template to start using the discovery module
          </p>
          <Button onClick={handleCreate} size="sm" className="rounded-xl font-semibold">
            <Plus className="w-4 h-4 mr-2" />
            Create First Template
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([system, systemTemplates]) => {
            const badge = PAYROLL_BADGES[system] || PAYROLL_BADGES.generic;
            return (
              <div key={system}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${badge.className}`}>
                    {badge.label}
                  </span>
                  <span className="text-xs text-slate-400">
                    {systemTemplates.length} template{systemTemplates.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {systemTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`bg-white rounded-2xl p-6 border hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-200 group ${
                        template.isActive
                          ? "border-slate-100 hover:border-purple-200"
                          : "border-slate-200 opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                            <FileQuestion className="w-5 h-5 text-purple-700" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 truncate">
                              {template.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              {!template.isActive && (
                                <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-medium">
                                  Inactive
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleToggleActive(template)}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                            title={template.isActive ? "Deactivate" : "Activate"}
                          >
                            <span className={`w-2 h-2 rounded-full block ${template.isActive ? "bg-emerald-500" : "bg-slate-300"}`} />
                          </button>
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

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <FileQuestion className="w-4 h-4 text-slate-400" />
                          <span>{template.sections.length} sections</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <MessageSquareText className="w-4 h-4 text-slate-400" />
                          <span>{template.questionCount} questions</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100">
                        <div className="flex flex-wrap gap-1.5">
                          {template.sections.slice(0, 3).map((section, idx) => (
                            <span
                              key={section.id}
                              className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded-md font-medium"
                            >
                              {idx + 1}. {section.title}
                            </span>
                          ))}
                          {template.sections.length > 3 && (
                            <span className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded-md">
                              +{template.sections.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <ManageDiscoveryTemplateDialog
        template={selectedTemplate}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchTemplates}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Delete Discovery Template
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{templateToDelete?.name}&rdquo;?
              Existing discovery responses using this template will not be affected.
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
