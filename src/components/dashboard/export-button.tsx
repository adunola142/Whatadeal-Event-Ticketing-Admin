import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToCsv, exportToExcel, type ExportColumn } from "@/lib/export";

export function ExportButton<T>({
  filename,
  rows,
  columns,
  disabled,
  className,
}: {
  filename: string;
  rows: T[];
  columns: ExportColumn<T>[];
  disabled?: boolean;
  className?: string;
}) {
  const off = disabled || columns.length === 0;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={off}
          className={className ?? "h-11 rounded-[10px] border-[#E8E2DA] px-4"}
        >
          <Download className="size-4" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={off} onClick={() => exportToCsv(filename, rows, columns)}>
          <FileText className="size-4" /> Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem disabled={off} onClick={() => exportToExcel(filename, rows, columns)}>
          <FileSpreadsheet className="size-4" /> Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}