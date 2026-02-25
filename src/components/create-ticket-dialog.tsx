"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
}

interface Client {
  id: string;
  companyName: string;
}

interface CreateTicketDialogProps {
  projects?: Project[];
  clients?: Client[];
  defaultProjectId?: string;
  defaultClientId?: string;
  isAdmin?: boolean;
}

export function CreateTicketDialog({
  projects = [],
  clients = [],
  defaultProjectId,
  defaultClientId,
  isAdmin = false,
}: CreateTicketDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEscalation, setIsEscalation] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "general_support",
    priority: "medium",
    projectId: defaultProjectId || "",
    clientId: defaultClientId || "",
  });

  // Check for Digi chat escalation data
  useEffect(() => {
    const stored = sessionStorage.getItem("digi_escalation");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setFormData((prev) => ({
          ...prev,
          title: data.title || prev.title,
          description: data.description || prev.description,
          projectId: data.projectId || prev.projectId,
          type: "general_support",
        }));
        setIsEscalation(true);
        setOpen(true);
        sessionStorage.removeItem("digi_escalation");
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          type: formData.type,
          priority: formData.priority,
          projectId: formData.projectId && formData.projectId !== "none" ? formData.projectId : null,
          clientId: formData.clientId || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create ticket");
      }

      setFormData({
        title: "",
        description: "",
        type: "general_support",
        priority: "medium",
        projectId: defaultProjectId || "",
        clientId: defaultClientId || "",
      });
      setIsEscalation(false);
      setOpen(false);
      router.refresh();
      toast.success("Ticket created successfully");
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create ticket");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setIsEscalation(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant={isAdmin ? "default" : "outline"} className="rounded-full font-semibold">
          <Plus className="w-4 h-4 mr-1.5" />
          {isAdmin ? "New Ticket" : "Create Ticket"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-white border border-slate-200 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-slate-900">
            {isEscalation ? "Escalate to Support" : "Create Support Ticket"}
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            {isEscalation
              ? "Digi wasn\u2019t able to resolve this \u2014 a team member will follow up."
              : "Describe your issue or request and we\u2019ll get back to you as soon as possible."}
          </DialogDescription>
        </DialogHeader>

        {/* Escalation Banner */}
        {isEscalation && (
          <div className="flex items-center gap-3 p-3 bg-violet-50 border border-violet-100 rounded-xl mt-1">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-violet-800">Escalated from Digi chat</p>
              <p className="text-[11px] text-violet-600">The conversation summary has been included below.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              required
              placeholder="Brief summary of your issue"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              required
              placeholder="Please provide as much detail as possible about your issue or request..."
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general_support">General Support</SelectItem>
                  <SelectItem value="project_issue">Project Issue</SelectItem>
                  <SelectItem value="feature_request">Feature Request</SelectItem>
                  <SelectItem value="bug_report">Bug Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {projects.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="projectId">Related Project (Optional)</Label>
              <Select
                value={formData.projectId}
                onValueChange={(value) => setFormData({ ...formData, projectId: value })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isAdmin && clients.length > 0 && !formData.projectId && (
            <div className="space-y-2">
              <Label htmlFor="clientId">Client *</Label>
              <Select
                required
                value={formData.clientId}
                onValueChange={(value) => setFormData({ ...formData, clientId: value })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full"
              disabled={loading}
            >
              {loading ? "Creating..." : isEscalation ? "Submit to Support" : "Create Ticket"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
