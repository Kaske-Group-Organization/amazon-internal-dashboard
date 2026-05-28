export function downloadCSV(data, filename = 'export.csv') {
  if (!data || data.length === 0) return
  const headers = Object.keys(data[0])
  const escape  = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows    = data.map(row => headers.map(h => escape(row[h])).join(','))
  const csv     = [headers.join(','), ...rows].join('\n')
  const blob    = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  triggerDownload(URL.createObjectURL(blob), filename)
}

export function downloadChartPNG(chartRef, filename = 'chart.png') {
  if (!chartRef?.current) return
  const url = chartRef.current.toBase64Image('image/png', 1)
  triggerDownload(url, filename)
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
