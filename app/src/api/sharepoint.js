import * as XLSX from 'xlsx'

const BASE = import.meta.env.DEV
  ? 'http://localhost:8888/.netlify/functions'
  : '/.netlify/functions'

async function fetchDataset(key) {
  const res = await fetch(`${BASE}/sharepoint?dataset=${key}`)
  if (!res.ok) throw new Error(`Fehler beim Laden: ${key}`)
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  const binary = atob(json.data)
  const bytes  = new Uint8Array(binary.length)
  for (let i=0; i<binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const wb = XLSX.read(bytes, { type:'array', cellDates:true })
  const result = {}
  wb.SheetNames.forEach(name => {
    result[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval:null })
  })
  return result
}

async function fetchAndMerge(currentKey, histKey, sheetName) {
  const [current, hist] = await Promise.allSettled([
    fetchDataset(currentKey),
    fetchDataset(histKey),
  ])
  const currentRows = current.status==='fulfilled' ? (current.value[sheetName]??[]) : []
  const histRows    = hist.status==='fulfilled'    ? (hist.value[sheetName]??[])    : []
  return { [sheetName]: [...histRows, ...currentRows] }
}

export const api = {
  ads:     () => fetchDataset('ads'),
  brand:   () => fetchDataset('brand'),
  basket:  () => fetchDataset('basket'),
  catalog: () => fetchDataset('catalog'),

  repeat()        { return fetchAndMerge('repeat',        'repeat_hist',        'RepeatPurchase') },
  searchCatalog() { return fetchAndMerge('searchcatalog', 'searchcatalog_hist', 'SearchCatalogPerformance_All') },
  searchQuery()   { return fetchAndMerge('searchquery',   'searchquery_hist',   'SearchQueryPerformance') },

  // Traffic: Tagesaktuelle Daten aus "Nach Datum+ASIN"
  // Historische Daten aus unserem Historisch-File (hat "Nach ASIN" Sheet mit Von/Bis)
  async traffic() {
    const [current, hist] = await Promise.allSettled([
      fetchDataset('traffic'),
      fetchDataset('traffic_hist'),
    ])
    // Aktuelle tagesaktuelle Daten
    const dailyRows = current.status==='fulfilled'
      ? (current.value['Nach Datum+ASIN'] ?? []).map(r => ({
          ...r,
          'Child ASIN': r['Child ASIN'] || r['Parent ASIN'],
          'Von':        r['Datum'],
          'Bis':        r['Datum'],
        }))
      : []
    // Historische Monatsdaten
    const histRows = hist.status==='fulfilled'
      ? (hist.value['Nach ASIN'] ?? [])
      : []
    return { 'Nach ASIN': [...histRows, ...dailyRows] }
  },

  async loadAll() {
    const [ads, brand, basket, repeat, searchCatalog, searchQuery, traffic, catalog] =
      await Promise.all([
        this.ads(), this.brand(), this.basket(), this.repeat(),
        this.searchCatalog(), this.searchQuery(), this.traffic(),
        this.catalog().catch(()=>({'Sheet1':[]})),
      ])
    return { ads, brand, basket, repeat, searchCatalog, searchQuery, traffic, catalog }
  }
}
