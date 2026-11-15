# Baseera (بصيرة), by Team Baseera: Complete Presenter Master Guide

Everything **Abdullah** and **Sulaiman** must know for **NASA Space Apps Challenge Doha 2026**—in one document.

**The spoken script and stage cues live only in [PITCH_SCRIPT.md](PITCH_SCRIPT.md)** and the slides in [SLIDES.md](SLIDES.md), so there is one copy to keep up to date. This guide is the background, the hardware, the maths, the screens and the full Q&A. **The judges, the rubric and judge-specific answers:** [JUDGES_AND_RUBRIC.md](JUDGES_AND_RUBRIC.md). **The 30-second video:** [VIDEO_30S.md](VIDEO_30S.md).

---

## PART 1: Identity, Core Story & Stage Roles

### 1.1 Names & Meaning
- **Team Name:** **Team Baseera (بصيرة)** — Arabic for *"insight / foresight / clear vision"*. One name for both: how we see the problem, and what we give people.
- **Project Name:** **Baseera (بصيرة)**, the same as the team: Arabic for *"insight"*, seeing clearly.
  - **Seeing clearly:** Shows an astronaut (or an older adult at home in Qatar) what their numbers mean and what to do next.
  - **Grounded in sources:** Every vital range, spaceflight risk, and health action cites a verified NASA document or public-health authority (NHS, CDC, WHO, MedlinePlus).
- **Challenge:** *Create Health Monitoring Software for Astronauts on Space Missions* (Category: **HealthTech** · Stage: **Working MVP**).
- **3-Word Memory Anchor (repeated 3× in the pitch):** **`Personal. Sourced. Immediate.`** *("Sourced", not "Proven": the thresholds still await clinician sign-off, so "proven" invites "proven by whom?". Every tip is sourced today.)*

### 1.2 Why Baseera Exists (The Problem in Space & in Qatar)
1. **The Communication Delay in Deep Space:**
   - On the Space Station (ISS), Earth is **1 second** away. On the Moon, it is **1.3 seconds** away.
   - On a **Mars mission**, radio signals take from about **3 minutes** (planets closest) to **up to 22 minutes one way** (planets farthest), so **up to 44 minutes** for a reply to come back. The app's Mars transit demo uses **14 minutes one way / 28 minutes round trip** as an example. **On stage, always say "up to 22 minutes"**, never "14 to 22".
   - If an astronaut's heart starts racing or oxygen drops, they cannot have a live phone call with a flight surgeon on Earth—they must catch problems early and act on board while waiting for Earth's reply.
2. **Infrequent In-Flight Testing:**
   - NASA's *Spaceflight Standard Measures* program tracks astronauts against their pre-flight baseline, but in flight most standard medical tests happen **only about twice per mission** (or rely on samples returned to Earth). Nobody checks every morning.
3. **The Same Gap in Qatar:**
   - An older parent living at home in Doha with diabetes or high blood pressure faces the exact same gap: their doctor is not in the room every morning, smartwatches have tiny screens and need daily charging, and subtle changes go unnoticed until they become an emergency.

### 1.3 Presenter Division (Why Sulaiman Speaks Last)
- **The Crew Member (actor, no lines):** the Station Host, or a rehearsed volunteer, or Sulaiman only if nobody else is there. Gets dizzy and sits down safely at `0:00`, gets up on Abdullah's "Now rewind". It's a dizzy spell (orthostatic intolerance, NASA TB-019), **never a heart attack**: Baseera can't detect heart attacks, and the drama must not suggest it can.
- **Abdullah (Human Story, Hook & Qatari Impact — No Q&A):**
  - **Part 1 (`0:00–0:50`, Slide 1):** a silent staged dizzy spell by the Crew Member (actor), the Mars signal-delay hook, "Now rewind" (the actor gets up), the about-twice-a-mission testing gap, and introducing Baseera.
  - **Part 3 (`1:55–2:32`, Slide 5):** Connecting Mars to Doha, the 3 official Qatar statistics (WHO, IDF, STEPwise), and Baseera's built-in **Arabic & English Home Mode**.
  - **During Q&A:** Stands beside Sulaiman; Sulaiman answers 100% of questions.
