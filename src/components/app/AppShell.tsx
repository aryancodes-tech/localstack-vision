import { type ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { CommandPalette } from "./CommandPalette";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Command } from "lucide-react";
import { HealthBadge } from "./HealthBadge";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-xl">
            <SidebarTrigger />
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-2 text-xs text-muted-foreground"
                onClick={() => {
                  const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true });
                  window.dispatchEvent(ev);
                }}
              >
                <Command className="h-3.5 w-3.5" />
                Search
                <kbd className="ml-2 hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] sm:inline-block">
                  ⌘K
                </kbd>
              </Button>
              <div className="hidden md:block">
                <HealthBadge />
              </div>
            </div>
          </header>
          <main className="grid-bg flex-1">
            <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-8">{children}</div>
          </main>
        </div>
      </div>
      <CommandPalette />
      <Toaster richColors position="bottom-right" />
    </SidebarProvider>
  );
}
