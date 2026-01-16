"use client";

import { useRouter } from "next/navigation";
import { UploadButton } from "@/lib/uploadthing";
import { toast } from "sonner";

export function FileUploader({ projectId }: { projectId: string }) {
  const router = useRouter();

  return (
    <UploadButton
      endpoint="projectFile"
      onClientUploadComplete={async (res) => {
        if (!res) return;

        for (const file of res) {
          await fetch("/api/files", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId,
              name: file.name,
              fileUrl: file.url,
              fileSize: file.size,
              fileType: file.type || "application/octet-stream",
            }),
          });
        }

        toast.success("Files uploaded!");
        router.refresh();
      }}
      onUploadError={(error) => {
        toast.error(`Upload failed: ${error.message}`);
      }}
    />
  );
}