- **Sulaiman (Technical MVP, NASA Evidence, Close & 100% of Q&A):**
  - **Part 2 (`0:50–1:55`, Slides 2–4):** How the 30-second station + personal baseline work (`Slide 2`), the Day 47 Mars amber and red walkthrough on **sample mission data** (`Slide 3`), and the comparison table (`Slide 4`).
  - **Part 4 (`2:32–2:52`, Slide 6):** Roadmap, final close, and inviting judges to press `START` on the station on their desk while he takes questions.
  - **During Q&A:** Because Sulaiman speaks last (`2:32–2:52`), he already holds the microphone and the judges' eye contact when Q&A starts—he answers **all** questions (technical, NASA sources, AI safety, hardware, and Qatar rollout).

### 1.4 The Two-Screen Stage Setup
- **Main Stage Screen (Projector):** Shows **only the slides (`Slide 0` to `Slide 6`)** with high-resolution screenshots of the app. **Zero `Alt+Tab` switching** on the projector—no HDMI lag or resolution glitches.
- **Judges' Desk (Right in Front of Judges):** A dedicated laptop running the live Baseera web app (`F11` full-screen, sleep disabled) connected via USB to the physical **Baseera Crew Health Station**.
  - **Before `0:00`:** Leave the desk laptop open on Crew Member 2's **Today** screen (`Mars transit · Day 47`).
  - **At `2:52` (Start of Q&A):** As Sulaiman invites the judges to try it, the Station Host wipes the finger slot, switches the desk laptop to **Guest → Check**, and lets a judge press `START` to run a live 30-second check on themselves while Sulaiman answers Q&A.

---

## PART 2: The Spoken Script

**See [PITCH_SCRIPT.md](PITCH_SCRIPT.md).** It is the only copy of the words, timings, pauses and gestures (about 2:52 inside the 3:00 slot, including the opening drama and its safety rules). Kept in one place so the two files can't drift apart.

**The lines both presenters must say exactly:** "**up to** 22 minutes" · "**about** twice a mission" · "this is **sample** mission data" · "fixed rules decide red, **never the AI**" · "**Personal. Sourced. Immediate.**" · and the actor gets up on "**Now rewind**"

---

## PART 3: The Physical Hardware ("Baseera Crew Health Station")

### 3.1 Inside the Box (~QAR 290 planned, including spares: **confirm against the receipts before quoting it**)

**Tested on the real board (15 Nov 2026, firmware 1.2):** all three sensors found on 10 restarts in a row, and the automated station contract tests pass (`scripts/station/contract_test.py`). See [firmware/README.md](../firmware/README.md).
1. **ESP32 DevKit microcontroller** (`firmware/dalil_station/dalil_station.ino`) — runs the measurement state machine and communicates with Chrome/Edge over **USB Web Serial** at `115200` baud using newline-delimited JSON.
2. **MAX30102 pulse oximeter sensor** — sits inside a dark finger slot; uses red and infrared LEDs to measure **resting heart rate (`bpm`)** and **blood oxygen (`SpO2 %`)** from the fingertip. *(If running the Pulse Sensor backup, it measures heart rate only, and the app automatically opens a manual `SpO2` field in Quick Log.)*
3. **MLX90614 contactless infrared thermometer** — sits behind a window with a 5 cm forehead guide; measures **forehead skin temperature (`°C`)**.
4. **0.91" OLED display (`128×32`)** — displays step-by-step instructions and live numbers right on the box (`Press START`, `Finger 20s`, `Forehead 5s`, `HR 72 SpO2 98`).
5. **Physical `START` button + RGB status LED + active buzzer** — lets the user start or cancel a check from the box; the RGB LED lights up **Blue** while measuring, then **Green (`OK`)**, **Amber (`Watch`)**, or **Red (`Act`)** to match the app's assessment.

