import { createContext, useContext, useState, useMemo } from 'react'

const FilterContext = createContext(null)

function toDateStr(val) {
  if (!val) return null
  if (val instanceof Date) return isNaN(val) ? null : val.toISOString().slice(0, 10)
  if (typeof val === 'number') {
    // Excel serial date
    const d = new Date((val - 25569) * 86400 * 1000)
    return isNaN(d) ? null : d.toISOString().slice(0, 10)
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
      if (!date) return true
      if (dateFrom && date < dateFrom) return false
      if (dateTo   && date > dateTo)   return false
      return true
    })
  }

  const filterByAsin = (rows, asinCols = ['asin']) => {
    const q = asinFilter.trim().toUpperCase()
    if (!q) return rows
    return rows.filter(r =>
      asinCols.some(col => {
        const val = r[col]?.toString().toUpperCase() ?? ''
        if (val.includes(q)) return true
        const title = getTitle(r[col] ?? '').toUpperCase()
        return title.includes(q)
      })
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
