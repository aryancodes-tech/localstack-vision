import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listBuses, listRules, listTargets, putEvent } from "@/lib/aws/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  CalendarClock,
  Zap,
  Send,
  RefreshCw,
  ArrowRight,
  Boxes,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { JsonEditor } from "@/components/app/JsonEditor";
import { PageHeader, EmptyHint } from "./sqs";

export const Route = createFileRoute("/events")({
  head: () => ({ meta: [{ title: "EventBridge — Localstash" }] }),
  component: EventsPage,
});

function EventsPage() {
  const qc = useQueryClient();
  const [bus, setBus] = useState<string>("default");

  const buses = useQuery({ queryKey: ["events", "buses"], queryFn: listBuses });
  const rules = useQuery({
    queryKey: ["events", "rules", bus],
    queryFn: () => listRules(bus === "default" ? undefined : bus),
    refetchInterval: 8000,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="EventBridge"
        subtitle="Inspect rules, targets, and emit test events."
        right={
          <Button
            variant="ghost"
            size="icon"
            onClick={() => qc.invalidateQueries({ queryKey: ["events"] })}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        }
      />

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="emit">
            <Send className="mr-1.5 h-3.5 w-3.5" /> Put event
          </TabsTrigger>
          <TabsTrigger value="buses">Buses</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {(buses.data ?? []).map((b) => (
              <Button
                key={b.Name}
                size="sm"
                variant={bus === b.Name ? "default" : "outline"}
                onClick={() => setBus(b.Name!)}
              >
                {b.Name}
              </Button>
            ))}
            {!buses.data?.length && (
              <Button size="sm" variant="default">
                default
              </Button>
            )}
          </div>
          {rules.isLoading && <Skeleton className="h-32 w-full" />}
          {!rules.isLoading && (rules.data?.length ?? 0) === 0 && (
            <EmptyHint icon={CalendarClock} text="No rules on this bus." />
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {(rules.data ?? []).map((r) => (
              <RuleCard key={r.Arn} ruleName={r.Name!} bus={bus} rule={r} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="emit" className="mt-4">
          <PutEventForm bus={bus} />
        </TabsContent>

        <TabsContent value="buses" className="mt-4">
          <Card className="glass">
            <CardContent className="p-0">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">ARN</th>
                  </tr>
                </thead>
                <tbody>
                  {(buses.data ?? []).map((b) => (
                    <tr key={b.Arn} className="border-t border-border">
                      <td className="px-3 py-2 font-mono">{b.Name}</td>
                      <td className="px-3 py-2 font-mono break-all text-muted-foreground">
                        {b.Arn}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RuleCard({
  ruleName,
  bus,
  rule,
}: {
  ruleName: string;
  bus: string;
  rule: Awaited<ReturnType<typeof listRules>>[number];
}) {
  const targets = useQuery({
    queryKey: ["events", "targets", bus, ruleName],
    queryFn: () => listTargets(ruleName, bus === "default" ? undefined : bus),
  });
  const schedule = rule.ScheduleExpression;
  const enabled = rule.State === "ENABLED";
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="glass">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="font-mono text-sm">{ruleName}</CardTitle>
            <Badge
              variant={enabled ? "default" : "outline"}
              className={enabled ? "bg-success/20 text-success" : ""}
            >
              {rule.State}
            </Badge>
          </div>
          {rule.Description && (
            <p className="text-[11px] text-muted-foreground">{rule.Description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {schedule && (
            <div className="flex items-center gap-2">
              <CalendarClock className="h-3.5 w-3.5 text-info" />
              <code className="font-mono">{schedule}</code>
            </div>
          )}
          {rule.EventPattern && (
            <details>
              <summary className="cursor-pointer text-muted-foreground">Event pattern</summary>
              <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-black/40 p-2 font-mono text-[10px]">
                {prettyJson(rule.EventPattern)}
              </pre>
            </details>
          )}
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              Targets
            </p>
            {(targets.data ?? []).length === 0 && (
              <p className="text-muted-foreground">No targets.</p>
            )}
            <ul className="space-y-1">
              {(targets.data ?? []).map((t) => {
                const arn = t.Arn ?? "";
                const kind = arn.includes(":lambda:")
                  ? "lambda"
                  : arn.includes(":sqs:")
                  ? "sqs"
                  : arn.includes(":events:")
                  ? "bus"
                  : "other";
                const Icon = kind === "lambda" ? Zap : kind === "sqs" ? Boxes : CalendarClock;
                return (
                  <li
                    key={t.Id}
                    className="flex items-center gap-2 rounded-md border border-border bg-card/40 px-2 py-1.5"
                  >
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    <span className="truncate font-mono text-[11px]">{arn}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function PutEventForm({ bus }: { bus: string }) {
  const [source, setSource] = useState("custom.app");
  const [detailType, setDetailType] = useState("user.signup");
  const [detail, setDetail] = useState('{\n  "userId": "u_123"\n}');

  const send = useMutation({
    mutationFn: () =>
      putEvent({
        source,
        detailType,
        detail,
        busName: bus === "default" ? undefined : bus,
      }),
    onSuccess: () => toast.success("Event published"),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="glass">
      <CardContent className="space-y-4 pt-6">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Source</Label>
            <Input value={source} onChange={(e) => setSource(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Detail type</Label>
            <Input value={detailType} onChange={(e) => setDetailType(e.target.value)} />
          </div>
        </div>
        <div>
          <Label className="text-xs">Detail (JSON)</Label>
          <JsonEditor value={detail} onChange={setDetail} height={180} />
        </div>
        <div className="flex justify-end">
          <Button onClick={() => send.mutate()} disabled={send.isPending}>
            <Send className="mr-1.5 h-3.5 w-3.5" />
            {send.isPending ? "Publishing…" : "Put event"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function prettyJson(s: string) {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}
