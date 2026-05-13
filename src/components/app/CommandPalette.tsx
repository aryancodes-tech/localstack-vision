import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Activity,
  Boxes,
  Database,
  Network,
  Settings,
  Zap,
  CalendarClock,
  RefreshCw,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (to: string) => {
    setOpen(false);
    navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search resources, jump to a service…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go("/")}>
            <Activity className="mr-2 h-4 w-4" /> Dashboard
          </CommandItem>
          <CommandItem onSelect={() => go("/sqs")}>
            <Boxes className="mr-2 h-4 w-4" /> SQS Queues
          </CommandItem>
          <CommandItem onSelect={() => go("/s3")}>
            <Database className="mr-2 h-4 w-4" /> S3 Buckets
          </CommandItem>
          <CommandItem onSelect={() => go("/lambda")}>
            <Zap className="mr-2 h-4 w-4" /> Lambda Functions
          </CommandItem>
          <CommandItem onSelect={() => go("/events")}>
            <CalendarClock className="mr-2 h-4 w-4" /> EventBridge
          </CommandItem>
          <CommandItem onSelect={() => go("/graph")}>
            <Network className="mr-2 h-4 w-4" /> Resource Graph
          </CommandItem>
          <CommandItem onSelect={() => go("/settings")}>
            <Settings className="mr-2 h-4 w-4" /> Settings
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              qc.invalidateQueries();
              setOpen(false);
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh all data
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
