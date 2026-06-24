import { createContext, useContext, useState, useMemo } from 'react'

const FilterContext = createContext(null)

export function FilterProvider({ children, catalog = [], uploadedFiles = [] }) {
  const [dateFrom,   setDateFrom]   = useState('')
  const [dateTo,     setDateTo]     = useState('')
  const [asinFilter, setAsinFilter] = useState('')

  const catalogMap = useMemo(() => {
    const m = new Map()
    catalog.forEach(r => { if (r.asin) m.set(r.asin.trim(), r.title || '') })
    return m
  }, [catalog])

  const getTitle = (asin) => {
    if (!asin) return '–'
    return catalogMap.get(asin.trim()) || asin
  }

  const getShortTitle = (asin, maxLen = 40) => {
    const t = getTitle(asin)
    return t.length > maxLen ? t.slice(0, maxLen) + '…' : t
  }

  const filterByDate = (rows, dateCol) => {
    if (!dateFrom && !dateTo) return rows
    return rows.filter(r => {
      const d = r[dateCol]
      if (!d) return true
      const date = d instanceof Date
        ? d.toISOString().slice(0, 10)
        : typeof d === 'string' ? d.slice(0, 10)
        : new Date(d).toISOString().slice(0, 10)
      if (dateFrom && date < dateFrom) return false
      if (dateTo   && date > dateTo)   return false
      return true
    })
  }

  const filterByAsin = (rows, asinCols = ['asin']) => {
    if (!asinFilter.trim()) return rows
    const q = asinFilter.trim().toUpperCase()
    return rows.filter(r =>
      asinCols.some(col => r[col]?.toString().toUpperCase().includes(q)) ||
      asinCols.some(col => getTitle(r[col]).toUpperCase().includes(asinFilter.trim().toUpperCase()))
    )
  }

  return (
    <FilterContext.Provider value={{
      dateFrom, setDateFrom, dateTo, setDateTo,
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
