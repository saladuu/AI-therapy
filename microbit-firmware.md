# micro:bit firmware — Mindwell sensor bridge

Deze code leest de HuskyLens (face recognition) plus de ingebouwde lichtsensor van de micro:bit, en stuurt elke 500ms een JSON-regel over USB-serial. De website leest dat via de Web Serial API.

In **optie 2** (huidige setup) gebruikt de HuskyLens alleen **face detectie als trigger**: zodra hij een gezicht ziet, weet de website dat de gebruiker in beeld is, en mag een webcam-snapshot naar Claude. Geen 7 emoties trainen — gewoon één gezicht.

## Hardware-koppeling

HuskyLens ↔ micro:bit (via I2C):

| HuskyLens | micro:bit (Wukong / breakout board) |
|-----------|-------------------------------------|
| T (groen) | SCL — pin 19                        |
| R (blauw) | SDA — pin 20                        |
| + (rood)  | 3.3V                                |
| − (zwart) | GND                                 |

DIP-switch op de HuskyLens op **I2C** (niet UART).

> **Stroom:** de HuskyLens trekt tot 320mA. Te veel voor de micro:bit alleen. Voed de HuskyLens via z'n eigen micro-USB poort (op een powerbank of laptop), of via de externe 5V-aansluiting van je breakout board.

## HuskyLens trainen — één gezicht is genoeg

1. Schakel HuskyLens in.
2. Veeg op het scherm naar links/rechts tot je **"Face Recognition"** ziet bovenaan.
3. Long-press de functieknop → submenu opent.
4. Veeg naar **"Learn Multiple"** → short-press → zet 'm op **OFF** (we leren maar één gezicht).
5. Ga terug uit het menu (long-press functieknop).
6. Kijk in de camera met een normale uitdrukking. Het kruis verschijnt op je gezicht. Druk **kort op de Learn-knop** (oranje) om dit gezicht op te slaan als ID 1.
7. Vanaf nu detecteert de HuskyLens of jij in beeld bent — vierkant + "ID: 1" als ja, kruis als nee.

> Dit hoeft maar één keer. De HuskyLens onthoudt z'n training totdat je 'm wist.

## MakeCode-code

Open [makecode.microbit.org](https://makecode.microbit.org/), maak een nieuw project, voeg de HuskyLens-extensie toe:

**Settings (tandwiel) → Extensions → zoek "huskylens" → DFRobot/pxt-DFRobot_HuskyLens**

Klik rechtsboven op **JavaScript** en plak deze code:

```typescript
// Mindwell — sensor bridge
// Stuurt elke 500ms: {"face":<0 of 1>,"light":<0..255>}
// face = 1 als de HuskyLens een bekend gezicht ziet, anders 0

huskylens.initI2c()
huskylens.initMode(protocAlgorithm.ALGORITHM_FACE_RECOGNITION)

serial.redirectToUSB()
serial.setBaudRate(BaudRate.BaudRate115200)

// Klein hartslagje bij start zodat we weten dat de code draait
basic.showIcon(IconNames.Yes)
basic.pause(300)
basic.clearScreen()

basic.forever(function () {
    huskylens.request()

    let facePresent = 0
    if (huskylens.isAppear(1, HUSKYLENSResultType_t.HUSKYLENSResultBlock)) {
        facePresent = 1
    }

    let light = input.lightLevel() // 0..255

    // Visuele feedback: hartje als gezicht herkend, leeg anders
    if (facePresent) {
        basic.showIcon(IconNames.SmallHeart)
    } else {
        basic.clearScreen()
    }

    serial.writeLine(`{"face":${facePresent},"light":${light}}`)
    basic.pause(500)
})
```

Klik **Download** en sleep het `.hex`-bestand naar de micro:bit (verschijnt als USB-drive).

## Test of het werkt

1. micro:bit aangesloten op laptop met USB.
2. Open een serial monitor (in MakeCode: terminal-icoon onderaan, of de Arduino IDE serial monitor op 115200 baud).
3. Verwacht regels zoals:
   ```
   {"face":0,"light":143}
   {"face":1,"light":141}
   {"face":1,"light":140}
   ```
4. **Sluit de seriële monitor** (anders kan de browser de poort niet pakken).
5. Open Mindwell in Chrome → klik **Verbind micro:bit** → kies de poort.

## Wat de micro:bit-LEDs betekenen

- **Vinkje bij start** = code draait
- **Hartje** = HuskyLens ziet je gezicht
- **Leeg scherm** = geen gezicht in beeld

## Veelvoorkomende problemen

- **`huskylens.initI2c()` blijft hangen** — controleer SDA/SCL kabels en dat HuskyLens op I2C staat (DIP-switch op de zijkant).
- **HuskyLens reset onverwacht** — stroom-tekort. Voed via micro-USB van de HuskyLens zelf.
- **`isAppear` is altijd false** — je hebt nog geen gezicht geleerd, of "Learn Multiple" stond niet op OFF. Check op het schermpje van de HuskyLens of er "ID:1" staat als je in beeld bent.
- **Lichtwaarde altijd 0** — de lichtsensor zit op de LED-matrix; werkt dus alleen als de matrix kort uit knippert (gebeurt automatisch bij `showIcon`).
