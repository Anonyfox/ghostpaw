interface Column {
  key: string;
  label: string;
  align?: "end";
  format?: (v: unknown) => string;
}

interface Props {
  title: string;
  columns: Column[];
  // biome-ignore lint/suspicious/noExplicitAny: rows are heterogeneous by design
  rows: readonly any[];
  emptyText?: string;
}

function defaultFormat(v: unknown): string {
  if (typeof v === "number") {
    if (v === 0) return "$0.00";
    if (v >= 0.01) return v.toFixed(2);
    return v.toFixed(4);
  }
  return String(v ?? "");
}

export function CostBreakdownTable({ title, columns, rows, emptyText }: Props) {
  if (rows.length === 0) return null;

  return (
    <div class="mb-4">
      <h6 class="text-body-secondary mb-2">{title}</h6>
      <div class="table-responsive">
        <table class="table table-sm table-borderless mb-0">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  class={`text-body-secondary fw-normal ${col.align === "end" ? "text-end" : ""}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {columns.map((col) => {
                  const val = row[col.key];
                  const fmt = col.format ?? defaultFormat;
                  return (
                    <td key={col.key} class={col.align === "end" ? "text-end" : ""}>
                      {fmt(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} class="text-body-tertiary">
                  {emptyText ?? "No data"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
