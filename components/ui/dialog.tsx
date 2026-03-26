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

/** Shared header style for stacked dialog panels (cart, coupon, payment modals). */
export const dialogPanelHeaderClass =
  "flex items-center justify-between pl-16 sm:pl-5 pr-5 sm:pr-10 group-data-stacked:sm:pl-16 group-data-stacked:sm:pr-5 pt-7 pb-6 mb-2 shadow-[0_2px_4px_-1px_rgba(0,0,0,0.06)] shrink-0";

const backBtnClass =
  "absolute top-4 left-4 z-10 size-10 flex items-center justify-center rounded-full bg-white shadow-md text-foreground hover:bg-gray-50 transition-colors duration-200 cursor-pointer";

const closeBtnClass =
  "absolute top-4 right-4 z-10 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden cursor-pointer [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

function MobileBackButton({ onClick }: { onClick?: () => void }) {
  if (onClick) {
    return (
      <button onClick={onClick} className={cn(backBtnClass, "sm:hidden")}>
        <ChevronLeft className="size-5" />
        <span className="sr-only">Back</span>
      </button>
    );
  }
  return (
    <DialogPrimitive.Close asChild data-slot="dialog-close">
      <button className={cn(backBtnClass, "sm:hidden")}>
        <ChevronLeft className="size-5" />
        <span className="sr-only">Close</span>
      </button>
    </DialogPrimitive.Close>
  );
}

function DesktopButton({
  onBack,
  onCloseAll,
}: {
  onBack?: () => void;
  onCloseAll?: () => void;
}) {
  // Stacked: back arrow at top-left
  if (onBack) {
    return (
      <button onClick={onBack} className={cn(backBtnClass, "hidden sm:flex")}>
        <ChevronLeft className="size-5" />
        <span className="sr-only">Back</span>
      </button>
    );
  }
  // Single: X at top-right
  if (onCloseAll) {
    return (
      <button
        onClick={onCloseAll}
        className={cn(closeBtnClass, "hidden sm:flex")}
      >
        <XIcon />
        <span className="sr-only">Close</span>
      </button>
    );
  }
  return (
    <DialogPrimitive.Close asChild data-slot="dialog-close">
      <button className={cn(closeBtnClass, "hidden sm:flex")}>
        <XIcon />
        <span className="sr-only">Close</span>
      </button>
    </DialogPrimitive.Close>
  );
}

/**
 * DialogContent — responsive by default:
 * - Mobile: full-screen, no rounded corners
 * - Desktop (sm+): centered, rounded, max-width constrained
 *
 * Use `variant="default"` for standard centered dialogs (old behavior).
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
  variant?: "responsive" | "default";
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
          variant === "responsive"
            ? [
                // Mobile: full-screen
                "inset-0 flex flex-col bg-background px-6 pb-6",
                "pt-4",
                "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                // Desktop: centered, rounded, constrained
                "sm:inset-auto sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]",
                "sm:w-full sm:max-w-lg sm:max-h-[90vh] sm:rounded-2xl sm:border sm:shadow-xl",
                "data-[state=closed]:sm:zoom-out-95 data-[state=open]:sm:zoom-in-95",
              ]
            : [
                // Default: always centered (legacy behavior)
                "top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] grid w-full max-w-[calc(100%-2rem)] gap-4 rounded-lg border bg-background p-6 shadow-lg",
                "data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
                "sm:max-w-lg",
              ],
          className,
        )}
        {...props}
      >
        {showCloseButton && variant === "responsive" && (
          <>
            <MobileBackButton onClick={onBack ?? onCloseAll} />
            <DesktopButton onBack={onBack} onCloseAll={onCloseAll} />
          </>
        )}
        {showCloseButton && variant === "default" && (
          <DesktopButton onBack={onBack} onCloseAll={onCloseAll} />
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
        "flex flex-col gap-2 text-center sm:text-left",
        "min-h-16 justify-center mb-4 pb-4",
        "-mt-4 pt-7 -mx-6 px-6 pl-16 sm:pl-6 sm:pr-10",
        "shadow-[0_2px_4px_-1px_rgba(0,0,0,0.06)]",
        "group-data-stacked:sm:pl-16 group-data-stacked:sm:pr-6",
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
