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
      console.log("Starting upload for files:", files);
      setIsUploading(true);
      return files;
    },
    onClientUploadComplete: async (res) => {
      console.log("[Client] onClientUploadComplete called with:", res);

      try {
        if (!res || res.length === 0) {
          throw new Error("No files in response");
        }

        for (const file of res) {
          console.log("[Client] Processing file:", file);

          // Extract file properties from UploadThing response
          const fileName = file.name;
          const fileUrl = file.url;
          const fileSize = file.size;
          const fileType = file.type || "application/octet-stream";

          console.log("[Client] Saving to database:", { fileName, fileUrl, fileSize, fileType });

          const response = await fetch("/api/files", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId,
              name: fileName,
              fileUrl: fileUrl,
              fileSize: fileSize,
              fileType: fileType,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("[Client] API error:", errorText);
            throw new Error(`Failed to save file: ${errorText}`);
          }

          const result = await response.json();
          console.log("[Client] File saved successfully:", result);
        }

        toast.success(`${res.length} file${res.length > 1 ? 's' : ''} uploaded successfully`);
        setIsUploading(false);
        router.refresh();
      } catch (error) {
        console.error("[Client] Error:", error);
        toast.error(error instanceof Error ? error.message : "Failed to save files");
        setIsUploading(false);
      }
    },
    onUploadError: (error: Error) => {
      console.error("❌ UploadThing error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
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
