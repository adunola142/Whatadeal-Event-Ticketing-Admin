function escapeCsv(value: unknown) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type ExportColumn<T> = {
  header: string;
  value: (row: T) => unknown;
};

export function exportToCsv<T>(filename: string, rows: T[], columns: ExportColumn<T>[]) {
  const head = columns.map((c) => escapeCsv(c.header)).join(",");
  const body = rows.map((row) => columns.map((c) => escapeCsv(c.value(row))).join(","));
  const csv = "\uFEFF" + [head, ...body].join("\r\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function exportToExcel<T>(filename: string, rows: T[], columns: ExportColumn<T>[]) {
  const headerRow = `<Row>${columns
    .map((c) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(c.header)}</Data></Cell>`)
    .join("")}</Row>`;
  const dataRows = rows
    .map((row) => {
      const cells = columns
        .map((c) => {
          const v = c.value(row);
          const n = typeof v === "number" ? v : Number(v);
          if (typeof v === "number" || (typeof v === "string" && v.trim() !== "" && Number.isFinite(n) && /^-?\d+(\.\d+)?$/.test(v.trim()))) {
            return `<Cell><Data ss:Type="Number">${escapeXml(Number.isFinite(n) ? n : v)}</Data></Cell>`;
          }
          return `<Cell><Data ss:Type="String">${escapeXml(v)}</Data></Cell>`;
        })
        .join("");
      return `<Row>${cells}</Row>`;
    })
    .join("");
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Bottom"/></Style>
  <Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/></Style>
 </Styles>
 <Worksheet ss:Name="Export">
  <Table>
   ${headerRow}
   ${dataRows}
  </Table>
 </Worksheet>
</Workbook>`;
  downloadBlob(
    new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" }),
    filename.endsWith(".xls") ? filename : `${filename}.xls`,
  );
}