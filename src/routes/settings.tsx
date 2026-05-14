import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useConfig, type AwsConfig } from "@/store/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "./sqs";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Localstash" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const cfg = useConfig();

  // Local draft — edits live here until the user clicks "Apply & reconnect".
  // This avoids the zustand-persist/SSR hydration race where the controlled input
  // appears to revert on keystroke because the store re-renders from stale localStorage.
  const [draft, setDraft] = useState<AwsConfig>({
    endpoint: cfg.endpoint,
    region: cfg.region,
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    forcePathStyle: cfg.forcePathStyle,
  });

  const isDirty =
    draft.endpoint !== cfg.endpoint ||
    draft.region !== cfg.region ||
    draft.accessKeyId !== cfg.accessKeyId ||
    draft.secretAccessKey !== cfg.secretAccessKey ||
    draft.forcePathStyle !== cfg.forcePathStyle;

  function applyDraft() {
    cfg.set(draft);
    void qc.invalidateQueries();
    toast.success("Settings saved — reconnecting…");
  }

  function resetAll() {
    cfg.reset();
    const defaults = {
      endpoint: "http://localstack.oceaninfra.localhost",
      region: "eu-central-1",
      accessKeyId: "test",
      secretAccessKey: "test",
      forcePathStyle: true,
    };
    setDraft(defaults);
    void qc.invalidateQueries();
    toast.success("Reset to defaults");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Configure how Localstash connects to your LocalStack instance."
      />
      <Card className="glass max-w-2xl">
        <CardHeader>
          <CardTitle>Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Endpoint URL</Label>
            <Input
              value={draft.endpoint}
              onChange={(e) => setDraft((d) => ({ ...d, endpoint: e.target.value }))}
              placeholder="http://localstack.oceaninfra.localhost"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Use <code>http://localstack.oceaninfra.localhost</code> for Ocean (default), or{" "}
              <code>http://localhost:4566</code> for standalone LocalStack.{" "}
              <code>*.oceaninfra.localhost</code> endpoints are automatically proxied server-side so
              the Ocean gateway never sees a browser{" "}
              <code className="text-[10px]">Origin</code> header.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Region</Label>
              <Input
                value={draft.region}
                onChange={(e) => setDraft((d) => ({ ...d, region: e.target.value }))}
                placeholder="eu-central-1"
              />
            </div>
            <div>
              <Label className="text-xs">Access key id</Label>
              <Input
                value={draft.accessKeyId}
                onChange={(e) => setDraft((d) => ({ ...d, accessKeyId: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Secret access key</Label>
            <Input
              type="password"
              value={draft.secretAccessKey}
              onChange={(e) => setDraft((d) => ({ ...d, secretAccessKey: e.target.value }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <Label className="text-xs">S3 force path style</Label>
              <p className="text-[11px] text-muted-foreground">
                Required for LocalStack S3 unless you've set up virtual-host DNS.
              </p>
            </div>
            <Switch
              checked={draft.forcePathStyle}
              onCheckedChange={(v) => setDraft((d) => ({ ...d, forcePathStyle: v }))}
            />
          </div>
          <div className="flex items-center justify-between gap-2 pt-2">
            <Button variant="ghost" onClick={resetAll}>
              Reset to defaults
            </Button>
            <Button onClick={applyDraft} disabled={!isDirty}>
              Apply &amp; reconnect
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass max-w-2xl">
        <CardHeader>
          <CardTitle>Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <p>
            • Localstash runs entirely in your browser and talks directly to the LocalStack endpoint
            above.
          </p>
          <p>• Make sure CORS is permitted by your LocalStack instance (it is by default).</p>
          <p>
            • Press <kbd className="rounded border border-border px-1">⌘K</kbd> anywhere to open the
            command palette.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
