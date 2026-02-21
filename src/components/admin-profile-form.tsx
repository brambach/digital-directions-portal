"use client";

import { useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Camera, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

export function AdminProfileForm() {
  const { user, isLoaded } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");

  // Keep local state in sync once Clerk loads
  if (isLoaded && firstName === "" && lastName === "" && (user?.firstName || user?.lastName)) {
    setFirstName(user?.firstName || "");
    setLastName(user?.lastName || "");
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      await user.setProfileImage({ file });
      toast.success("Avatar updated");
    } catch {
      toast.error("Failed to update avatar");
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await user.update({ firstName, lastName });
      toast.success("Profile saved");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="p-6 space-y-5">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative group">
          <div className="h-16 w-16 rounded-2xl bg-gray-900 text-white flex items-center justify-center text-xl font-bold border-4 border-white shadow-lg overflow-hidden">
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span>{user?.firstName?.charAt(0) || "A"}</span>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
          >
            {uploadingAvatar ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Camera className="w-5 h-5 text-white" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{user?.fullName || "Admin User"}</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="text-xs text-violet-600 hover:text-violet-700 font-medium mt-0.5 disabled:opacity-50"
          >
            {uploadingAvatar ? "Uploading…" : "Change avatar"}
          </button>
        </div>
      </div>

      {/* Name fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">First Name</Label>
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="bg-gray-50 border-gray-200 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Name</Label>
          <Input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="bg-gray-50 border-gray-200 rounded-xl"
          />
        </div>
      </div>

      {/* Email (read-only) */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email Address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={user?.emailAddresses[0]?.emailAddress || ""}
            readOnly
            className="pl-9 bg-gray-100 border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
          />
        </div>
        <p className="text-[11px] text-gray-400">Email is managed through your Clerk account.</p>
      </div>

      {/* Save */}
      <div className="pt-1">
        <Button onClick={handleSave} disabled={saving} className="rounded-xl font-semibold">
          {saving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
          ) : (
            <><Check className="w-4 h-4 mr-2" />Save Profile</>
          )}
        </Button>
      </div>
    </div>
  );
}
