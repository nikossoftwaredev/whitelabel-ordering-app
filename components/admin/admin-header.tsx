"use client";

import { Bell, BellOff, Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserAvatarMenu } from "@/components/user-avatar-menu";
import { useSoundSettings } from "@/hooks/use-notification-sound";
import { usePushSubscription } from "@/hooks/use-push-subscription";

export const AdminHeader = () => {
  const muted = useSoundSettings((s) => s.muted);
  const toggleMute = useSoundSettings((s) => s.toggleMute);
  const {
    isSupported: pushSupported,
    isSubscribed,
    subscribe,
    unsubscribe,
  } = usePushSubscription("admin");

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b">
      <div className="flex h-full w-full items-center gap-3 p-4 sm:gap-4">
        <SidebarTrigger className="max-md:scale-125" />
        <Separator orientation="vertical" className="h-6" />
        <div className="flex-1" />

        {/* Sound toggle */}
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

        {/* Push notification toggle */}
        {pushSupported && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => (isSubscribed ? unsubscribe() : subscribe())}
                className={
                  isSubscribed ? "cursor-pointer" : "cursor-pointer text-muted-foreground"
                }
              >
                {isSubscribed ? (
                  <Bell className="size-4" />
                ) : (
                  <BellOff className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isSubscribed
                ? "Push notifications on"
                : "Enable push notifications"}
            </TooltipContent>
          </Tooltip>
        )}

        <UserAvatarMenu />
      </div>
    </header>
  );
};
