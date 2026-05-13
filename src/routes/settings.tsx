import { createFileRoute } from "@tanstack/react-router";
import { useConfig } from "@/store/config";
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
              value={cfg.endpoint}
              onChange={(e) => cfg.set({ endpoint: e.target.value })}
              placeholder="http://localhost:4566"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Default LocalStack edge port. Supports{" "}
              <code>localhost.localstack.cloud</code> and custom overrides.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Region</Label>
              <Input
                value={cfg.region}
                onChange={(e) => cfg.set({ region: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Access key id</Label>
              <Input
                value={cfg.accessKeyId}
                onChange={(e) => cfg.set({ accessKeyId: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Secret access key</Label>
            <Input
              type="password"
              value={cfg.secretAccessKey}
              onChange={(e) => cfg.set({ secretAccessKey: e.target.value })}
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
              checked={cfg.forcePathStyle}
              onCheckedChange={(v) => cfg.set({ forcePathStyle: v })}
            />
          </div>
          <div className="flex items-center justify-between gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                cfg.reset();
                toast.success("Reset to defaults");
                qc.invalidateQueries();
              }}
            >
              Reset
            </Button>
            <Button
              onClick={() => {
                qc.invalidateQueries();
                toast.success("Reconnecting…");
              }}
            >
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
            • Localstash runs entirely in your browser and talks directly to the
            LocalStack endpoint above.
          </p>
          <p>
            • Make sure CORS is permitted by your LocalStack instance (it is by
            default).
          </p>
          <p>
            • Press <kbd className="rounded border border-border px-1">⌘K</kbd>{" "}
            anywhere to open the command palette.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
