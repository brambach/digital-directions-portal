"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUploadThing } from "@/lib/uploadthing";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { toast } from "sonner";

export function FileUploader({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);

  const { startUpload, isUploading: uploadThingLoading } = useUploadThing("projectFile", {
    onBeforeUploadBegin: (files) => {
      setIsUploading(true);
      return files;
    },
    onClientUploadComplete: async (res) => {
      // Save each uploaded file to the database
      try {
        for (const file of res) {
          const response = await fetch("/api/files", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId,
              name: file.name,
              fileUrl: file.url,
              fileSize: file.size,
              fileType: file.type,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to save file: ${errorText}`);
          }
        }

        router.refresh();
        setIsUploading(false);
        toast.success("Files uploaded successfully");
      } catch (error) {
        console.error("Error saving files:", error);
        toast.error("Files uploaded but failed to save to database. Please refresh the page.");
        setIsUploading(false);
      }
    },
    onUploadError: (error: Error) => {
      console.error("Upload error:", error.message);
      toast.error(`Upload failed: ${error.message}`);
      setIsUploading(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    startUpload(fileArray);
  };

  return (
    <label>
      <input
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading || uploadThingLoading}
      />
      <Button
        type="button"
        disabled={isUploading || uploadThingLoading}
        asChild
      >
        <span className="cursor-pointer">
          <Upload className="w-4 h-4" />
          {isUploading || uploadThingLoading ? "Uploading..." : "Upload Files"}
        </span>
      </Button>
    </label>
  );
}
