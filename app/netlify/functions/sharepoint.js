const TENANT_ID     = process.env.AZURE_TENANT_ID
const CLIENT_ID     = process.env.AZURE_CLIENT_ID
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET

async function getToken() {
  const res = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    body: new URLSearchParams({ grant_type:'client_credentials', client_id:CLIENT_ID, client_secret:CLIENT_SECRET, scope:'https://graph.microsoft.com/.default' })
  })
  if (!res.ok) throw new Error(`Token error: ${res.status}`)
  return (await res.json()).access_token
}

export const handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  const debug = event.queryStringParameters?.debug

  try {
    const token = await getToken()

    if (debug === 'drives') {
      const siteRes = await fetch(`https://graph.microsoft.com/v1.0/sites/kaskegroup.sharepoint.com:/sites/Dr.Kaske`, { headers: { Authorization: `Bearer ${token}` } })
      const site = await siteRes.json()
      const drivesRes = await fetch(`https://graph.microsoft.com/v1.0/sites/${site.id}/drives`, { headers: { Authorization: `Bearer ${token}` } })
      const drives = await drivesRes.json()
      return { statusCode: 200, headers, body: JSON.stringify({ siteId: site.id, drives: drives.value.map(d => ({ id: d.id, name: d.name, type: d.driveType })) }) }
    }

    if (debug === 'root') {
      const siteRes = await fetch(`https://graph.microsoft.com/v1.0/sites/kaskegroup.sharepoint.com:/sites/Dr.Kaske`, { headers: { Authorization: `Bearer ${token}` } })
      const site = await siteRes.json()
      const drivesRes = await fetch(`https://graph.microsoft.com/v1.0/sites/${site.id}/drives`, { headers: { Authorization: `Bearer ${token}` } })
      const drives = await drivesRes.json()
      const drive = drives.value.find(d => d.name === 'Freigegebene Dokumente' || d.driveType === 'documentLibrary') || drives.value[0]
      const rootRes = await fetch(`https://graph.microsoft.com/v1.0/drives/${drive.id}/root/children`, { headers: { Authorization: `Bearer ${token}` } })
      const root = await rootRes.json()
      return { statusCode: 200, headers, body: JSON.stringify({ driveId: drive.id, driveName: drive.name, rootFolders: root.value?.map(f => f.name) }) }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ status: 'ok' }) }
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
