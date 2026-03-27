"use client";

import { ChevronLeft, XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import * as React from "react";

import { Button } from "@/components/ui/button";
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

const navBtnBase =
  "absolute z-10 size-9 flex items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm hover:bg-muted transition-colors duration-200 cursor-pointer";

const backBtnClass = `${navBtnBase} top-3.5 left-3.5`;
const closeBtnClass = `${navBtnBase} top-3.5 right-3.5`;

function MobileBackButton({ onClick }: { onClick?: () => void }) {
  if (onClick) {
    return (
      <button onClick={onClick} className={cn(backBtnClass, "sm:hidden")}>
        <ChevronLeft className="size-4" />
        <span className="sr-only">Back</span>
      </button>
    );
  }
  return (
    <DialogPrimitive.Close asChild data-slot="dialog-close">
      <button className={cn(backBtnClass, "sm:hidden")}>
        <ChevronLeft className="size-4" />
        <span className="sr-only">Close</span>
      </button>
    </DialogPrimitive.Close>
  );
}

function DesktopButtons({
  onBack,
  onCloseAll,
}: {
  onBack?: () => void;
  onCloseAll?: () => void;
}) {
  return (
    <>
      {/* Back arrow — only when stacked */}
      {onBack && (
        <button onClick={onBack} className={cn(backBtnClass, "hidden sm:flex")}>
          <ChevronLeft className="size-4" />
          <span className="sr-only">Back</span>
        </button>
      )}
      {/* X close — always on desktop */}
      {onCloseAll && (
        <button
          onClick={onCloseAll}
          className={cn(closeBtnClass, "hidden sm:flex")}
        >
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </button>
      )}
      {!onCloseAll && !onBack && (
        <DialogPrimitive.Close asChild data-slot="dialog-close">
          <button className={cn(closeBtnClass, "hidden sm:flex")}>
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </button>
        </DialogPrimitive.Close>
      )}
    </>
  );
}

const variantClasses = {
  responsive: [
    // Mobile: full-screen
    "inset-0 flex flex-col bg-background px-6 pb-6",
    "pt-4",
    "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
    // Desktop: centered, rounded, constrained
    "sm:inset-auto sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]",
    "sm:w-full sm:max-w-lg sm:h-[min(600px,85vh)] sm:rounded-2xl sm:shadow-xl sm:overflow-hidden",
    "data-[state=closed]:sm:zoom-out-95 data-[state=open]:sm:zoom-in-95",
  ],
  compact: [
    // Compact: centered, auto-height, small width (for confirms/alerts)
    "top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]",
    "w-[calc(100%-2rem)] max-w-sm",
    "rounded-lg border bg-background p-6 shadow-lg",
    "data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
    "data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
  ],
  default: [
    // Default: always centered (legacy behavior)
    "top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] grid w-full max-w-[calc(100%-2rem)] gap-4 rounded-lg border bg-background p-6 shadow-lg",
    "data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
    "sm:max-w-lg",
  ],
};

/**
 * DialogContent — responsive by default:
 * - Mobile: full-screen, no rounded corners
 * - Desktop (sm+): centered, rounded, max-width constrained
 *
 * Use `variant="default"` for standard centered dialogs (old behavior).
 * Use `variant="compact"` for small auto-height dialogs (confirms/alerts).
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
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        data-stacked={onBack ? "" : undefined}
        className={cn(
          "group",
          "fixed z-50 outline-none duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in",
          variantClasses[variant],
          className,
        )}
        {...props}
      >
        {showCloseButton && variant === "responsive" && (
          <>
            <MobileBackButton onClick={onBack ?? onCloseAll} />
            <DesktopButtons onBack={onBack} onCloseAll={onCloseAll} />
          </>
        )}
        {showCloseButton && variant === "default" && (
          <DesktopButtons onBack={onBack} onCloseAll={onCloseAll} />
        )}
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "flex flex-col gap-1 text-center sm:text-left shrink-0",
        "min-h-14 justify-center",
        // Padding: clear back-btn (left) on mobile, clear X (right) on desktop
        "pt-5 pb-4 pl-14 pr-6",
        "sm:pl-6 sm:pr-14",
        // When stacked on desktop, also clear back-btn on left
        "group-data-stacked:sm:pl-14",
        "shadow-[0_2px_4px_-1px_rgba(0,0,0,0.06)]",
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
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean;
}) {
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
          <Button variant="outline">Close</Button>
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
