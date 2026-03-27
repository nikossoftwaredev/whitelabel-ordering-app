"use client";

import { ChevronLeft, XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  );
}

// Theme-agnostic pill button — no border, foreground-tinted bg
const navBtn =
  "absolute z-10 size-9 flex items-center justify-center rounded-full bg-foreground/10 hover:bg-foreground/[0.16] text-foreground transition-colors duration-300 cursor-pointer";

function CloseButton({ onClick }: { onClick?: () => void }) {
  const cls = cn(navBtn, "top-3.5 right-3.5");
  if (onClick) {
    return (
      <button onClick={onClick} className={cls}>
        <XIcon className="size-4" />
        <span className="sr-only">Close</span>
      </button>
    );
  }
  return (
    <DialogPrimitive.Close asChild data-slot="dialog-close">
      <button className={cls}>
        <XIcon className="size-4" />
        <span className="sr-only">Close</span>
      </button>
    </DialogPrimitive.Close>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn(navBtn, "top-3.5 left-3.5")}>
      <ChevronLeft className="size-4.5" />
      <span className="sr-only">Back</span>
    </button>
  );
}

/**
 * DialogContent — three variants:
 *
 * "responsive" (default): full-screen on mobile, centered+rounded on desktop.
 *   - X always visible (top-right, both mobile & desktop).
 *   - Back arrow (top-left) ONLY when onBack is provided (stacked state).
 *
 * "compact": auto-height centered dialog (confirm / alert). No nav buttons.
 *
 * "default": legacy centered dialog, kept for backward compat.
 */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  variant = "responsive",
  onBack,
  onCloseAll,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
  variant?: "responsive" | "default" | "compact";
  onBack?: () => void;
  onCloseAll?: () => void;
}) {
  const isStacked = !!onBack;

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        data-stacked={isStacked ? "" : undefined}
        className={cn(
          "group fixed z-50 outline-none duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in",

          variant === "responsive" && [
            // Mobile: full-screen sheet
            "inset-0 flex flex-col bg-background",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            // Desktop: centered card — wider + taller than before
            "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
            "sm:w-full sm:max-w-xl sm:h-[min(700px,88vh)]",
            "sm:rounded-2xl sm:shadow-2xl sm:overflow-hidden sm:flex sm:flex-col",
            "data-[state=closed]:sm:zoom-out-95 data-[state=open]:sm:zoom-in-95",
          ],

          variant === "compact" && [
            "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            "w-[calc(100%-2rem)] max-w-sm",
            "rounded-2xl border bg-background p-6 shadow-2xl",
            "data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          ],

          variant === "default" && [
            "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            "grid w-full max-w-[calc(100%-2rem)] gap-4 rounded-xl border bg-background p-6 shadow-lg",
            "data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "sm:max-w-lg",
          ],

          className,
        )}
        {...props}
      >
        {/* Navigation buttons for responsive variant */}
        {showCloseButton && variant === "responsive" && (
          <>
            <CloseButton onClick={onCloseAll} />
            {isStacked && <BackButton onClick={onBack!} />}
          </>
        )}
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

/**
 * DialogHeader — sticky title bar.
 * Padding accounts for nav buttons: X is always on the right (pr-14),
 * back arrow only when stacked (group-data-[stacked]:pl-14).
 */
function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "flex flex-col gap-1 text-center sm:text-left shrink-0",
        "min-h-14 justify-center",
        // Right clears X button; left is normal unless stacked (back arrow)
        "pt-5 pb-4 pl-6 pr-14",
        "group-data-stacked:pl-14",
        "shadow-[0_1px_0_0_hsl(var(--border))]",
        className,
      )}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & { showCloseButton?: boolean }) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <button className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors duration-300">
            Close
          </button>
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
