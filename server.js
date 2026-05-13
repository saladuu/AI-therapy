// Mindwell — backend proxy
// Houdt de Claude API key buiten de browser. Serveert /public statisch.

import 'dotenv/config'
import express from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PORT = process.env.PORT || 3000
const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001'

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('\n❌ ANTHROPIC_API_KEY ontbreekt. Kopieer .env.example naar .env en vul je key in.\n')
  process.exit(1)
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const app = express()
// 1mb is genoeg voor een 512px jpeg q75 (~70-100KB) plus history.
app.use(express.json({ limit: '1mb' }))
app.use(express.static(path.join(__dirname, 'public')))

function describeLight(level) {
  // micro:bit lightLevel is 0..255
  if (level == null) return 'onbekend'
  if (level < 40) return 'donker'
  if (level < 100) return 'gedempt'
  if (level < 180) return 'normaal kamerlicht'
  return 'helder'
}

const SYSTEM_PROMPT = `Je bent Mindwell, een eerlijke AI-therapeut. Je bent geen vervanging voor menselijke zorg, en je doet alsof dat zo is. Houd je strikt aan deze principes:

1. EERLIJKHEID BOVEN ALLES. Geef nooit valse hoop, geen geruststellingen die je niet kunt onderbouwen, geen overdreven complimenten. "Ik weet het niet" of "ik kan dat niet voor je beoordelen" is altijd beter dan iets verzinnen. Geen schmieren — niet zeggen "wat goed dat je dit deelt", "je bent dapper", "wat een mooie vraag".

2. ONDERBOUWD. Als je advies geeft, baseer het kort op evidence-based methoden (CBT, ACT, motivational interviewing). Leg in één zin uit waarom je iets voorstelt.

3. VRAAG EERST. Stel gerichte vragen voordat je een conclusie trekt. Generieke adviezen zijn nutteloos. Eén vraag tegelijk.

4. KORT. Dit is een gesproken gesprek. Houd antwoorden onder ~3 zinnen tenzij iets uitleg vereist. Geen opsommingen, geen kopjes — gewoon spreektaal.

5. NEDERLANDS. Spreek Nederlands. Toon: warm maar nuchter — zoals een goede Nederlandse huisarts.

6. CRISIS. Bij signalen van suïcidaliteit, acute psychose of geweld: zeg duidelijk dat je daar als AI niet voor toereikend bent en wijs op 113 (zelfmoordpreventie) of 112. Niet in elke berichtsessie noemen — alleen wanneer relevant.

7. SENSOREN EN BEELD. Soms krijg je context mee:
   - Een foto van de gebruiker (laptop-webcam) — lees subtiel de emotie en lichaamstaal af. Als de uitdrukking sterk botst met de woorden, is dat informatief.
   - HuskyLens-melding of er een gezicht in beeld is.
   - Omgevingslicht via de micro:bit.
   Dit is ZWAK signaal. Noem nooit expliciet "ik zie op de foto dat..." — gebruik het om je antwoord te kleuren, niet om te confronteren. Geef altijd voorrang aan wat de gebruiker zegt.`

app.post('/api/chat', async (req, res) => {
  try {
    const { messages = [], sensors = {}, image = null } = req.body
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages is leeg' })
    }

    const facePresent = Number.isFinite(sensors.face) && sensors.face > 0
    const light = describeLight(sensors.light)

    const sensorContext = `Huidige sensor-context (zwak signaal, mag negeren):
- Gezicht in beeld: ${facePresent ? 'ja' : 'nee/onbekend'}
- Omgevingslicht: ${light}
${image ? '- Webcam-snapshot meegestuurd bij dit bericht.' : '- Geen webcam-snapshot bij dit bericht.'}`

    const systemWithContext = `${SYSTEM_PROMPT}

${sensorContext}`

    // Voeg de afbeelding toe aan het LAATSTE user-bericht (alleen daar — voorgaande
    // turns blijven text-only zodat history niet onnodig duur wordt).
    let processedMessages = messages
    if (image && typeof image === 'string' && messages.length > 0) {
      const lastIdx = messages.length - 1
      const last = messages[lastIdx]
      if (last && last.role === 'user' && typeof last.content === 'string') {
        processedMessages = [
          ...messages.slice(0, lastIdx),
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: image
                }
              },
              { type: 'text', text: last.content }
            ]
          }
        ]
      }
    }

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: systemWithContext,
      messages: processedMessages
    })

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')

    res.json({ text, model: response.model, usage: response.usage })
  } catch (err) {
    console.error('Claude API error:', err)
    res.status(500).json({ error: err.message || 'Onbekende fout' })
  }
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, model: MODEL })
})

app.listen(PORT, () => {
  console.log(`\n  Mindwell draait op http://localhost:${PORT}`)
  console.log(`  Model: ${MODEL}\n`)
})
