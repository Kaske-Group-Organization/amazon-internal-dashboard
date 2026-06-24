export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY nicht gesetzt' }) }
  }

  try {
    const { messages, dataContext } = JSON.parse(event.body)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 1024,
        system: `Du bist DataTrail, ein KI-Assistent für Amazon Performance-Daten der Kaske Group.
Du hast Zugriff auf aktuelle Dashboard-Daten:

${dataContext}

Beantworte Fragen präzise auf Deutsch. Nutze konkrete Zahlen. Halte Antworten kurz und handlungsorientiert.`,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }),
    })

    const text = await response.text()

    if (!response.ok) {
      console.error('Anthropic API error:', response.status, text)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: `Anthropic API Fehler ${response.status}: ${text.slice(0, 200)}` }),
      }
    }

    const data = JSON.parse(text)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ text: data.content?.[0]?.text ?? 'Keine Antwort erhalten.' }),
    }
  } catch (err) {
    console.error('Chat function error:', err)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
