import { ClientOnly } from "@tanstack/react-router";
import Editor, { type EditorProps } from "@monaco-editor/react";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  value: string;
  onChange?: (v: string) => void;
  language?: string;
  height?: number | string;
  readOnly?: boolean;
} & Omit<EditorProps, "value" | "onChange" | "language" | "height">;

export function JsonEditor({
  value,
  onChange,
  language = "json",
  height = 240,
  readOnly,
  ...rest
}: Props) {
  return (
    <ClientOnly fallback={<Skeleton style={{ height }} className="w-full" />}>
      <div className="overflow-hidden rounded-md border border-border">
        <Editor
          height={height}
          language={language}
          theme="vs-dark"
          value={value}
          onChange={(v) => onChange?.(v ?? "")}
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: 12,
            fontFamily:
              "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace",
            scrollBeyondLastLine: false,
            lineNumbersMinChars: 3,
            renderLineHighlight: "gutter",
            tabSize: 2,
            wordWrap: "on",
          }}
          {...rest}
        />
      </div>
    </ClientOnly>
  );
}
