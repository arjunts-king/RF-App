/**
 * Download a string payload as a client-side file.
 */
export function downloadFile(content: string, fileName: string, contentType: string = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convert an array of objects to CSV formatted string
 */
export function convertToCSV<T extends Record<string, any>>(data: T[], columns: { key: keyof T; label: string }[]): string {
  if (!data || data.length === 0) return '';

  const headerRow = columns.map((col) => `"${col.label.replace(/"/g, '""')}"`).join(',');
  const rows = data.map((item) =>
    columns
      .map((col) => {
        const val = item[col.key];
        if (val === undefined || val === null) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  return [headerRow, ...rows].join('\n');
}

/**
 * Trigger clean browser printing (e.g. for supplier statements)
 */
export function triggerPrint() {
  window.print();
}
