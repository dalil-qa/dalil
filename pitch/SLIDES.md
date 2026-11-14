# Slides: what goes in the presentation

**How to present it:** [PITCH_SCRIPT.md](PITCH_SCRIPT.md) · **Qatar numbers & sources:** [PITCH_SCRIPT.md §6](PITCH_SCRIPT.md#6-qatar-impact-numbers-and-sources) · **Health sources & review log:** [docs/CONTENT_REVIEW.md](../docs/CONTENT_REVIEW.md)

---

## Design rules

- **One idea per slide.** At most about 15 words on a slide; the speaker says the rest.
- **Big numbers, few words.** "22 min" in huge text beats a paragraph.
- **Brand:** dark navy background (`#0b1426` to `#0a3442`), cyan (`#22d3ee`, `#0e7490`) and gold (`#fde68a`). App icon: [app/public/favicon.svg](../app/public/favicon.svg).
- **Status colours always come with an icon** (✓ green / OK, ! amber / Watch, ✕ red / Call surgeon), so colour-blind judges can read them. They match the device LED.
- **Every fact gets a small source line** at the bottom of its slide, for example `Source: NASA Human Research Program`.
- **Images:** use our own hardware photos and real app screenshots. Credit any external image.
- **Export a PDF copy** in case the venue laptop or slide software fails.

---

## Main slides (in order)

| # | Slide | On screen | Notes |
|---|---|---|---|
| 1 | **Title** | The Dalil wordmark (**Dalil دليل**), "Crew health, guided by evidence", *Create Health Monitoring Software for Astronauts on Space Missions*, the team's names, "NASA Space Apps 2026 · Doha" | On screen while the team walks up |
| 2 | **Hook** | A dark slide with Earth and Mars and one huge number: **"22 min"**, with "one way" under it | Say the hook over it; don't read it |
| 3 | **Problem** | NASA's 5 hazards as 5 icons: Radiation, Isolation, Distance, Gravity, Hostile Environment. Below: "In flight, most of NASA's standard health tests happen about twice a mission." | Sources: [NASA 5 Hazards](https://www.nasa.gov/hrp/hazards/) and Spaceflight Standard Measures ([docs/content-quotes.md](../docs/content-quotes.md)) |
| 4 | **Solution** | A photo of the **real station** next to a screenshot of the app's Body screen. Three labels: "30-second check", "Learns *your* normal", "Advice with sources" | Use the real station photo |
| 5 | **Live demo** | Only "Live: 30-second check" | Switch to the app here (see [PITCH_SCRIPT.md](PITCH_SCRIPT.md#3-the-judge-demo-step-by-step)) |
| 6 | **How it works** | Three columns: 📡 **Measured** (heart rate, SpO2, skin temperature) · ✍️ **Logged** (blood pressure, blood sugar, sleep, mood, symptoms, exercise, water, meals) · 🔗 **Next** (Bluetooth cuffs, wristbands). Under them: "Vital ranges from NHS, CDC, WHO & MedlinePlus · Spaceflight guidance from NASA-STD-3001 + each astronaut's own baseline" | One simple diagram, no wiring or code |
| 7 | **Mars, day 47** | Screenshot of the Trends chart, with Crew Member 2's resting heart rate stepping above their baseline and status turning amber (Watch). Then the Flight Surgeon ("Earth") screen with the Mars signal-delay countdown | A backup in case the live app fails; normally show this part live |
| 8 | **Built to be trusted** | ✓ Rejects bad readings (signal-quality check) · ✓ Every tip cites its source · ✓ Never diagnoses; red always goes to a human · ✓ Works offline | Emergency button ("I feel unwell now") uses zero AI and works offline |
| 9 | **The data** | Four columns: **Spaceflight guidance:** NASA-STD-3001, OCHMO Technical Briefs & CSA · **Vital ranges:** NHS, CDC, WHO & MedlinePlus · **History:** 47-day sample data built inside those ranges (🧪 labelled) · **Live:** our own station (📡). One line: "Real astronaut vitals aren't public, so we label sample data openly." | Full breakdown in [docs/CONTENT_REVIEW.md](../docs/CONTENT_REVIEW.md) |
| 10 | **Impact in Qatar** | "60+: ~60,000 → ~690,000 by 2050" · "1 in 4 adults: diabetes" · "1 in 3 Qataris: high blood pressure". Screenshot of Dalil's built-in **Home mode** (huge text, one button, plain words, "Send to family") | Sources in small text: WHO, IDF, Qatar STEPwise ([PITCH_SCRIPT.md §6](PITCH_SCRIPT.md#6-qatar-impact-numbers-and-sources)) |
| 11 | **What's next** | 1. Connect Bluetooth health devices · 2. AI model running on board, no Earth link needed · 3. A pilot with a clinic or home-care service in Qatar · 4. Clinician sign-off & Ministry of Public Health approval path | Say "we'd like to pilot with", never "we are working with" |
| 12 | **Close** | The logo, **"Dalil: guide, and evidence."**, a QR code to the public repo and live app, the team's names | Leave this up during Q&A |

---

## Backup slides (after the close, only if a judge asks)

| Slide | On screen |
|---|---|
| **A. Architecture** | Station (ESP32) → USB Web Serial → React app in Chrome → deterministic threshold + baseline rules → Coach (Cloudflare Workers AI · Llama 3.3 70B Instruct) → offline written cards if there's no internet |
| **B. Hardware** | Parts photo: ESP32, MAX30102 pulse oximeter, MLX90614 IR thermometer, 0.91" OLED, button, RGB LED, buzzer. "About QAR 290 in parts (with spares)" |
| **C. Safety & clinical review** | "Not a medical device: guidance only." Red-flag symptoms bypass AI and open the offline Emergency screen. Open clinical threshold decisions are documented for clinician sign-off in [docs/CONTENT_REVIEW.md](../docs/CONTENT_REVIEW.md) |
| **D. Sources** | NASA-STD-3001, 14 NASA OCHMO Technical Briefs, Spaceflight Standard Measures, NASA HRP, CSA radiation page, plus MedlinePlus, NHS, NHS England, CDC, WHO, IDF, and Qatar STEPwise |
| **E. AI use** | **Live Coach:** Cloudflare Workers AI (Meta Llama 3.3 70B Instruct), restricted to citing our written cards. **Emergency & red-flag detection:** zero AI. **Build assistance:** Claude Code used to help draft code and text, verified by unit tests, E2E checks, and a 91-claim PDF quote verifier |
| **F. Verification & testing** | Automated unit tests for baseline/status rules, Web Serial parser and Coach safety guardrails; Playwright browser E2E checks across phases; 91/91 NASA PDF quotes verified via `scripts/content/verify_quotes.py` |

---

## If running the Pulse Sensor backup (no MAX30102)

- Slides 4, 6 and B: state that the station measures **heart rate and skin temperature**, and that **SpO2 is entered by hand for now**.
- Slide 11: add "SpO2 sensor" as the first next step.
- Never show a live SpO2 number from the simulator without stating it is simulated.

---

## Final slide checklist

- [ ] 12 main slides plus backups A–F, in brand colours
- [ ] Every fact slide has its source line at the bottom
- [ ] Real station photo and current app screenshots included
- [ ] PDF copy saved on the demo laptop's desktop **and** on a phone
- [ ] Tested on 16:9 screen aspect ratio
