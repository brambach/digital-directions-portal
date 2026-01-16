"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadFiles } from "@/lib/uploadthing";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { toast } from "sonner";

export function FileUploader({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      const fileArray = Array.from(files);
      console.log("Uploading files:", fileArray.map(f => f.name));

      // Upload directly to UploadThing using our helper
      const uploadedFiles = await uploadFiles("projectFile", {
        files: fileArray,
      });

      console.log("Upload complete:", uploadedFiles);

      // Save each file to database
      for (const file of uploadedFiles) {
        const response = await fetch("/api/files", {
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

        if (!response.ok) {
          throw new Error(`Failed to save file: ${await response.text()}`);
        }
      }

      toast.success(`${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''} uploaded successfully`);
      router.refresh();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <label>
      <input
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />
      <Button
        type="button"
        disabled={isUploading}
        asChild
      >
        <span className="cursor-pointer">
          <Upload className="w-4 h-4" />
          {isUploading ? "Uploading..." : "Upload Files"}
        </span>
      </Button>
    </label>
  );
}
