const TENANT_ID     = process.env.AZURE_TENANT_ID
const CLIENT_ID     = process.env.AZURE_CLIENT_ID
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET
const DRIVE_ID      = 'b!Cpu60gLQO0aKgzpcZr_9xnje1Mk_6DJCh1ar8P_usBYY3V5AQ_xNQr39iNbJTHgE'
const ROOT          = 'Dr.Kaske Daten/Smile/Smile Ideas/2026/Amazon/Amazon API Output/Raw data'

const FILE_MAP = {
  ads:           'Ad Campaigns/Amazon_Ads_Data.xlsx',
  brand:         'Brand Analytics/BrandAnalytics_All.xlsx',
  basket:        'Market Basket/MarketBasket_All.xlsx',
  repeat:        'Repeat Purchase/RepeatPurchase_All.xlsx',
  searchcatalog: 'Search Catalog Performance/SearchCatalogPerformance_All.xlsx',
  searchquery:   'Search Query Performance/SearchQueryPerformance_All.xlsx',
  traffic:       'Verkaufe Traffic Monatlich/VerkaufeTraffic_Monatlich.xlsx',
  catalog:       'Produkt Katalog/Produkt_Katalog.xlsx',
}

async function getToken() {
  const res = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    body: new URLSearchParams({ grant_type:'client_credentials', client_id:CLIENT_ID, client_secret:CLIENT_SECRET, scope:'https://graph.microsoft.com/.default' })
  })
  if (!res.ok) throw new Error(`Token error: ${res.status}`)
  return (await res.json()).access_token
}

async function getFileBuffer(token, filePath) {
  const parts   = `${ROOT}/${filePath}`.split('/')
  const encoded = parts.map(p => encodeURIComponent(p)).join('/')
  const url     = `https://graph.microsoft.com/v1.0/drives/${DRIVE_ID}/root:/${encoded}:/content`
  const res     = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`File error: ${res.status} – ${filePath}`)
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
    const buffer = await getFileBuffer(token, FILE_MAP[dataset])
    return { statusCode: 200, headers, body: JSON.stringify({ dataset, data: Buffer.from(buffer).toString('base64') }) }
  } catch (err) {
    console.error(err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
