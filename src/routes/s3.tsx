import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listBuckets,
  createBucket,
  deleteBucket,
  listObjects,
  uploadObject,
  deleteObject,
  presignDownload,
  getObjectText,
} from "@/lib/aws/s3";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Database,
  Upload,
  Trash2,
  Download,
  RefreshCw,
  Plus,
  Folder,
  File as FileIcon,
  ChevronRight,
  Search,
  Eye,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { JsonEditor } from "@/components/app/JsonEditor";
import { PageHeader, EmptyHint } from "./sqs";

export const Route = createFileRoute("/s3")({
  head: () => ({ meta: [{ title: "S3 Buckets — Localstash" }] }),
  component: S3Page,
});

function S3Page() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const buckets = useQuery({
    queryKey: ["s3", "buckets"],
    queryFn: listBuckets,
    refetchInterval: 8000,
  });

  const filtered = useMemo(
    () =>
      (buckets.data ?? []).filter((b) =>
        (b.Name ?? "").toLowerCase().includes(filter.toLowerCase())
      ),
    [buckets.data, filter]
  );

  const active = filtered.find((b) => b.Name === selected) ?? filtered[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="S3 Buckets"
        subtitle="Browse object storage and inspect file contents."
        right={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => qc.invalidateQueries({ queryKey: ["s3"] })}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <CreateBucketDialog />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <Card className="glass">
          <CardHeader className="space-y-2 pb-3">
            <CardTitle className="text-sm font-medium">
              Buckets{" "}
              <span className="ml-1 font-mono text-xs text-muted-foreground">
                {buckets.data?.length ?? 0}
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
            {buckets.isLoading && <Skeleton className="h-16 w-full" />}
            {!buckets.isLoading && filtered.length === 0 && (
              <EmptyHint icon={Database} text="No buckets yet." />
            )}
            <div className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
              {filtered.map((b) => {
                const isActive = (active?.Name ?? "") === b.Name;
                return (
                  <motion.button
                    key={b.Name}
                    layout
                    onClick={() => setSelected(b.Name!)}
                    className={
                      "flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left transition " +
                      (isActive
                        ? "border-primary/40 bg-primary/10"
                        : "border-transparent hover:border-border hover:bg-muted/40")
                    }
                  >
                    <Database
                      className={
                        "h-3.5 w-3.5 " +
                        (isActive ? "text-primary" : "text-muted-foreground")
                      }
                    />
                    <span className="flex-1 truncate font-mono text-xs">{b.Name}</span>
                  </motion.button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {active ? (
          <BucketDetail key={active.Name} name={active.Name!} />
        ) : (
          <Card className="glass">
            <CardContent className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              Select a bucket.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function BucketDetail({ name }: { name: string }) {
  const qc = useQueryClient();
  const [prefix, setPrefix] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ key: string } | null>(null);

  const objects = useQuery({
    queryKey: ["s3", "objects", name, prefix],
    queryFn: () => listObjects(name, prefix || undefined),
  });

  const upload = useMutation({
    mutationFn: async (files: FileList) => {
      for (const f of Array.from(files)) {
        await uploadObject(name, prefix + f.name, f);
      }
    },
    onSuccess: () => {
      toast.success("Uploaded");
      qc.invalidateQueries({ queryKey: ["s3"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (key: string) => deleteObject(name, key),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["s3"] });
    },
  });

  const dropDel = useMutation({
    mutationFn: () => deleteBucket(name),
    onSuccess: () => {
      toast.success("Bucket deleted");
      qc.invalidateQueries({ queryKey: ["s3"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const crumbs = prefix ? prefix.replace(/\/$/, "").split("/") : [];

  return (
    <Card className="glass">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="font-mono text-base">{name}</CardTitle>
            <Breadcrumbs
              crumbs={crumbs}
              onJump={(i) => setPrefix(crumbs.slice(0, i + 1).join("/") + "/")}
              onRoot={() => setPrefix("")}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              multiple
              hidden
              onChange={(e) => e.target.files && upload.mutate(e.target.files)}
            />
            <Button size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload
            </Button>
            <Button size="sm" variant="destructive" onClick={() => dropDel.mutate()}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete bucket
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files.length) upload.mutate(e.dataTransfer.files);
        }}
      >
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Size</th>
                <th className="px-3 py-2 font-medium">Last modified</th>
                <th className="w-24 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {objects.isLoading && (
                <tr>
                  <td colSpan={4} className="px-3 py-6">
                    <Skeleton className="h-12 w-full" />
                  </td>
                </tr>
              )}
              {objects.data?.prefixes.map((p) => {
                const folder = p.replace(prefix, "").replace(/\/$/, "");
                return (
                  <tr
                    key={p}
                    className="cursor-pointer border-t border-border hover:bg-muted/30"
                    onClick={() => setPrefix(p)}
                  >
                    <td className="flex items-center gap-2 px-3 py-2 font-mono">
                      <Folder className="h-3.5 w-3.5 text-info" /> {folder}/
                    </td>
                    <td colSpan={3} className="text-muted-foreground"></td>
                  </tr>
                );
              })}
              {objects.data?.objects.map((o) => {
                const key = o.Key!;
                const display = key.replace(prefix, "");
                if (!display) return null;
                return (
                  <tr key={key} className="border-t border-border hover:bg-muted/30">
                    <td className="flex items-center gap-2 px-3 py-2 font-mono">
                      <FileIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{display}</span>
                    </td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">
                      {fmtSize(o.Size ?? 0)}
                    </td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">
                      {o.LastModified ? new Date(o.LastModified).toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setPreview({ key })}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={async () => {
                            const url = await presignDownload(name, key);
                            window.open(url, "_blank");
                          }}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => del.mutate(key)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!objects.isLoading &&
                (objects.data?.objects.length ?? 0) === 0 &&
                (objects.data?.prefixes.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                      Empty. Drag files here or click Upload.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </CardContent>

      <ObjectPreviewDialog
        open={!!preview}
        bucket={name}
        objectKey={preview?.key ?? ""}
        onClose={() => setPreview(null)}
      />
    </Card>
  );
}

function Breadcrumbs({
  crumbs,
  onJump,
  onRoot,
}: {
  crumbs: string[];
  onJump: (i: number) => void;
  onRoot: () => void;
}) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1 font-mono text-[11px] text-muted-foreground">
      <button onClick={onRoot} className="hover:text-foreground">
        /
      </button>
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3" />
          <button onClick={() => onJump(i)} className="hover:text-foreground">
            {c}
          </button>
        </span>
      ))}
    </div>
  );
}

function ObjectPreviewDialog({
  open,
  bucket,
  objectKey,
  onClose,
}: {
  open: boolean;
  bucket: string;
  objectKey: string;
  onClose: () => void;
}) {
  const ext = objectKey.split(".").pop()?.toLowerCase();
  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext ?? "");
  const isText = ["json", "txt", "log", "csv", "xml", "yaml", "yml", "md"].includes(ext ?? "");

  const url = useQuery({
    queryKey: ["s3", "presign", bucket, objectKey],
    queryFn: () => presignDownload(bucket, objectKey),
    enabled: open && isImage,
  });
  const text = useQuery({
    queryKey: ["s3", "text", bucket, objectKey],
    queryFn: () => getObjectText(bucket, objectKey),
    enabled: open && isText,
  });

  let pretty = text.data ?? "";
  if (ext === "json" && text.data) {
    try {
      pretty = JSON.stringify(JSON.parse(text.data), null, 2);
    } catch {
      /* */
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-strong max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate font-mono text-sm">{objectKey}</DialogTitle>
        </DialogHeader>
        {isImage && url.data && (
          <div className="flex justify-center rounded-md border border-border bg-black/40 p-2">
            <img src={url.data} alt={objectKey} className="max-h-[60vh] object-contain" />
          </div>
        )}
        {isText && (
          <JsonEditor
            value={pretty}
            language={ext === "json" ? "json" : "plaintext"}
            readOnly
            height={420}
          />
        )}
        {!isImage && !isText && (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            Preview not supported for this file type. Use download.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CreateBucketDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const create = useMutation({
    mutationFn: () => createBucket(name),
    onSuccess: () => {
      toast.success("Bucket created");
      qc.invalidateQueries({ queryKey: ["s3"] });
      setOpen(false);
      setName("");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> New bucket
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-strong">
        <DialogHeader>
          <DialogTitle>Create bucket</DialogTitle>
        </DialogHeader>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-bucket" />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => create.mutate()} disabled={!name}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function fmtSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
