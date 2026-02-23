"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plug, X, Eye, EyeOff } from "lucide-react";

interface ApiCredentialsDialogProps {
  side: "hibob" | "payroll";
  onSubmit: (credentials: Record<string, string>, saveForLater: boolean) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ApiCredentialsDialog({
  side,
  onSubmit,
  onCancel,
  loading = false,
}: ApiCredentialsDialogProps) {
  const isHiBob = side === "hibob";

  const [field1, setField1] = useState("");
  const [field2, setField2] = useState("");
  const [saveForLater, setSaveForLater] = useState(true);
  const [showSecret, setShowSecret] = useState(false);

  const field1Label = isHiBob ? "Service User ID (email)" : "Business ID";
  const field1Placeholder = isHiBob ? "service-user@company.com" : "e.g. 12345";
  const field2Label = isHiBob ? "API Token" : "API Key";

  const isValid = field1.trim() && field2.trim();

  const handleSubmit = () => {
    if (!isValid) return;
    if (isHiBob) {
      onSubmit(
        { serviceUserId: field1.trim(), serviceUserToken: field2.trim() },
        saveForLater
      );
    } else {
      onSubmit(
        { apiKey: field2.trim(), businessId: field1.trim() },
        saveForLater
      );
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plug className="w-4 h-4 text-[#7C1CFF]" />
          <h4 className="text-sm font-semibold text-slate-800">
            {isHiBob ? "HiBob" : "KeyPay"} API Credentials
          </h4>
        </div>
        <button
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-slate-500">
        {isHiBob
          ? "Enter the HiBob service user credentials. These are used server-side only and never exposed to the browser."
          : "Enter the KeyPay (Employment Hero) API credentials. These are used server-side only and never exposed to the browser."}
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">
            {field1Label}
          </label>
          <Input
            value={field1}
            onChange={(e) => setField1(e.target.value)}
            placeholder={field1Placeholder}
            className="bg-white border-slate-200 rounded-xl text-sm"
            disabled={loading}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">
            {field2Label}
          </label>
          <div className="relative">
            <Input
              value={field2}
              onChange={(e) => setField2(e.target.value)}
              type={showSecret ? "text" : "password"}
              placeholder="Enter API token..."
              className="bg-white border-slate-200 rounded-xl text-sm pr-10"
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={saveForLater}
          onChange={(e) => setSaveForLater(e.target.checked)}
          className="rounded border-slate-300 text-[#7C1CFF] focus:ring-[#7C1CFF]"
          disabled={loading}
        />
        <span className="text-xs text-slate-600">Save credentials for this project</span>
      </label>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={loading}
          className="rounded-full"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className="rounded-full"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Plug className="w-4 h-4 mr-2" />
          )}
          Pull Values
        </Button>
      </div>
    </div>
  );
}
