import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CredentialRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[12px] border border-[#E8E2DA] bg-[#FAF8F5] px-4 py-3">
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">{label}</p>
        <p className="truncate font-mono text-[14px] text-[#111827]">{value}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Copy ${label}`}
        onClick={() => {
          void navigator.clipboard.writeText(value);
          toast.success("Copied");
        }}
      >
        <Copy className="size-4" />
      </Button>
    </div>
  );
}
