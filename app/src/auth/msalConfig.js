export const msalConfig = {
  auth: {
    clientId: '029cfb10-869d-4cbb-851e-3dd03ef0c05a',
    authority: 'https://login.microsoftonline.com/645a8199-b652-44c7-903a-9f33740ce3dd',
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
}

export const loginRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read'],
}

export const ALLOWED_DOMAINS = [
  'drkaske.de',
  'smileai.de',
  'smile.bi',
  'kaske.group',
  'drvital.de',
]

export function isAllowedEmail(email) {
  if (!email) return false
  const domain = email.split('@')[1]?.toLowerCase()
  return ALLOWED_DOMAINS.includes(domain)
}
