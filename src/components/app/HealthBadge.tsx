import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "@/lib/aws/health";
import { useConfig } from "@/store/config";
import { cn } from "@/lib/utils";

export function HealthBadge({ compact = false }: { compact?: boolean }) {
  const endpoint = useConfig((s) => s.endpoint);
  const { data, isFetching } = useQuery({
    queryKey: ["health", endpoint],
    queryFn: fetchHealth,
    refetchInterval: 5000,
    staleTime: 0,
  });

  const ok = data?.ok;
  const dot = (
    <span className="relative flex h-2 w-2">
      {ok && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
      )}
      <span
        className={cn(
          "relative inline-flex h-2 w-2 rounded-full",
          ok === undefined ? "bg-muted-foreground" : ok ? "bg-success" : "bg-destructive"
        )}
      />
    </span>
  );

  if (compact) return dot;

  return (
    <div className="glass flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs">
      {dot}
      <div className="flex flex-1 flex-col leading-tight">
        <span className="font-medium">
          {ok === undefined ? "Connecting…" : ok ? "LocalStack online" : "Offline"}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {data ? `${data.latencyMs}ms` : isFetching ? "ping…" : endpoint.replace(/^https?:\/\//, "")}
        </span>
      </div>
    </div>
  );
}
