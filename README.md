# Mindwell

Eerlijke AI-therapie. Smart-tech examenproject.

Stack: Node.js + Express (proxy) → Anthropic Claude Haiku 4.5 (vision) ← browser met Web Speech API + Web Serial API + getUserMedia → laptop-webcam + HuskyLens Pro + micro:bit.

## Hoe het werkt (kort)

- **Microfoon** → Web Speech zet spraak om naar tekst.
- **Webcam** → maakt snapshot tijdens het spreken.
- **HuskyLens** → laat weten of er een gezicht in beeld is (trigger).
- **Snapshot + tekst** → naar Claude Vision via lokale proxy.
- **Antwoord** → Web Speech leest het voor.

Snapshots gaan alleen naar Claude als de HuskyLens daadwerkelijk een gezicht ziet (anders is 't zonde van tokens).

## Setup

### 1. Dependencies installeren

```bash
npm install
```

### 2. API key invullen

```bash
cp .env.example .env
```

Open `.env` en plak je Anthropic API key achter `ANTHROPIC_API_KEY=`. Je haalt 'm op via [console.anthropic.com](https://console.anthropic.com/).

### 3. Server starten

```bash
npm start
```

Open `http://localhost:3000` in **Chrome of Edge** (Web Serial werkt niet in Firefox/Safari).

### 4. micro:bit flashen

Zie `microbit-firmware.md` voor de volledige instructies en de MakeCode-code.

### 5. HuskyLens trainen

Eén gezicht is genoeg — zie `microbit-firmware.md` voor de exacte stappen. Kort: Face Recognition mode, "Learn Multiple" op OFF, druk Learn-knop terwijl je in de camera kijkt. Klaar.

## Gebruik

1. Klik **Verbind micro:bit** rechts in de sidebar (kies de micro:bit COM-poort).
2. Klik **Start sessie**.
3. Sta toegang tot **microfoon en webcam** toe.
4. Praat. De AI luistert, kijkt mee, denkt na, en spreekt terug.

## Bestanden

```
mindwell/
├── server.js              ← Express + multimodal Claude proxy
├── package.json
├── .env.example           ← kopie naar .env, vul API key in
├── microbit-firmware.md   ← MakeCode-code + uitleg
└── public/
    ├── index.html         ← landing page
    ├── therapy.html       ← sessie-pagina (de hoofdfunctie)
    ├── documentatie.html  ← uitleg
    ├── style.css
    └── js/
        ├── serial.js      ← Web Serial bridge naar micro:bit
        ├── speech.js      ← Web Speech STT/TTS
        ├── webcam.js      ← getUserMedia + snapshot
        ├── chat.js        ← praat met /api/chat
        └── app.js         ← orchestratie + state machine
```

## Hoe data stroomt

```
[microfoon] → Web Speech STT ─┐
[webcam]    → snapshot ───────┼→ /api/chat → Claude Vision → tekst → TTS → [speakers]
                              │
[HuskyLens] → I2C → micro:bit → USB-serial → Web Serial API
                              │
                  filter: stuur snapshot alleen als HuskyLens een gezicht ziet
```

## Troubleshooting

- **"Web Serial niet ondersteund"** — gebruik Chrome of Edge, niet Firefox/Safari.
- **micro:bit verschijnt niet in poort-lijst** — sluit andere programma's die de seriële poort gebruiken (MakeCode browser, mu-editor).
- **Webcam-permissie geweigerd** — sessie draait wel door, maar zonder beeldcontext. Toegang aanzetten in browser-instellingen om te herstellen.
- **Geen Nederlandse stem** — Windows Settings → Time & Language → Speech → voeg Nederlands stempakket toe. Anders pakt 'ie de standaardstem.
- **API key error** — check dat je `.env` (niet `.env.example`) hebt en server opnieuw starten.

## Eerlijke beperking

De HuskyLens doet géén echte emotie-classificatie. Hij heeft hier een eerlijke ondersteunende rol: gezicht aanwezig ja/nee. De daadwerkelijke emotionele context komt van Claude Vision die een snapshot van de webcam leest. Daar is Claude wél voor getraind — en zelfs dán behandelt het systeem die data als zwak signaal.
