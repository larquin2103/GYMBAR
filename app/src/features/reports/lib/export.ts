/**
 * Utilidades de exportación de reportes. Sin dependencias: CSV (compatible con
 * Excel, con BOM) e impresión a PDF vía el diálogo del navegador.
 */

function escapeCsv(value: string): string {
  if (/[";\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Descarga los datos como CSV. Usa ';' (mejor para Excel en es) y BOM UTF-8. */
export function downloadCsv(filename: string, headers: string[], rows: string[][]): void {
  const lines = [headers, ...rows].map((r) => r.map(escapeCsv).join(';'));
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Abre una vista imprimible (el usuario elige "Guardar como PDF"). */
export function printReport(
  title: string,
  subtitle: string,
  headers: string[],
  rows: string[][],
): void {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const thead = headers.map((h) => `<th>${esc(h)}</th>`).join('');
  const tbody = rows
    .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
    .join('');
  const now = new Date().toLocaleString('es');
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; margin: 32px; }
  h1 { font-size: 20px; margin: 0 0 2px; }
  .sub { color: #666; font-size: 13px; margin-bottom: 4px; }
  .meta { color: #999; font-size: 11px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; background: #f4f4f5; padding: 8px 10px; border-bottom: 2px solid #e4e4e7; text-transform: uppercase; font-size: 10px; letter-spacing: .04em; color: #555; }
  td { padding: 7px 10px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) td { background: #fafafa; }
  .brand { color: #6366f1; font-weight: 600; font-size: 11px; letter-spacing: .08em; }
  @media print { body { margin: 12mm; } }
</style></head><body>
<div class="brand">GYMBAR</div>
<h1>${esc(title)}</h1>
<div class="sub">${esc(subtitle)}</div>
<div class="meta">Generado el ${esc(now)}</div>
<table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
<script>window.onload = function(){ setTimeout(function(){ window.print(); }, 200); };</script>
</body></html>`;
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) {
    alert('Permite las ventanas emergentes para exportar a PDF.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
