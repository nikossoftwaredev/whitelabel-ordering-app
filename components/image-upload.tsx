"use client";

import { Check, Loader2, Upload, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Area } from "react-easy-crop";
import Cropper from "react-easy-crop";

import { CONFIRM_DIALOG } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { MAX_IMAGE_FILE_SIZE, type ImageType } from "@/lib/files/constants";
import { cn } from "@/lib/general/utils";
import { useDialogStore } from "@/lib/stores/dialog-store";

// Track which ImageUpload instance is currently active for paste
let activeUploadId: string | null = null;

/** Extract the cropped region from an image using canvas */
async function getCroppedBlob(
  imageSrc: string,
  cropPixels: Area,
): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = cropPixels.width;
  canvas.height = cropPixels.height;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    cropPixels.width,
    cropPixels.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Canvas export failed")),
      "image/png",
    );
  });
}

/** Compute preview CSS classes from a numeric aspect ratio */
function getPreviewDimensions(ratio: number): string {
  if (ratio >= 1.7) return "h-24 w-[10.67rem]"; // ~16:9
  if (ratio >= 1.2) return "h-24 w-32"; // ~4:3
  return "h-24 w-24"; // ~1:1
}

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string) => void;
  onRemove?: () => void;
  /** Tenant-scoped upload endpoint, e.g. `/api/admin/{tenantId}/upload` */
  uploadUrl: string;
  className?: string;
  disabled?: boolean;
  /** Image type for storage path routing */
  imageType?: ImageType;
  /** Fixed aspect ratio for the crop frame (default: 1 = square) */
  aspectRatio?: number;
}

export const ImageUpload = ({
  value,
  onChange,
  onRemove,
  uploadUrl,
  className,
  disabled,
  imageType,
  aspectRatio = 1,
}: ImageUploadProps) => {
  const openDialog = useDialogStore((s) => s.openDialog);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const instanceId = useId();

  // Crop state
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Clean up object URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (pendingImage) URL.revokeObjectURL(pendingImage);
    };
  }, [pendingImage]);

  const dimensions = getPreviewDimensions(aspectRatio);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleFileSelected = useCallback((file: File) => {
    setError(null);

    if (file.size > MAX_IMAGE_FILE_SIZE) {
      setError("File too large. Maximum size is 10MB.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPendingImage(objectUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, []);

  const handleCancelCrop = () => {
    if (pendingImage) URL.revokeObjectURL(pendingImage);
    setPendingImage(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleConfirmCrop = async () => {
    if (!pendingImage || !croppedAreaPixels) return;

    setIsUploading(true);
    setError(null);

    try {
      const croppedBlob = await getCroppedBlob(pendingImage, croppedAreaPixels);
      const croppedFile = new File([croppedBlob], "cropped.png", {
        type: "image/png",
      });

      const formData = new FormData();
      formData.append("file", croppedFile);
      if (imageType) formData.append("type", imageType);

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
      if (pendingImage) URL.revokeObjectURL(pendingImage);
      setPendingImage(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFileSelected(file);
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (
        activeUploadId !== instanceId ||
        disabled ||
        isUploading ||
        value ||
        pendingImage
      )
        return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) handleFileSelected(file);
          return;
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [
    instanceId,
    disabled,
    isUploading,
    value,
    pendingImage,
    handleFileSelected,
  ]);

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
    setIsDeleting(true);
    try {
      if (value) {
        await fetch(uploadUrl, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: value }),
        });
      }
    } catch {
      // Ignore errors for external URLs that aren't in our storage
    } finally {
      setIsDeleting(false);
    }
    onChange("");
    onRemove?.();
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn("space-y-2", className)}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
        onChange={handleFileSelect}
        disabled={disabled || isUploading || !!pendingImage}
        className="hidden"
      />

      {/* State 1: Uploaded — show thumbnail with delete */}
      {value && !pendingImage && (
        <div className="relative inline-block">
          <img
            src={value}
            alt="Uploaded"
            className={cn(
              dimensions,
              "rounded-lg object-cover border",
              isDeleting && "opacity-50",
            )}
          />
          {isDeleting ? (
            <div
              className={cn(
                dimensions,
                "absolute inset-0 flex items-center justify-center",
              )}
            >
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6"
              onClick={() =>
                openDialog(
                  CONFIRM_DIALOG,
                  {
                    title: "Remove image?",
                    description: "This will delete the uploaded image.",
                    actionLabel: "Remove",
                  },
                  handleRemove,
                )
              }
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      {/* State 2: Cropping — show crop UI with zoom slider */}
      {pendingImage && (
        <div className="space-y-3">
          <div className="relative w-full" style={{ aspectRatio }}>
            <Cropper
              image={pendingImage}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground shrink-0">Zoom</span>
            <Slider
              value={[zoom]}
              onValueChange={([v]) => setZoom(v)}
              min={1}
              max={3}
              step={0.05}
              className="flex-1"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancelCrop}
              disabled={isUploading}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmCrop}
              disabled={isUploading || !croppedAreaPixels}
              className="cursor-pointer"
            >
              {isUploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>
      )}

      {/* State 3: Empty — click/paste to select */}
      {!value && !pendingImage && (
        <div
          onClick={() => inputRef.current?.click()}
          className={cn(
            dimensions,
            "flex flex-col items-center justify-center gap-2 rounded-md border border-dashed cursor-pointer transition-colors",
            "hover:bg-muted/50 hover:border-primary/50",
            isActive && "border-primary ring-2 ring-primary/20",
            (disabled || isUploading) && "opacity-50 cursor-not-allowed",
          )}
        >
          <Upload className="h-6 w-6 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {isActive ? "Ctrl+V" : "Upload"}
          </span>
          <span className="text-[10px] text-muted-foreground/60">Max 10MB</span>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};
