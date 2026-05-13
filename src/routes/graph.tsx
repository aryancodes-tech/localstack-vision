import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { listFunctions } from "@/lib/aws/lambda";
import { listQueues } from "@/lib/aws/sqs";
import { listRules, listTargets } from "@/lib/aws/events";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "./sqs";

export const Route = createFileRoute("/graph")({
  head: () => ({ meta: [{ title: "Resource Graph — Localstash" }] }),
  component: GraphPage,
});

function GraphPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Resource Graph"
        subtitle="Visualize relationships between EventBridge rules, Lambda functions, and SQS queues."
      />
      <Card className="glass">
        <CardContent className="p-0">
          <div className="h-[70vh] w-full">
            <ClientOnly fallback={<Skeleton className="h-full w-full" />}>
              <Graph />
            </ClientOnly>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Graph() {
  const fns = useQuery({ queryKey: ["lambda", "list"], queryFn: listFunctions });
  const queues = useQuery({ queryKey: ["sqs", "list"], queryFn: listQueues });
  const rules = useQuery({ queryKey: ["events", "rules", "default"], queryFn: () => listRules() });

  const targetsByRule = useQuery({
    queryKey: ["events", "graph-targets", rules.data?.map((r) => r.Name)],
    enabled: !!rules.data,
    queryFn: async () => {
      const map: Record<string, Awaited<ReturnType<typeof listTargets>>> = {};
      await Promise.all(
        (rules.data ?? []).map(async (r) => {
          map[r.Name!] = await listTargets(r.Name!);
        })
      );
      return map;
    },
  });

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const colW = 280;
    const rowH = 80;

    (rules.data ?? []).forEach((r, i) => {
      nodes.push({
        id: `rule:${r.Name}`,
        position: { x: 0, y: i * rowH },
        data: { label: `⏰ ${r.Name}` },
        style: nodeStyle("rule"),
        sourcePosition: "right" as const,
        targetPosition: "left" as const,
      });
    });

    (fns.data ?? []).forEach((f, i) => {
      nodes.push({
        id: `lambda:${f.FunctionName}`,
        position: { x: colW, y: i * rowH },
        data: { label: `⚡ ${f.FunctionName}` },
        style: nodeStyle("lambda"),
        sourcePosition: "right" as const,
        targetPosition: "left" as const,
      });
    });

    (queues.data ?? []).forEach((q, i) => {
      nodes.push({
        id: `sqs:${q.name}`,
        position: { x: colW * 2, y: i * rowH },
        data: { label: `📦 ${q.name}` },
        style: nodeStyle("sqs"),
        sourcePosition: "right" as const,
        targetPosition: "left" as const,
      });
    });

    Object.entries(targetsByRule.data ?? {}).forEach(([ruleName, targets]) => {
      targets.forEach((t) => {
        const arn = t.Arn ?? "";
        let target: string | null = null;
        if (arn.includes(":lambda:")) {
          const name = arn.split(":function:")[1]?.split(":")[0];
          if (name) target = `lambda:${name}`;
        } else if (arn.includes(":sqs:")) {
          const name = arn.split(":").pop();
          if (name) target = `sqs:${name}`;
        }
        if (target) {
          edges.push({
            id: `${ruleName}->${target}`,
            source: `rule:${ruleName}`,
            target,
            animated: true,
            style: { stroke: "oklch(0.78 0.16 195)" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "oklch(0.78 0.16 195)" },
          });
        }
      });
    });

    return { nodes, edges };
  }, [fns.data, queues.data, rules.data, targetsByRule.data]);

  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No resources to graph yet. Create some queues, functions, or rules.
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      fitView
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={24} color="oklch(1 0 0 / 0.06)" />
      <Controls className="!bg-card !text-foreground" />
    </ReactFlow>
  );
}

function nodeStyle(kind: "rule" | "lambda" | "sqs"): React.CSSProperties {
  const palette = {
    rule: { bg: "oklch(0.32 0.04 220)", border: "oklch(0.72 0.14 240)" },
    lambda: { bg: "oklch(0.3 0.05 80)", border: "oklch(0.82 0.17 80)" },
    sqs: { bg: "oklch(0.28 0.06 195)", border: "oklch(0.78 0.16 195)" },
  }[kind];
  return {
    background: palette.bg,
    border: `1px solid ${palette.border}`,
    color: "oklch(0.96 0.005 250)",
    borderRadius: 8,
    padding: "8px 12px",
    fontFamily: "JetBrains Mono, monospace",
    fontSize: 11,
    minWidth: 220,
  };
}