### 3.2 How the 30-Second Check & Signal Gate Work
- **Step 1 — Fingertip (20 seconds):**
  - User rests their fingertip gently in the slot (pressing hard squeezes capillaries and weakens the optical pulse).
  - The first 2.5 seconds after the finger lands are ignored while the signal settles (firmware 1.2; they don't count toward the 20 s). Then the station computes live `hr`, `spo2`, and a **Signal Quality score (`q` from `0.0` to `1.0`)** based on beat-to-beat consistency, dropping outliers before averaging. The box's screen coaches "! Keep still" or "! Rest finger lightly" when the signal is poor.
  - **Hardware Signal Gate:** If no finger is detected for 15s (`no_finger`) or the signal is too noisy (`bad_signal`), the station sends an error instead of guessing. If `q < 0.5`, the app flags the check as **low-confidence**, warns the user to re-measure, and **excludes that reading from the 7-day baseline**.
- **Step 2 — Forehead (5 seconds):**
  - User holds their forehead ~5 cm from the window for 5 seconds while the IR sensor averages forehead skin temperature.
- **Watchdog & Simulator Resilience:**
  - If the microcontroller stops responding for 6 seconds mid-check, the app's watchdog timer aborts the check and shows a one-tap **`Use the simulator`** fallback button.
  - The built-in **Simulator (`simulator.ts`)** emits the exact same JSON messages (`hello`, `finger`, `forehead`, `done`, `error`) as the ESP32 hardware.

---

## PART 4: The Math, Clinical Thresholds & Personal Baseline Engine

All status decisions are made by **100% deterministic TypeScript rules** (`status.ts` and `baseline.ts`)—**AI never decides if a reading is Green, Amber, or Red.**

### 4.1 The 3 Status Levels
- **`✓ OK` (Green):** Inside the safe clinical range AND within your personal baseline.
- **`! Watch` (Amber):** Outside the green range (but inside the amber boundary), OR a **3-day personal baseline shift**, OR a **12 bpm drift from pre-flight normal**, OR a missed daily habit target (like sleep < 7 hours).
- **`✕ Call surgeon` / `Call doctor` (Red / `Act`):** Outside the amber boundary. **Crucial rule:** Only clinical range breaches can trigger Red (`Act`); a personal baseline shift alone only ever triggers Amber (`Watch`).

### 4.2 All 11 Indicators & Their Sources (`thresholds.json`)

| Indicator | How It Enters Baseera | Green (`OK`) | Amber (`Watch`) | Red (`Act`) | Official Source |
|---|---|---|---|---|---|
| **1. Resting Heart Rate (`hr`)** | Measured by station (finger) | `60–100 bpm` | `40–59` or `101–130 bpm` *(or baseline rule)* | `< 40` or `> 130 bpm` | **MedlinePlus** (`60–100 bpm` normal resting; `40/130` & baseline band are team defaults) |
| **2. Blood Oxygen (`spo2`)** | Measured by station (finger) | `95–100%` | `93–94%` | `≤ 92%` | **NHS England** home pulse oximetry guide |
| **3. Forehead Skin Temp (`temp`)** | Measured by station (forehead) | `31.0–35.6 °C` | `< 31.0` or `35.7–37.9 °C` *(or baseline rule)* | `≥ 38.0 °C` | **Ng et al. (2005)** infrared forehead study (`31.0–35.6 °C` skin range) + **NHS** (`≥ 38.0 °C` fever) |
| **4–5. Blood Pressure (`bp_sys/dia`)** | Quick Log (cuff) | `90–134 / 60–84 mmHg` | `< 90/60` or `135–180 / 85–120 mmHg` | `> 180` or `> 120 mmHg` | **NHS** (home BP `135/85` high, `<90/60` low) + **CDC** (`>180/120` crisis) |
| **6. Fasting Blood Sugar (`glucose`)** | Quick Log (glucometer) | `70–99 mg/dL` | `54–69` or `100–125 mg/dL` | `< 54` or `≥ 126 mg/dL` | **CDC** fasting blood glucose thresholds |
| **7. Sleep (`sleep`)** | Quick Log | `≥ 7 hours` | `< 7 hours` | *(Never Red)* | **NASA OCHMO TB-041** (adults need `7–9 h`; astronauts average `~6 h`) |
| **8. Mood (`mood`)** | Quick Log (`1–5` emojis) | `3–5` | `1–2` | *(Never Red)* | **NASA OCHMO TB-016** Behavioral Health (`1–5` scale is team convention) |
| **9. Water (`water`)** | Quick Log | `≥ 2.0 L` (`2000 ml`) | `< 2.0 L` | *(Never Red)* | **NASA OCHMO TB-027** (ISS crews averaged `2.0–2.3 L/day`; NASA plans `2.5 L`) |
| **10. Exercise (`exercise`)** | Quick Log | `≥ 22 min/day` | `< 22 min/day` | *(Never Red)* | **WHO** (`150 min/week` ≈ `22 min/day`; NASA crews do `~2 h/day` per **TB-013**) |
| **11. Meals (`meals`)** | Quick Log (`0–3`) | `3 meals` | `< 3 meals` | *(Never Red)* | **NASA OCHMO TB-013** Food & Nutrition |

### 4.3 The Personal Baseline Algorithm (`baseline.ts`)
1. **7-Day Rolling Median:** For `hr` and `temp`, Baseera takes the median of daily readings over the **7 days before today** (`today - 7` to `today - 1`), excluding pre-flight days (`day <= 0`) and weak-signal readings (`q < 0.5`). Requires **at least 5 days** of data (otherwise it says *"Still learning your normal: X of 5 days so far"*).
2. **3-Day Sustained Deviation (`Watch`):**
   - **Heart Rate:** More than **`8 bpm`** above or below your 7-day normal for **3 consecutive days** (`today`, `yesterday`, `2 days ago`).
   - **Skin Temperature:** More than **`1.0 °C`** above or below your 7-day normal for **3 consecutive days**.
3. **Pre-Flight Drift (`Watch`):**
   - Compares your current 7-day normal against your **Pre-Flight Normal** (median of readings on or before `Day 0`, needing ≥3 readings). If resting heart rate has shifted by more than **`12 bpm`** since before launch, it flags **Amber (`Watch`)**.
4. **Why Crew Member 2 on Day 47 Is Amber (The Demo Story):**
   - **This is sample data** (real astronaut vitals are private). Say so on stage.
   - Days 38–44: Crew Member 2's heart rate sits at **`63–65 bpm`**. On Day 45 it **jumps to `74 bpm` and stays there** on Days 46 and 47. It's a step, not a slow creep, so say "jumped ten beats and stayed up", never "crept up".
   - Their 7-day normal is `64 bpm` on Days 45–46 and `65 bpm` on Day 47 (the window then includes two of the 74s), so each day is `+9` to `+10 bpm` above normal, beyond the `8 bpm` band for 3 days in a row. Meanwhile sleep fell to `5.5 h`, mood to `2/5`, water to `1.2 L` and meals to `2/3`, with `fatigue` logged on Days 46–47.
   - `74 bpm` is well inside the textbook `60–100 bpm` green range, so a normal device says nothing. Baseera catches the personal shift over 3 days and turns **Amber (`Watch`)**.

---

## PART 5: Screen-by-Screen Guide to the Web App

### 5.1 Top Header Bar & Left Navigation
- **Mission Switcher:** `Space Station` (`1s` delay), `Moon base` (`1.3s`), `Lunar rover` (`1.3s`), `Mars transit` (`14 min` example / up to `22 min` max).
- **Crew Switcher:** `Crew Member 1` (all OK), `Crew Member 2` (Day 47 Amber demo), `Crew Member 3` (all OK), and **`Guest`** (blank session for judges; saves nothing to storage).
- **Connection Pill:** Shows `Station connected` (USB hardware), `🧪 Simulator`, `Connecting…`, or `No station`.
- **`I feel unwell now` Red Button:** Always visible in the top right; opens the offline Emergency screen in one tap.

### 5.2 The 7 Main Tabs + Emergency + Home Mode
1. **`Today` (`Today.tsx`):**
   - **Crew Health Score Ring (`0–100`)**, **`Start morning check` button**, **`47-day streak`**, and **10 clickable metric tiles** (each with value, status badge, source icon `📡/🧪/✍️`, and 7-day sparkline), plus **Today's routine** checklist and **Badges**.
2. **`Check` + `Quick Log` (`Check.tsx` & `QuickLog.tsx`):**
   - Guided 2-step station check (`20s` finger + `5s` forehead) with live beating heart, `SpO2 %`, signal-quality bar, result screen with station LED indicator, and optional 20-second **Quick Log** (BP, glucose, sleep, mood, water, exercise, meals, symptom chips, and red-flag emergency triggers).
3. **`Body` (`Body.tsx`):**
   - Interactive **SVG human body figure** split into **8 body systems** (*Heart, Lungs, Brain & Eyes, Bones & Muscles, Fluid & Kidneys, Food & Blood Sugar, Skin & Temp, Immune*) colored Green/Amber/Red.
   - **NASA's 5 Hazards filter buttons** (*Radiation, Isolation, Distance, Gravity, Environment*) highlight which organs each hazard affects.
   - Right panel answers **NASA's 5 medical questions** for the selected system and displays matching guidance cards + NASA PDF links.
4. **`Trends` (`Trends.tsx`):**
   - Recharts line graphs (`7 days`, `30 days`, `Whole mission`) showing the **Green safe range**, the **Cyan personal-baseline band (`Your normal ± 8 bpm`)**, the **Gold dashed pre-flight baseline (`Before launch`)**, colored status dots for each day, and rule-based **Insight cards** at the bottom.
5. **`Coach` (`Coach.tsx`):**
   - Auto-generated suggested question pills + chat interface powered by **Meta Llama 3.3 70B Instruct** on Cloudflare Workers AI.
   - Every reply shows clickable **Source Pills** that expand the exact pre-written NASA/clinical guidance card. Falls back to displaying local written cards if offline.
6. **`Flight Surgeon` / `Earth` (`Earth.tsx`):**
   - Shows the mission's signal delay, an animated satellite-to-Earth progress bar (**`DelayAnimation`**) counting down delivery (`14 min`) and round-trip reply (`28 min`), the structured medical report (`Show full report`), an optional AI/template summary paragraph, and **"While you wait"** action steps.
7. **`Sources` & `Settings` (`Sources.tsx` & `Settings.tsx`):**
   - **Sources:** Complete audit list of every NASA PDF and public-health URL used in the app, plus full AI disclosure.
   - **Settings:** Connect USB station, pick simulator scenarios (`Normal`, `Watch`, `Act`, `Bad signal`, `No finger`, `Pulse Sensor`), change Mission Day, reset to the Day 47 Mars demo, or turn on **Home Mode** (`English` / `العربية Arabic RTL`).
8. **`Emergency` (`Emergency.tsx` — `"I feel unwell now"`):**
   - **100% offline, zero AI, zero medicine doses.** Immediately turns the station LED **Red**, sends a `PRIORITY` report, lets the user tap red-flag symptoms (*chest pain, breathing, fainting, severe headache, confusion, stroke signs*), walks through 4 steps (`Tell a crewmate` / `Call 999`, `Contact flight surgeon` / `Notify family`, `While you wait` NHS checklist, `Follow procedures`), and warns that *normal sensor readings never rule out a heart attack*.
9. **`Home Mode` (`Home.tsx` — Qatar Elderly Edition in English & Arabic RTL):**
   - Strips out all space jargon, enlarges all text, and adds a one-tap **`العربية` / `English`** button that flips the layout to **Right-to-Left (RTL) Arabic**.
   - Features one huge **`Start check` (`ابدأ الفحص`)** button, plain-language sentences (*"Your heart rate is normal today"* / *"نبض القلب طبيعي اليوم"*), **`Send to family` (`أرسل إلى العائلة`)**, and a **`Call 999` (`اتصل بـ 999`)** banner on Red results.

---

## PART 6: Complete Q&A Playbook for Sulaiman (Under 20 Seconds Each)

**Rule:** **Sulaiman answers 100% of Q&A questions.** Always lead with the direct answer in your first sentence.

### A. NASA Data, Clinical Sources & Verification
1. **"Where do your health ranges and NASA data come from?"**
   > "Our spaceflight risks, countermeasures, and guidance cards come from **NASA-STD-3001**, **14 NASA OCHMO Technical Briefs**, and the **Canadian Space Agency**—verified across **91 exact PDF quotes** by our automated script. Because NASA-STD-3001 doesn't set numeric resting vital ranges, our vital-sign thresholds come from **MedlinePlus, the NHS, CDC, and WHO**, all logged in `docs/CONTENT_REVIEW.md`. Real astronaut vitals are private, so our 47-day history is labelled sample data."
2. **"Why is forehead temperature 31.0 to 35.6 °C instead of 37 °C?"**
   > "37 °C is internal core body temperature. Forehead skin temperature sits lower—published infrared thermometry studies (Ng et al., 2005) put normal forehead skin temperature between **31.0 and 35.6 °C**, while **38.0 °C or above** triggers an immediate fever escalation, alongside tracking a **1 °C** sustained rise above your personal 7-day baseline."
3. **"Why did the app say 14 minutes on screen when you said up to 22 minutes / 44 minutes in the hook?"**
   > "The delay depends on where the planets are: about **3 minutes** one way when Mars is closest, up to **22 minutes** when it's farthest. That's why we said 'up to'. The app's Mars transit example uses **14 minutes** one way, 28 for a reply."

### B. AI Safety, Offline Operation & Privacy
4. **"How do you prevent the AI Coach from hallucinating dangerous medical advice?"**
   > "Four hard guardrails in code: first, red-flag words in English or Arabic (*chest pain, can't breathe, ألم في الصدر*) bypass AI completely and open our offline Emergency screen. Second, `Llama 3.3 70B` on Cloudflare Workers AI only receives our 23 verified guidance cards. Third, our post-processor strips any unknown card ID, blocks medication or dosage strings, and forces flight-surgeon escalation on any red reading. Fourth, if Wi-Fi drops, it falls back to our local written cards."
5. **"What happens if there is no internet connection?"**
   > "Once the app has loaded, everything critical runs offline in the browser and on the station: the signal check, the threshold and 7-day baseline rules, the Body and Trends screens, and the Emergency screen. Only the Coach calls our Cloudflare Worker, and offline it shows the matching written cards instead. On a real mission, the AI would run on board."
   *(Honest limit, if pushed: there's no offline cache yet, so the page must load once with a connection. For the pitch we keep a local build running as a backup.)*
6. **"How do you handle patient privacy?"**
   > "All readings stay locally in the browser on the device—there are no user accounts and no cloud database, and our stateless Coach Worker never logs readings or questions. Plus, Guest mode wipes everything the moment the session ends."

### C. Hardware, Accuracy & Limitations
7. **"How accurate is the hardware station, and how much did it cost?"**
   > **If you compared it with a shop-bought oximeter before the pitch, lead with that:** "On [N] people, our heart rate was within [X] bpm and oxygen within [Y]% of a pharmacy oximeter." *(Strongest answer you can give. Delete this line if you didn't measure; never guess the numbers.)*
   >
   > "It's built from hobby-grade parts, about **QAR [receipt total]**: an ESP32, a MAX30102 pulse oximeter, an MLX90614 infrared thermometer and a small screen, and it's tested on our real board. Because the sensors are hobby-grade, we never act on one raw number: the station checks signal quality every second, throws away readings when your finger moves, keeps weak readings out of your normal, and looks for a change that lasts three days."
8. **"What doesn't work yet / what are your limitations?"**
   > "Four things we state openly in `docs/CONTENT_REVIEW.md`: first, the sensors are hobby-grade with no ECG, so they cannot rule out a heart attack—and our Emergency screen warns the user of that every time. Second, the 47-day history is labelled sample data. Third, sending reports to Earth or family is simulated locally. Fourth, our combined threshold table awaits formal clinician and Ministry of Public Health sign-off before a clinical pilot."

### D. Qatar Impact, Elderly Users & Rollout
9. **"Where did your Qatar statistics come from?"**
   > "Every figure is officially sourced: the **tenfold growth** of residents aged 60+ (from **~60,000 to ~690,000 by 2050**) is from the **WHO's Healthy Ageing report on Qatar**; the **24.6%** adult diabetes rate is from the **2024 International Diabetes Federation Atlas**; and the **32.9%** hypertension figure for Qatari nationals aged 18–64 is from the **Qatar STEPwise national survey** published with the Ministry of Public Health."
10. **"Why wouldn't an older person in Qatar just use an Apple Watch?"**
    > "Three reasons: smartwatches have tiny menus, need daily charging, and suffer from wrist-motion noise. Baseera sits plugged in on the bedside table with a steady fingertip slot, and its built-in **Arabic and English Home Mode** gives older parents huge text, one giant Start button, plain-language sentences, and a one-tap alert to family or 999."
11. **"Who would use or pay for this in Qatar?"**
    > "In space, crew medical operations issue it in the mission kit. Here in Qatar, we target home-care services and primary health clinics following up older adults managing hypertension and diabetes—starting with a clinic pilot after clinician and Ministry of Public Health sign-off."

### E. Questions judges ask about the claims themselves
12. **"Smartwatches already learn your baseline. What's new?"**
    > "Right, and our table says so. What's new is everything after the number: every tip cites its NASA or public health source, the guidance and emergency steps work with no doctor and no internet, and it's built for the delay, with a report for the flight surgeon and first steps while you wait."
13. **"Is this a medical device? Is it approved in Qatar?"**
    > "No. Today it's a guidance prototype, not a diagnostic device, and the app says so on screen. Using it clinically in Qatar would need clinician sign-off and Ministry of Public Health approval, which is step three on our roadmap."
14. **"You say 'Sourced'. Has a doctor checked it?"**
    > "Not yet, and we say that openly. Every range and tip cites NASA or a public health body, and 91 NASA quotes are re-checked against the PDFs by a script. The ten decisions a clinician must make are listed in `docs/CONTENT_REVIEW.md`, ready for sign-off."
15. **"What did AI do in your project?"**
    > "It helped draft the code and text, and it powers the Coach. The team tested and checked everything, and it's disclosed on our Sources page and in the README. The AI never decides a status colour."
16. **"Was the Day 47 data real?"**
    > "No, it's sample mission data, and the slides say so. Real astronaut vitals are private. What's real is the station: the check you just did used live sensor readings."
17. **"Would Baseera have caught that fall?"** *(expect this one: it's the opening drama)*
    > "Not the fall itself: Baseera doesn't detect falls or heart attacks, and it says so. What it catches is the slower change in the days before, like the heart rate that jumped and stayed up for Crew Member 2. And if someone feels unwell, one button opens the emergency steps, offline."
18. **"Why a dizzy spell?"**
    > "Feeling faint on standing is a real spaceflight risk. NASA documents it as orthostatic intolerance, in a Technical Brief we use as a source."
