import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchHealth } from "@/lib/aws/health";
import { listQueues } from "@/lib/aws/sqs";
import { listBuckets } from "@/lib/aws/s3";
import { listFunctions } from "@/lib/aws/lambda";
import { listRules } from "@/lib/aws/events";
import { useConfig } from "@/store/config";
import {
  Boxes,
  Database,
  Zap,
  CalendarClock,
  Activity,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const endpoint = useConfig((s) => s.endpoint);
  const region = useConfig((s) => s.region);

  const health = useQuery({ queryKey: ["health", endpoint], queryFn: fetchHealth });
  const queues = useQuery({ queryKey: ["sqs", "list"], queryFn: listQueues, retry: false });
  const buckets = useQuery({ queryKey: ["s3", "buckets"], queryFn: listBuckets, retry: false });
  const fns = useQuery({ queryKey: ["lambda", "list"], queryFn: listFunctions, retry: false });
  const rules = useQuery({
    queryKey: ["events", "rules", "default"],
    queryFn: () => listRules(),
    retry: false,
  });

  const services = health.data?.services ?? {};
  const running = Object.entries(services).filter(([, v]) => v === "running" || v === "available");

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong relative overflow-hidden rounded-xl p-6"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-info/10" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Connected to
            </p>
            <h1 className="mt-1 font-mono text-2xl font-semibold">{endpoint}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Region <code className="font-mono">{region}</code> ·{" "}
              {health.data?.ok ? (
                <span className="text-success">Healthy ({health.data.latencyMs}ms)</span>
              ) : (
                <span className="text-destructive">
                  {health.data?.error ?? "Unreachable"}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-xs">
            {health.data?.edition && (
              <Badge variant="outline">edition: {health.data.edition}</Badge>
            )}
            {health.data?.version && (
              <Badge variant="outline">v{health.data.version}</Badge>
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ResourceTile
          to="/sqs"
          icon={Boxes}
          label="SQS Queues"
          count={queues.data?.length}
          loading={queues.isLoading}
        />
        <ResourceTile
          to="/s3"
          icon={Database}
          label="S3 Buckets"
          count={buckets.data?.length}
          loading={buckets.isLoading}
        />
        <ResourceTile
          to="/lambda"
          icon={Zap}
          label="Lambda Functions"
          count={fns.data?.length}
          loading={fns.isLoading}
        />
        <ResourceTile
          to="/events"
          icon={CalendarClock}
          label="EventBridge Rules"
          count={rules.data?.length}
          loading={rules.isLoading}
        />
      </div>

      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Activity className="h-4 w-4 text-primary" /> Service availability
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!health.data?.ok && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive-foreground">
              <p className="font-medium">Cannot reach LocalStack at {endpoint}.</p>
              <p className="mt-1 opacity-80">
                Make sure your container is running:{" "}
                <code className="font-mono">docker run -p 4566:4566 localstack/localstack</code>.
              </p>
            </div>
          )}
          {health.data?.ok && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {Object.entries(services).map(([name, status]) => {
                const ok = status === "running" || status === "available";
                return (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-md border border-border bg-card/40 px-3 py-2 text-xs"
                  >
                    <span className="font-mono">{name}</span>
                    <span
                      className={
                        "font-mono text-[10px] " +
                        (ok
                          ? "text-success"
                          : status === "disabled"
                          ? "text-muted-foreground"
                          : "text-warning")
                      }
                    >
                      {status}
                    </span>
                  </div>
                );
              })}
              {Object.keys(services).length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No service info reported. {running.length} services running.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ResourceTile({
  to,
  icon: Icon,
  label,
  count,
  loading,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number | undefined;
  loading: boolean;
}) {
  return (
    <Link to={to}>
      <motion.div
        whileHover={{ y: -2 }}
        className="glass group relative overflow-hidden rounded-xl p-4 transition hover:border-primary/40"
      >
        <div className="flex items-start justify-between">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
        </div>
        <p className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 font-mono text-2xl">
          {loading ? "…" : count ?? "—"}
        </p>
      </motion.div>
    </Link>
  );
}
