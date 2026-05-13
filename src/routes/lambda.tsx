import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listFunctions,
  invokeFunction,
  deleteFunction,
  type InvokeResult,
} from "@/lib/aws/lambda";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Zap,
  Play,
  Trash2,
  RefreshCw,
  Search,
  Clock,
  Cpu,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { JsonEditor } from "@/components/app/JsonEditor";
import { PageHeader, EmptyHint, Stat } from "./sqs";

export const Route = createFileRoute("/lambda")({
  head: () => ({ meta: [{ title: "Lambda — Localstash" }] }),
  component: LambdaPage,
});

function LambdaPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const fns = useQuery({
    queryKey: ["lambda", "list"],
    queryFn: listFunctions,
    refetchInterval: 8000,
  });

  const filtered = useMemo(
    () =>
      (fns.data ?? []).filter((f) =>
        (f.FunctionName ?? "").toLowerCase().includes(filter.toLowerCase())
      ),
    [fns.data, filter]
  );

  const active = filtered.find((f) => f.FunctionName === selectedName) ?? filtered[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lambda Functions"
        subtitle="Invoke functions and inspect responses, logs, and configuration."
        right={
          <Button
            variant="ghost"
            size="icon"
            onClick={() => qc.invalidateQueries({ queryKey: ["lambda"] })}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="glass">
          <CardHeader className="space-y-2 pb-3">
            <CardTitle className="text-sm font-medium">
              Functions{" "}
              <span className="ml-1 font-mono text-xs text-muted-foreground">
                {fns.data?.length ?? 0}
              </span>
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter…"
                className="h-8 pl-8 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {fns.isLoading && <Skeleton className="h-16 w-full" />}
            {!fns.isLoading && filtered.length === 0 && (
              <EmptyHint icon={Zap} text="No functions deployed." />
            )}
            <div className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
              {filtered.map((f) => {
                const isActive = (active?.FunctionName ?? "") === f.FunctionName;
                return (
                  <motion.button
                    key={f.FunctionName}
                    layout
                    onClick={() => setSelectedName(f.FunctionName!)}
                    className={
                      "flex w-full flex-col gap-0.5 rounded-md border px-2.5 py-2 text-left transition " +
                      (isActive
                        ? "border-primary/40 bg-primary/10"
                        : "border-transparent hover:border-border hover:bg-muted/40")
                    }
                  >
                    <div className="flex items-center gap-2">
                      <Zap
                        className={
                          "h-3.5 w-3.5 " +
                          (isActive ? "text-primary" : "text-muted-foreground")
                        }
                      />
                      <span className="flex-1 truncate font-mono text-xs">
                        {f.FunctionName}
                      </span>
                    </div>
                    <div className="flex gap-1 pl-6">
                      <Badge variant="outline" className="h-4 px-1 text-[9px]">
                        {f.Runtime ?? "?"}
                      </Badge>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {active ? (
          <FunctionDetail key={active.FunctionName} fn={active} />
        ) : (
          <Card className="glass">
            <CardContent className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              Select a function.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function FunctionDetail({
  fn,
}: {
  fn: Awaited<ReturnType<typeof listFunctions>>[number];
}) {
  const qc = useQueryClient();
  const [payload, setPayload] = useState('{\n  "key": "value"\n}');
  const [async_, setAsync] = useState(false);
  const [result, setResult] = useState<InvokeResult | null>(null);

  const invoke = useMutation({
    mutationFn: () =>
      invokeFunction(fn.FunctionName!, payload, async_ ? "Event" : "RequestResponse"),
    onSuccess: (r) => {
      setResult(r);
      if (r.functionError) toast.error(`Function error: ${r.functionError}`);
      else toast.success(`Invoked in ${r.durationMs}ms`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: () => deleteFunction(fn.FunctionName!),
    onSuccess: () => {
      toast.success("Function deleted");
      qc.invalidateQueries({ queryKey: ["lambda"] });
    },
  });

  let pretty = result?.payload ?? "";
  if (pretty) {
    try {
      pretty = JSON.stringify(JSON.parse(pretty), null, 2);
    } catch {
      /* */
    }
  }

  return (
    <Card className="glass">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="font-mono text-base">{fn.FunctionName}</CardTitle>
            <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
              {fn.FunctionArn}
            </p>
          </div>
          <Button variant="destructive" size="sm" onClick={() => del.mutate()}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat label="Runtime" value={fn.Runtime ?? "—"} />
          <Stat label="Memory" value={`${fn.MemorySize ?? 0} MB`} />
          <Stat label="Timeout" value={`${fn.Timeout ?? 0}s`} />
          <Stat label="Handler" value={fn.Handler ?? "—"} />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="invoke">
          <TabsList>
            <TabsTrigger value="invoke">Invoke</TabsTrigger>
            <TabsTrigger value="env">Environment</TabsTrigger>
          </TabsList>
          <TabsContent value="invoke" className="mt-4 space-y-4">
            <div>
              <Label className="text-xs">Payload (JSON)</Label>
              <JsonEditor value={payload} onChange={setPayload} height={180} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <Label className="text-xs">Async (Event)</Label>
                <p className="text-[11px] text-muted-foreground">
                  Fire-and-forget invocation; no response payload.
                </p>
              </div>
              <Switch checked={async_} onCheckedChange={setAsync} />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => invoke.mutate()} disabled={invoke.isPending}>
                <Play className="mr-1.5 h-3.5 w-3.5" />
                {invoke.isPending ? "Invoking…" : "Invoke"}
              </Button>
            </div>

            {result && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3 rounded-md border border-border bg-card/40 p-3"
              >
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {result.functionError ? (
                    <Badge variant="destructive">
                      <XCircle className="mr-1 h-3 w-3" /> {result.functionError}
                    </Badge>
                  ) : (
                    <Badge className="bg-success/20 text-success">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Status {result.statusCode}
                    </Badge>
                  )}
                  <span className="flex items-center gap-1 font-mono text-muted-foreground">
                    <Clock className="h-3 w-3" /> {result.durationMs}ms
                  </span>
                  <span className="flex items-center gap-1 font-mono text-muted-foreground">
                    <Cpu className="h-3 w-3" /> {fn.MemorySize}MB
                  </span>
                </div>
                <div>
                  <Label className="text-xs">Response</Label>
                  <JsonEditor value={pretty} readOnly height={180} />
                </div>
                {result.logTail && (
                  <div>
                    <Label className="text-xs">Log tail</Label>
                    <pre className="max-h-60 overflow-auto rounded-md border border-border bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                      {result.logTail}
                    </pre>
                  </div>
                )}
              </motion.div>
            )}
          </TabsContent>
          <TabsContent value="env" className="mt-4">
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-xs">
                <tbody>
                  {Object.entries(fn.Environment?.Variables ?? {}).map(([k, v]) => (
                    <tr key={k} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-mono text-muted-foreground">{k}</td>
                      <td className="px-3 py-2 font-mono break-all">{v}</td>
                    </tr>
                  ))}
                  {Object.keys(fn.Environment?.Variables ?? {}).length === 0 && (
                    <tr>
                      <td className="px-3 py-3 text-muted-foreground">
                        No environment variables.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
