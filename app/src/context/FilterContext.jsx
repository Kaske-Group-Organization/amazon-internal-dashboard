import { createContext, useContext, useState, useMemo } from 'react'

const FilterContext = createContext(null)

// Timezone-sicheres Date-Parsing
function toDateStr(val) {
  if (val == null) return null
  if (val instanceof Date) {
    if (isNaN(val)) return null
    // Lokales Datum verwenden (nicht UTC) um Timezone-Bugs zu vermeiden
    const y = val.getFullYear()
    const m = String(val.getMonth() + 1).padStart(2, '0')
    const d = String(val.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof val === 'number') {
    // Excel Serial Date → UTC (Excel zählt ab 1900-01-01)
    const d = new Date(Math.round((val - 25569) * 86400 * 1000))
    if (isNaN(d)) return null
    const y = d.getUTCFullYear()
    const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${y}-${mo}-${day}`
  }
  if (typeof val === 'string') return val.slice(0, 10)
  return null
}

export const fmtDate = (val) => {
  const s = toDateStr(val)
  if (!s) return '–'
  const [y, m, d] = s.split('-').map(Number)
  return `${String(d).padStart(2,'0')}.${String(m).padStart(2,'0')}.${y}`
}

export const fmtMonth = (val) => {
  const s = toDateStr(val)
  if (!s) return '–'
  const [y, m] = s.split('-').map(Number)
  const months = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
  return `${months[m-1]} ${y}`
}

export function FilterProvider({ children, catalog = [], uploadedFiles = [] }) {
  const [dateFrom,   setDateFrom]   = useState('')
  const [dateTo,     setDateTo]     = useState('')
  const [asinFilter, setAsinFilter] = useState('')

  const catalogMap = useMemo(() => {
    const m = new Map()
    catalog.forEach(r => {
      if (r.asin) m.set(r.asin.trim().toUpperCase(), r.title || '')
    })
    return m
  }, [catalog])

  const getTitle = (asin) => {
    if (!asin) return '–'
    return catalogMap.get(asin.trim().toUpperCase()) || asin
  }

  const getShortTitle = (asin, maxLen = 40) => {
    const t = getTitle(asin)
    if (!t || t === asin) return asin
    return t.length > maxLen ? t.slice(0, maxLen) + '…' : t
  }

  const filterByDate = (rows, dateCol) => {
    if (!dateFrom && !dateTo) return rows
    return rows.filter(r => {
      const raw  = r[dateCol]
      const date = toDateStr(raw)
      if (!date) return true // kein Datum → nicht filtern
      if (dateFrom && date < dateFrom) return false
      if (dateTo   && date > dateTo)   return false
      return true
    })
  }

  const filterByAsin = (rows, asinCols = ['asin']) => {
    const raw = asinFilter.trim()
    if (!raw) return rows

    // Mehrere ASINs: Komma- oder zeilengetrennt
    const terms = raw
      .split(/[\n,]+/)
      .map(s => s.trim().toUpperCase())
      .filter(Boolean)

    if (terms.length === 0) return rows

    return rows.filter(r =>
      terms.some(term =>
        asinCols.some(col => {
          const val = r[col]?.toString().toUpperCase() ?? ''
          if (val.includes(term)) return true
          const title = getTitle(r[col] ?? '').toUpperCase()
          return title.includes(term)
        })
      )
    )
  }

  return (
    <FilterContext.Provider value={{
      dateFrom, setDateFrom,
      dateTo,   setDateTo,
      asinFilter, setAsinFilter,
      getTitle, getShortTitle,
      filterByDate, filterByAsin,
      uploadedFiles,
    }}>
      {children}
    </FilterContext.Provider>
  )
}

export const useFilters = () => useContext(FilterContext)
