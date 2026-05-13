import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listQueues,
  getQueueAttributes,
  createQueue,
  deleteQueue,
  purgeQueue,
  sendMessage,
  receiveMessages,
  peekMessages,
  deleteMessage,
} from "@/lib/aws/sqs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { JsonEditor } from "@/components/app/JsonEditor";
import {
  Boxes,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  Send,
  Inbox,
  AlertTriangle,
  Copy,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/sqs")({
  head: () => ({ meta: [{ title: "SQS Queues — Localstash" }] }),
  component: SqsPage,
});

function SqsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  const queues = useQuery({
    queryKey: ["sqs", "list"],
    queryFn: listQueues,
    refetchInterval: 5000,
  });

  const filtered = useMemo(() => {
    const q = (queues.data ?? []).filter((x) =>
      x.name.toLowerCase().includes(filter.toLowerCase())
    );
    return q;
  }, [queues.data, filter]);

  const selected = filtered.find((q) => q.url === selectedUrl) ?? filtered[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="SQS Queues"
        subtitle="Inspect and interact with Simple Queue Service emulation."
        right={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => qc.invalidateQueries({ queryKey: ["sqs"] })}
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <CreateQueueDialog />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card className="glass">
          <CardHeader className="space-y-2 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Queues{" "}
                <span className="ml-1 font-mono text-xs text-muted-foreground">
                  {queues.data?.length ?? 0}
                </span>
              </CardTitle>
            </div>
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
          <CardContent className="space-y-1 pb-3">
            {queues.isLoading && <Skeleton className="h-16 w-full" />}
            {!queues.isLoading && filtered.length === 0 && (
              <EmptyHint icon={Boxes} text="No queues yet." />
            )}
            <div className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {filtered.map((q) => {
                  const active = (selected?.url ?? "") === q.url;
                  return (
                    <motion.button
                      key={q.url}
                      layout
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setSelectedUrl(q.url)}
                      className={
                        "group flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left transition " +
                        (active
                          ? "border-primary/40 bg-primary/10"
                          : "border-transparent hover:border-border hover:bg-muted/40")
                      }
                    >
                      <Boxes
                        className={
                          "h-3.5 w-3.5 " +
                          (active ? "text-primary" : "text-muted-foreground")
                        }
                      />
                      <span className="flex-1 truncate font-mono text-xs">{q.name}</span>
                      {q.isFifo && (
                        <Badge variant="outline" className="h-4 px-1 text-[9px]">
                          FIFO
                        </Badge>
                      )}
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>

        <div>
          {selected ? (
            <QueueDetail key={selected.url} url={selected.url} name={selected.name} />
          ) : (
            <Card className="glass">
              <CardContent className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                Select a queue to inspect.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function QueueDetail({ url, name }: { url: string; name: string }) {
  const qc = useQueryClient();

  const attrs = useQuery({
    queryKey: ["sqs", "attrs", url],
    queryFn: () => getQueueAttributes(url),
    refetchInterval: 3000,
  });

  const peek = useQuery({
    queryKey: ["sqs", "peek", url],
    queryFn: () => peekMessages(url),
    refetchInterval: 4000,
    retry: false,
  });

  const purge = useMutation({
    mutationFn: () => purgeQueue(url),
    onSuccess: () => {
      toast.success("Queue purged");
      qc.invalidateQueries({ queryKey: ["sqs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: () => deleteQueue(url),
    onSuccess: () => {
      toast.success("Queue deleted");
      qc.invalidateQueries({ queryKey: ["sqs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const a = attrs.data ?? {};
  const visible = Number(a.ApproximateNumberOfMessages ?? 0);
  const inFlight = Number(a.ApproximateNumberOfMessagesNotVisible ?? 0);
  const delayed = Number(a.ApproximateNumberOfMessagesDelayed ?? 0);

  return (
    <Card className="glass">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="truncate font-mono text-base">{name}</CardTitle>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => {
                  navigator.clipboard.writeText(url);
                  toast.success("URL copied");
                }}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{url}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => purge.mutate()}>
              <AlertTriangle className="mr-1.5 h-3.5 w-3.5" /> Purge
            </Button>
            <Button variant="destructive" size="sm" onClick={() => del.mutate()}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat label="Visible" value={visible} accent="primary" />
          <Stat label="In flight" value={inFlight} accent="warning" />
          <Stat label="Delayed" value={delayed} />
          <Stat
            label="Visibility timeout"
            value={`${a.VisibilityTimeout ?? "—"}s`}
          />
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="messages">
          <TabsList>
            <TabsTrigger value="messages">
              <Inbox className="mr-1.5 h-3.5 w-3.5" /> Messages
            </TabsTrigger>
            <TabsTrigger value="send">
              <Send className="mr-1.5 h-3.5 w-3.5" /> Send
            </TabsTrigger>
            <TabsTrigger value="receive">
              <Eye className="mr-1.5 h-3.5 w-3.5" /> Receive
            </TabsTrigger>
            <TabsTrigger value="attrs">Attributes</TabsTrigger>
          </TabsList>

          <TabsContent value="messages" className="mt-4">
            {peek.isError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive-foreground">
                Peek endpoint unavailable. LocalStack must be running and the
                <code className="mx-1 font-mono">/_aws/sqs/messages</code>
                debug endpoint must be reachable.
              </div>
            )}
            <PeekList messages={peek.data ?? []} loading={peek.isLoading} />
          </TabsContent>

          <TabsContent value="send" className="mt-4">
            <SendForm url={url} isFifo={name.endsWith(".fifo")} />
          </TabsContent>

          <TabsContent value="receive" className="mt-4">
            <ReceiveTab url={url} />
          </TabsContent>

          <TabsContent value="attrs" className="mt-4">
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-xs">
                <tbody>
                  {Object.entries(a).map(([k, v]) => (
                    <tr key={k} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-mono text-muted-foreground">{k}</td>
                      <td className="px-3 py-2 font-mono break-all">{v as string}</td>
                    </tr>
                  ))}
                  {Object.keys(a).length === 0 && (
                    <tr>
                      <td className="px-3 py-3 text-muted-foreground">No attributes.</td>
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

function PeekList({
  messages,
  loading,
}: {
  messages: { MessageId: string; Body: string; Attributes?: Record<string, string> }[];
  loading: boolean;
}) {
  if (loading) return <Skeleton className="h-32 w-full" />;
  if (messages.length === 0)
    return <EmptyHint icon={Inbox} text="Queue is empty (or all messages are in flight)." />;

  return (
    <div className="space-y-2">
      {messages.map((m) => (
        <MessageCard key={m.MessageId} m={m} />
      ))}
    </div>
  );
}

function MessageCard({
  m,
}: {
  m: { MessageId: string; Body: string; Attributes?: Record<string, string> };
}) {
  const [open, setOpen] = useState(false);
  let pretty = m.Body;
  try {
    pretty = JSON.stringify(JSON.parse(m.Body), null, 2);
  } catch {
    /* not JSON */
  }
  const sentAt = m.Attributes?.SentTimestamp
    ? new Date(Number(m.Attributes.SentTimestamp)).toLocaleString()
    : "—";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-md border border-border bg-card/50"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted/40"
      >
        <Inbox className="h-3.5 w-3.5 text-primary" />
        <span className="truncate font-mono">{m.MessageId}</span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">{sentAt}</span>
        <Badge variant="outline" className="h-4 px-1 text-[9px]">
          recv {m.Attributes?.ApproximateReceiveCount ?? "0"}
        </Badge>
      </button>
      {open && (
        <div className="border-t border-border bg-background/40 p-3">
          <JsonEditor value={pretty} readOnly height={180} />
        </div>
      )}
    </motion.div>
  );
}

function SendForm({ url, isFifo }: { url: string; isFifo: boolean }) {
  const qc = useQueryClient();
  const [body, setBody] = useState('{\n  "hello": "world"\n}');
  const [groupId, setGroupId] = useState("default");
  const [dedupId, setDedupId] = useState("");

  const send = useMutation({
    mutationFn: () =>
      sendMessage({
        url,
        body,
        messageGroupId: isFifo ? groupId || "default" : undefined,
        messageDeduplicationId: isFifo ? dedupId || String(Date.now()) : undefined,
      }),
    onSuccess: () => {
      toast.success("Message sent");
      qc.invalidateQueries({ queryKey: ["sqs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <JsonEditor value={body} onChange={setBody} height={220} />
      {isFifo && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Message group id</Label>
            <Input value={groupId} onChange={(e) => setGroupId(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Deduplication id</Label>
            <Input
              value={dedupId}
              onChange={(e) => setDedupId(e.target.value)}
              placeholder="auto"
            />
          </div>
        </div>
      )}
      <div className="flex justify-end">
        <Button onClick={() => send.mutate()} disabled={send.isPending}>
          <Send className="mr-1.5 h-3.5 w-3.5" />
          {send.isPending ? "Sending…" : "Send message"}
        </Button>
      </div>
    </div>
  );
}

function ReceiveTab({ url }: { url: string }) {
  const qc = useQueryClient();
  const [msgs, setMsgs] = useState<Awaited<ReturnType<typeof receiveMessages>>>([]);
  const recv = useMutation({
    mutationFn: () => receiveMessages(url, 10),
    onSuccess: (data) => {
      setMsgs(data);
      if (data.length === 0) toast.info("No messages available");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (handle: string) => deleteMessage(url, handle),
    onSuccess: () => {
      toast.success("Message deleted");
      setMsgs((prev) => prev.filter((m) => m.ReceiptHandle !== del.variables));
      qc.invalidateQueries({ queryKey: ["sqs"] });
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Consumes messages with a 1s visibility timeout. Use Delete to remove permanently.
        </p>
        <Button size="sm" onClick={() => recv.mutate()} disabled={recv.isPending}>
          <Inbox className="mr-1.5 h-3.5 w-3.5" /> Receive
        </Button>
      </div>
      {msgs.length === 0 && <EmptyHint icon={Inbox} text="No messages received yet." />}
      <div className="space-y-2">
        {msgs.map((m) => {
          let pretty = m.Body ?? "";
          try {
            pretty = JSON.stringify(JSON.parse(m.Body ?? ""), null, 2);
          } catch {
            /* */
          }
          return (
            <div
              key={m.MessageId}
              className="space-y-2 rounded-md border border-border bg-card/50 p-3"
            >
              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono">{m.MessageId}</span>
                <Button
                  size="sm"
                  variant="destructive"
                  className="ml-auto h-7"
                  onClick={() => del.mutate(m.ReceiptHandle!)}
                >
                  <Trash2 className="mr-1.5 h-3 w-3" /> Delete
                </Button>
              </div>
              <JsonEditor value={pretty} readOnly height={140} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CreateQueueDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [fifo, setFifo] = useState(false);
  const [vt, setVt] = useState(30);
  const [delay, setDelay] = useState(0);
  const [retention, setRetention] = useState(345600);

  const create = useMutation({
    mutationFn: () =>
      createQueue({
        name,
        fifo,
        contentBasedDeduplication: fifo,
        visibilityTimeout: vt,
        delaySeconds: delay,
        messageRetentionPeriod: retention,
      }),
    onSuccess: () => {
      toast.success("Queue created");
      qc.invalidateQueries({ queryKey: ["sqs"] });
      setOpen(false);
      setName("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> New queue
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-strong">
        <DialogHeader>
          <DialogTitle>Create queue</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-queue" />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <Label className="text-xs">FIFO queue</Label>
              <p className="text-[11px] text-muted-foreground">
                Adds <code>.fifo</code> suffix and content-based dedup.
              </p>
            </div>
            <Switch checked={fifo} onCheckedChange={setFifo} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Visibility (s)</Label>
              <Input
                type="number"
                value={vt}
                onChange={(e) => setVt(Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-xs">Delay (s)</Label>
              <Input
                type="number"
                value={delay}
                onChange={(e) => setDelay(Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-xs">Retention (s)</Label>
              <Input
                type="number"
                value={retention}
                onChange={(e) => setRetention(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => create.mutate()} disabled={!name || create.isPending}>
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- shared ---------- */

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: "primary" | "warning" | "success";
}) {
  const color =
    accent === "primary"
      ? "text-primary"
      : accent === "warning"
      ? "text-warning"
      : accent === "success"
      ? "text-success"
      : "text-foreground";
  return (
    <div className="rounded-md border border-border bg-card/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-0.5 font-mono text-xl ${color}`}>{value}</p>
    </div>
  );
}

export function EmptyHint({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-card/20 p-6 text-center">
      <Icon className="h-6 w-6 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  );
}

// Avoid "imported but not used" — we re-export Link/useRouterState only if needed elsewhere.
export const __unused = { Link, useRouterState };
