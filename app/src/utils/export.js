import * as XLSX from 'xlsx'

export function downloadCSV(data, filename = 'export.csv') {
  if (!data?.length) return
  const headers = Object.keys(data[0])
  const escape  = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows    = data.map(row => headers.map(h => escape(row[h])).join(','))
  const csv     = [headers.join(','), ...rows].join('\n')
  const blob    = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  triggerDownload(URL.createObjectURL(blob), filename)
}

export function downloadExcel(data, filename = 'export.xlsx', sheetName = 'Daten') {
  if (!data?.length) return
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, filename)
}

export function downloadPDF(title, data, columns) {
  if (!data?.length) return
  const rows = data.map(row =>
    `<tr>${columns.map(c => `<td>${row[c.key] ?? '–'}</td>`).join('')}</tr>`
  ).join('')
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; color: #150C41; }
        h2 { color: #0083AD; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #EEF1F6; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .4px; border-bottom: 2px solid #0083AD; }
        td { padding: 5px 8px; border-bottom: 1px solid #DCE0E8; }
        tr:nth-child(even) td { background: #F7F8FB; }
        .meta { font-size: 10px; color: #8E8BB0; margin-bottom: 16px; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <h2>${title}</h2>
      <div class="meta">Exportiert am ${new Date().toLocaleString('de-DE')} · ${data.length} Einträge</div>
      <table>
        <thead><tr>${columns.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body>
    </html>`
  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 500)
}

export function downloadChartPNG(chartRef, filename = 'chart.png') {
  if (!chartRef?.current) return
  triggerDownload(chartRef.current.toBase64Image('image/png', 1), filename)
}

function triggerDownload(url, filename) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
