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
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const wb = XLSX.read(bytes, { type: 'array', cellDates: true })
  const result = {}
  wb.SheetNames.forEach(name => {
    result[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: null })
  })
  return result
}

async function fetchAndMerge(currentKey, histKey, sheetName) {
  const [current, hist] = await Promise.allSettled([
    fetchDataset(currentKey),
    fetchDataset(histKey),
  ])
  const currentRows = current.status === 'fulfilled' ? (current.value[sheetName] ?? []) : []
  const histRows    = hist.status    === 'fulfilled' ? (hist.value[sheetName]    ?? []) : []
  return { [sheetName]: [...histRows, ...currentRows] }
}

export const api = {
  ads:     () => fetchDataset('ads'),
  brand:   () => fetchDataset('brand'),
  basket:  () => fetchDataset('basket'),
  catalog: () => fetchDataset('catalog'),

  repeat() {
    return fetchAndMerge('repeat', 'repeat_hist', 'RepeatPurchase')
  },
  searchCatalog() {
    return fetchAndMerge('searchcatalog', 'searchcatalog_hist', 'SearchCatalogPerformance_All')
  },
  searchQuery() {
    return fetchAndMerge('searchquery', 'searchquery_hist', 'SearchQueryPerformance')
  },
  // Traffic: Nutze "Nach Datum+ASIN" für tagesaktuelle ASIN-Daten
  async traffic() {
    const current = await fetchDataset('traffic').catch(() => ({}))
    return current
  },

  async loadAll() {
    const [ads, brand, basket, repeat, searchCatalog, searchQuery, traffic, catalog] =
      await Promise.all([
        this.ads(),
        this.brand(),
        this.basket(),
        this.repeat(),
        this.searchCatalog(),
        this.searchQuery(),
        this.traffic(),
        this.catalog().catch(() => ({ 'Sheet1': [] })),
      ])
    return { ads, brand, basket, repeat, searchCatalog, searchQuery, traffic, catalog }
  }
}
