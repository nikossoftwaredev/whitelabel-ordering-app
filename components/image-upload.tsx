"use client";

import { Loader2, Upload, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/general/utils";

// Track which ImageUpload instance is currently active for paste
let activeUploadId: string | null = null;

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  /** Tenant-scoped upload endpoint, e.g. `/api/admin/{tenantId}/upload` */
  uploadUrl: string;
  className?: string;
  disabled?: boolean;
}

export const ImageUpload = ({
  value,
  onChange,
  onRemove,
  uploadUrl,
  className,
  disabled,
}: ImageUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const instanceId = useId();

  const uploadFile = async (file: File) => {
    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");

      onChange(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (activeUploadId !== instanceId || disabled || isUploading || value)
        return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) await uploadFile(file);
          return;
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId, disabled, isUploading, value]);

  const handleMouseEnter = () => {
    activeUploadId = instanceId;
    setIsActive(true);
  };

  const handleMouseLeave = () => {
    if (activeUploadId === instanceId) {
      setIsActive(false);
    }
  };

  const handleRemove = async () => {
    if (value) {
      try {
        await fetch(uploadUrl, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: value }),
        });
      } catch {
        // Best effort delete
      }
    }
    onChange("");
    onRemove?.();
  };

  return (
    <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
        className="hidden"
      />

      {value ? (
        <div className="relative inline-block">
          <img
            src={value}
            alt="Uploaded"
            className="h-24 w-24 rounded-lg object-cover border"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6"
            onClick={handleRemove}
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className={cn(
            "h-24 w-24 flex flex-col items-center justify-center gap-2 rounded-md border border-dashed cursor-pointer transition-colors",
            "hover:bg-muted/50 hover:border-primary/50",
            isActive && "border-primary ring-2 ring-primary/20",
            (disabled || isUploading) && "opacity-50 cursor-not-allowed"
          )}
        >
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {isActive ? "Ctrl+V" : "Upload"}
              </span>
            </>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};
