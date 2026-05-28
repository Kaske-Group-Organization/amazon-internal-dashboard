const TENANT_ID     = process.env.AZURE_TENANT_ID
const CLIENT_ID     = process.env.AZURE_CLIENT_ID
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET
const SITE_HOSTNAME = 'kaskegroup.sharepoint.com'
const SITE_PATH     = '/sites/Dr.Kaske'

const FILE_MAP = {
  ads:           'Amazon_Ads_Data.xlsx',
  brand:         'BrandAnalytics_All.xlsx',
  basket:        'MarketBasket_All.xlsx',
  repeat:        'RepeatPurchase_All.xlsx',
  searchcatalog: 'SearchCatalogPerformance_All.xlsx',
  searchquery:   'SearchQueryPerformance_All.xlsx',
  traffic:       'VerkaufeTraffic_Monatlich.xlsx',
}

async function getToken() {
  const res = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    body: new URLSearchParams({ grant_type:'client_credentials', client_id:CLIENT_ID, client_secret:CLIENT_SECRET, scope:'https://graph.microsoft.com/.default' })
  })
  if (!res.ok) throw new Error(`Token error: ${res.status}`)
  return (await res.json()).access_token
}

async function getSiteId(token) {
  const res = await fetch(`https://graph.microsoft.com/v1.0/sites/${SITE_HOSTNAME}:${SITE_PATH}`, { headers:{ Authorization:`Bearer ${token}` } })
  if (!res.ok) throw new Error(`Site error: ${res.status}`)
  return (await res.json()).id
}

async function searchFile(token, siteId, filename) {
  const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root/search(q='${encodeURIComponent(filename)}')`
  const res = await fetch(url, { headers:{ Authorization:`Bearer ${token}` } })
  if (!res.ok) throw new Error(`Search error: ${res.status}`)
  const data = await res.json()
  const file = data.value?.find(f => f.name === filename)
  if (!file) throw new Error(`Datei nicht gefunden: ${filename}`)
  return file.id
}

async function getFileBuffer(token, siteId, fileId) {
  const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${fileId}/content`
  const res = await fetch(url, { headers:{ Authorization:`Bearer ${token}` } })
  if (!res.ok) throw new Error(`Download error: ${res.status}`)
  return res.arrayBuffer()
}

export const handler = async (event) => {
  const headers = { 'Content-Type':'application/json', 'Access-Control-Allow-Origin':'*' }
  const dataset = event.queryStringParameters?.dataset
  if (!dataset || !FILE_MAP[dataset]) return { statusCode:400, headers, body:JSON.stringify({ error:`Unbekanntes Dataset: ${dataset}` }) }
  try {
    const token   = await getToken()
    const siteId  = await getSiteId(token)
    const fileId  = await searchFile(token, siteId, FILE_MAP[dataset])
    const buffer  = await getFileBuffer(token, siteId, fileId)
    return { statusCode:200, headers, body:JSON.stringify({ dataset, file:FILE_MAP[dataset], data:Buffer.from(buffer).toString('base64') }) }
  } catch(err) {
    console.error(err)
    return { statusCode:500, headers, body:JSON.stringify({ error:err.message }) }
  }
}
