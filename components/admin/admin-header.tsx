"use client";

import { Volume2, VolumeX } from "lucide-react";

import { ThemeSwitcher } from "@/components/examples/ThemeSwitcher";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSoundSettings } from "@/hooks/use-notification-sound";

export const AdminHeader = () => {
  const muted = useSoundSettings((s) => s.muted);
  const toggleMute = useSoundSettings((s) => s.toggleMute);

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b">
      <div className="flex h-full w-full items-center gap-3 p-4 sm:gap-4">
        <SidebarTrigger className="max-md:scale-125" />
        <Separator orientation="vertical" className="h-6" />
        <div className="flex-1" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="cursor-pointer"
            >
              {muted ? (
                <VolumeX className="size-4" />
              ) : (
                <Volume2 className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {muted ? "Unmute notifications" : "Mute notifications"}
          </TooltipContent>
        </Tooltip>
        <ThemeSwitcher />
      </div>
    </header>
  );
};
