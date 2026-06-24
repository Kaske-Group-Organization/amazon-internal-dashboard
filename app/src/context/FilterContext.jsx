import { createContext, useContext, useState, useMemo, useCallback } from 'react'

const FilterContext = createContext(null)

function toDateStr(val) {
  if (val == null) return null
  if (val instanceof Date) {
    if (isNaN(val)) return null
    const y = val.getUTCFullYear()
    const m = String(val.getUTCMonth()+1).padStart(2,'0')
    const d = String(val.getUTCDate()).padStart(2,'0')
    return `${y}-${m}-${d}`
  }
  if (typeof val === 'number') {
    const d = new Date(Math.round((val-25569)*86400*1000))
    if (isNaN(d)) return null
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`
  }
  if (typeof val === 'string') {
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(val)) {
      const [d,m,y] = val.split('.')
      return `${y}-${m}-${d}`
    }
    return val.slice(0,10)
  }
  return null
}

export const fmtDate = (val) => {
  const s = toDateStr(val)
  if (!s) return '–'
  const [y,m,d] = s.split('-').map(Number)
  return `${String(d).padStart(2,'0')}.${String(m).padStart(2,'0')}.${y}`
}

export const fmtMonth = (val) => {
  const s = toDateStr(val)
  if (!s) return '–'
  const [y,m] = s.split('-').map(Number)
  return `${['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'][m-1]} ${y}`
}

export function FilterProvider({ children, catalog=[], uploadedFiles=[] }) {
  const [dateFrom,   setDateFrom]   = useState('')
  const [dateTo,     setDateTo]     = useState('')
  const [asinFilter, setAsinFilter] = useState('')

  const catalogMap = useMemo(() => {
    const m = new Map()
    catalog.forEach(r => { if (r.asin) m.set(r.asin.trim().toUpperCase(), r.title||'') })
    return m
  }, [catalog])

  const getTitle = useCallback((asin) => {
    if (!asin) return '–'
    return catalogMap.get(asin.trim().toUpperCase()) || asin
  }, [catalogMap])

  const getShortTitle = useCallback((asin, maxLen=40) => {
    const t = getTitle(asin)
    if (!t || t===asin) return asin
    return t.length>maxLen ? t.slice(0,maxLen)+'…' : t
  }, [getTitle])

  const filterByDate = useCallback((rows, dateCol) => {
    if (!dateFrom && !dateTo) return rows
    return rows.filter(r => {
      const date = toDateStr(r[dateCol])
      if (!date) return true
      if (dateFrom && date < dateFrom) return false
      if (dateTo   && date > dateTo)   return false
      return true
    })
  }, [dateFrom, dateTo])

  const filterByAsin = useCallback((rows, asinCols=['asin']) => {
    const raw = asinFilter.trim()
    if (!raw) return rows
    const terms = raw.split(/[\n,\s]+/).map(s=>s.trim().toUpperCase()).filter(s=>s.length>=2)
    if (!terms.length) return rows
    return rows.filter(r =>
      terms.some(term => {
        const isAsin = /^B[0-9A-Z]{9}$/i.test(term)
        return asinCols.some(col => {
          const val = (r[col]??'').toString().toUpperCase().trim()
          if (isAsin) return val === term
          return val.includes(term) || getTitle(r[col]??'').toUpperCase().includes(term)
        })
      })
    )
  }, [asinFilter, getTitle])

  return (
    <FilterContext.Provider value={{
      dateFrom, setDateFrom, dateTo, setDateTo,
      asinFilter, setAsinFilter,
      getTitle, getShortTitle, filterByDate, filterByAsin,
      uploadedFiles,
    }}>
      {children}
    </FilterContext.Provider>
  )
}

export const useFilters = () => useContext(FilterContext)
