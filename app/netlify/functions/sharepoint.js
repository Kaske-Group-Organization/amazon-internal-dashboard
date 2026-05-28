const TENANT_ID     = process.env.AZURE_TENANT_ID
const CLIENT_ID     = process.env.AZURE_CLIENT_ID
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET

const SITE_ID_FULL  = 'kaskegroup.sharepoint.com,/sites/Dr.Kaske'

const FILE_MAP = {
  ads:           'Freigegebene Dokumente/Dr.Kaske Daten/Smile/Smile Ideas/2026/Amazon/Amazon API Output/Raw data/Ad Campaigns/Amazon_Ads_Data.xlsx',
  brand:         'Freigegebene Dokumente/Dr.Kaske Daten/Smile/Smile Ideas/2026/Amazon/Amazon API Output/Raw data/Brand Analytics/BrandAnalytics_All.xlsx',
  basket:        'Freigegebene Dokumente/Dr.Kaske Daten/Smile/Smile Ideas/2026/Amazon/Amazon API Output/Raw data/Market Basket/MarketBasket_All.xlsx',
  repeat:        'Freigegebene Dokumente/Dr.Kaske Daten/Smile/Smile Ideas/2026/Amazon/Amazon API Output/Raw data/Repeat Purchase/RepeatPurchase_All.xlsx',
  searchcatalog: 'Freigegebene Dokumente/Dr.Kaske Daten/Smile/Smile Ideas/2026/Amazon/Amazon API Output/Raw data/Search Catalog Performance/SearchCatalogPerformance_All.xlsx',
  searchquery:   'Freigegebene Dokumente/Dr.Kaske Daten/Smile/Smile Ideas/2026/Amazon/Amazon API Output/Raw data/Search Query Performance/SearchQueryPerformance_All.xlsx',
  traffic:       'Freigegebene Dokumente/Dr.Kaske Daten/Smile/Smile Ideas/2026/Amazon/Amazon API Output/Raw data/Verkaufe Traffic Monatlich/VerkaufeTraffic_Monatlich.xlsx',
}

async function getToken() {
  const res = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default'
    })
  })
  if (!res.ok) throw new Error(`Token error: ${res.status}`)
  return (await res.json()).access_token
}

async function getSiteId(token) {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/sites/kaskegroup.sharepoint.com:/sites/Dr.Kaske`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error(`Site error: ${res.status}`)
  const data = await res.json()
  return data.id
}

async function getFileBuffer(token, siteId, filePath) {
  const parts   = filePath.split('/')
  const encoded = parts.map(p => encodeURIComponent(p)).join('/')
  const url     = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${encoded}:/content`
  const res     = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`File error: ${res.status} – ${filePath} – ${body}`)
  }
  return res.arrayBuffer()
}

export const handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  const dataset = event.queryStringParameters?.dataset
  if (!dataset || !FILE_MAP[dataset]) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: `Unbekanntes Dataset: ${dataset}` }) }
  }
  try {
    const token  = await getToken()
    const siteId = await getSiteId(token)
    const buffer = await getFileBuffer(token, siteId, FILE_MAP[dataset])
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ dataset, data: Buffer.from(buffer).toString('base64') })
    }
  } catch (err) {
    console.error(err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
