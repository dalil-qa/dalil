# Pitch script: what to say, who does what, and when the judge tries it

**The slides:** [SLIDES.md](SLIDES.md) · **Health sources & review log:** [docs/CONTENT_REVIEW.md](../docs/CONTENT_REVIEW.md)
**Length:** about **3 minutes** (with 90-second, 2-minute and 5-minute adaptations in section 5).

**Shape:** the problem in one sentence → our answer, shown live (the judge demo comes at 0:40) → the data → impact on Earth → what's next.

**Judging criteria covered:** Impact, Creativity, Validity, Relevance and Presentation.

---

## 1. Roles

| Role | Who | Job |
|---|---|---|
| **Speaker** | Sulaiman | Delivers the script and routes judge questions to the right teammate |
| **Demo driver** | App lead | At the laptop: switches between slides and app, runs the demo flow, flips to the simulator if needed |
| **Station host** | Hardware lead | Carries the station to the judge, wipes it, guides them through the 30-second check, answers hardware questions |
| **Timekeeper & team** | Team | Keeps time from the side and supports Q&A |

---

## 2. The script (about 3:00)

| Time | Slide | Who | Say (out loud) | Do |
|---|---|---|---|---|
| 0:00 | 2 Hook | Speaker | "Imagine you're on the way to Mars, and your heart starts doing something strange. You message the doctor on Earth. Your message takes **22 minutes** to arrive, and the answer takes 22 more. *(pause)* Out there, astronauts have to catch problems themselves, early." | Look at the judges, not the screen. Pause after "22 more" |
| 0:15 | 3 Problem | Speaker | "NASA names five hazards of spaceflight: radiation, isolation, distance, gravity and a hostile environment. NASA tracks every astronaut against their own baseline, but in flight most of those standard tests happen only about twice a mission. Nobody checks every morning." | |
| 0:30 | 4 Solution | Speaker | "This is **Dalil**, دليل. In Arabic it means both *guide* and *evidence*. It's a 30-second morning check: a station on the desk, and an app that learns your normal and explains every result with a source. Let's try it." | Station host picks up the station |
| 0:40 | 5 Live | Speaker, then station host | Speaker to the judges: "Could one of you try it? It takes 30 seconds, and nothing is saved." | **The judge demo** (section 3). Demo driver switches to the app in **Guest** mode |
| 0:45–1:20 | App | Speaker, while the station measures | "While it measures: the station checks the signal every second. If your finger moves, it throws the reading away instead of guessing. Then the app compares you with published clinical ranges and with your own baseline." When the result shows: "**[Judge's name], heart rate [74], oxygen [98], green.** Right in your range." | The body figure lights up. Read the numbers out loud. Thank the judge |
| 1:20 | App: Crew Member 2 | Speaker; driver clicks | "Now a real mission. **Day 47 to Mars.** Crew Member 2's resting heart rate has stepped up above their normal for several days in a row, while sleep and mood dropped. Each number alone sits inside the textbook range, but against their own baseline it's a change, so Dalil turns amber. The Coach explains why and cites NASA. And if a reading turns red, it opens the **Flight Surgeon** screen: a factual report for the doctor, and a live countdown to when Earth can answer." | Driver: Trends chart, then amber status, then Coach, then simulated red / Flight Surgeon ("Earth") screen |
| 1:50 | 9 Data | Speaker | "Every spaceflight risk and piece of guidance comes from **NASA's crew health standard, NASA-STD-3001**, NASA's Technical Briefs and Canadian Space Agency research, and our vital-sign ranges come from public health sources like the **NHS, CDC, WHO and MedlinePlus**. Real astronaut vitals aren't public, so our 47-day mission history is **sample data built inside those ranges**, and every live number comes from our own station." | The slide shows the sources. Say "sample data" clearly |
| 2:05 | 10 Impact | Speaker | "On Mars, the doctor is 22 minutes away. Here in Qatar, an older person living alone faces the same gap. And Qatar is ageing fast: people over 60 will grow more than tenfold by 2050. One in four adults has diabetes; one in three Qataris has high blood pressure. Dalil includes a built-in **Home mode**—huge text, one big button, plain-English results and a 'Send to family' alert. Next step: a clinic pilot." | Driver can briefly flash **Home mode** in the app or show Slide 10 (sources in section 6) |
| 2:30 | 11 What's next | Speaker | "With another month: Bluetooth health devices so nothing is typed, the AI model running on board with no Earth link, and a pilot with a clinic here in Qatar." | |
| 2:45 | 12 Close | Speaker | "Dalil means *guide*, and *evidence*. That's what it gives every astronaut, and everyone whose doctor is far away. Thank you." | Smile, stop talking, leave slide 12 up |

**If running the Pulse Sensor backup (no MAX30102):** say "heart rate [74] and skin temperature [34.2], green", never an oxygen number, and add "oxygen is typed in for now; an SpO2 sensor is our next part".

---

## 3. The judge demo: step by step

**When:** at **0:40**, straight after the Solution slide.

**Before the pitch:**
- Run one full check 15 minutes before going on stage to confirm everything works.
- Leave the app in **Guest** mode (nothing saved).
- Use a **1–2 m USB data cable**, so the station can reach the judges' table.
- Keep alcohol wipes and a tissue in the station host's pocket.

**Step by step (station host):**
1. Walk to the judge who looks most interested. **Ask:** "May I? It's a fingertip and a forehead reading, and nothing is saved."
2. **Wipe** the finger slot and the forehead guide in front of them.
3. "Press START." *(the LED turns blue)*
4. "Rest your fingertip in the slot. **Don't press,** just let the lid rest on it, and keep still." *(about 20 s)*
5. "Now hold your forehead at the window." *(about 5 s)*
6. Step back so the judge sees the screen. The speaker reads the result.
7. Wipe the station again and thank them.

**Tips:**
- Cold hands give weak signals. If the room is cold, ask the judge to rub their fingertips together first.
- If no judge wants to try, the station host does the check on themselves, without fuss.
- **Never let a failure take more than 15 seconds.** Use the fallback ladder below.

---

## 4. Fallback ladder

| What happens | Say | Do |
|---|---|---|
| The station shows "Try again" | "That's the quality check refusing a bad signal, which is exactly what it's for. Once more." | Retry **once** |
| It fails again | "Let me show you on mine." | The station host does the check on themselves |
| The station isn't connecting | "Let me show a recorded check." **Say that it's simulated.** | Driver flips the **simulator switch** |
| The app or laptop dies | "Here's what it looks like." | Slide 7 (screenshots), or the **backup video** on the phone |

**Never pretend simulated data is live.** Simulated and sample readings are always labelled in the app.

---

## 5. Shorter and longer versions

| Pitch length | Change |
|---|---|
| **90 s** | Hook 10 s · Problem one sentence · Live 40 s · Day 47 15 s · Data one sentence · Close 5 s. Drop Impact and What's next |
| **2 min** | Base script without What's next, and Impact cut to "tenfold" plus the diabetes figure and Home mode (15 s) |
| **3 min** | **The base script above** |
| **5 min** | Add slide 6 "How it works" (30 s), slide 8 "Built to be trusted" (20 s), live Home mode walkthrough (20 s), and hardware/safety backup details (20 s) |

---

## 6. Qatar impact numbers and sources

Used in Slide 10 and at `2:05` in the script:

| What we say | Exact figure | Source |
|---|---|---|
| "people over 60 will grow more than tenfold" | Aged 60+: just over 60,000 in 2016 to nearly 690,000 by 2050 | [WHO, *Qatar: Building the Future of Healthy Ageing with WHO-GAPS*](https://cdn.who.int/media/docs/default-source/mca-documents/ageing/gaps/qatar_case-study_-building-the-future-of-healthy-ageing-with-who-gaps.pdf) |
| "one in four adults has diabetes" | 24.6% of adults, 409,300 people (2024 estimate) | [International Diabetes Federation, Qatar](https://idf.org/our-network/regions-and-members/middle-east-and-north-africa/members/qatar/) (IDF Diabetes Atlas) |
| "one in three Qataris has high blood pressure" | 32.9% of Qatari nationals aged 18–64 (2012 Qatar STEPwise Survey) | [Al-Thani et al., *PLoS ONE* 2021](https://pubmed.ncbi.nlm.nih.gov/34699571/) (Ministry of Public Health authors) |

**Precision notes if a judge asks:**
- The blood pressure figure is from the **2012 Qatar STEPwise Survey** and covers **Qatari nationals aged 18–64**, not all residents.
- Some local diabetes estimates are lower than the IDF's, so cite it as *"about one in four adults, according to the International Diabetes Federation"*.
- In 2024, the Ministry of Public Health, Hamad Medical Corporation and the Planning and Statistics Authority launched the **National Ageing Survey Qatar** (same WHO source), making healthy ageing at home a national priority.
- **What changes in Dalil's built-in Home mode:** huge text, one big `Start check` button, plain-English sentences for each reading, a `Send to family` button instead of the flight surgeon, and an immediate `Call 999` banner if any reading is in the `act` (red) range.

---

## 7. Likely questions (answer in under 20 seconds)

Lead with the answer, then one reason. If you haven't tested something yet, say *"We haven't tested that yet; we'd do it by…"*.

| Question | Answer | Who |
|---|---|---|
| How accurate is it? | "These are hobby-grade sensors, so Dalil is a guide, not a diagnostic device. That's why the station rejects weak or moving signals and compares readings against your own baseline trend rather than relying on a single number." *(If user tests were logged, add the heart-rate comparison vs. a pharmacy oximeter.)* | Station host |
| Is this a medical device? | "No. It's guidance only, and the app says so on every screen. Using it clinically on Earth would require Ministry of Public Health approval, which is in our next steps." | Speaker |
| Why not just a smartwatch? | "With optical sensors, a stationary fingertip gives much steadier readings than a moving wrist. And one shared cabin or home station needs no daily charging. Bluetooth cuffs and watches are on our connect-next list." | Speaker |
| Where does your data come from, and how reliable is it? | "Spaceflight risks, countermeasures and guidance come from NASA-STD-3001, NASA's OCHMO Technical Briefs and the Canadian Space Agency—all verified against the source PDFs. Because NASA-STD-3001 doesn't set numeric normal ranges for resting vitals, our vital-sign ranges come from public health sources—MedlinePlus, the NHS, CDC and WHO—all documented in `docs/CONTENT_REVIEW.md`. Real astronaut vitals aren't public, so the 47-day history is sample data built inside those ranges and clearly labelled." | Speaker |
| What doesn't work yet? | "Honestly: the sensors are hobby-grade and there's no ECG, so it can't detect a heart attack, and the app says so. The 47-day mission history is sample data. Sending the report to Earth or to family is simulated. And while every card cites NASA or public health sources, a clinician hasn't signed off on the thresholds yet—we documented every open clinical decision in `docs/CONTENT_REVIEW.md`." | Speaker |
| Who would use this, and how would they find it? | "In space, a crew health team would issue it with the mission kit. On Earth, clinics and home-care services in Qatar would provide it to older patients living at home, starting with a small clinic pilot." | Speaker |
| What would it take to make it real? | "Medical-grade sensors, validation against clinical devices on a larger cohort, a clinician signing off on the review table in `docs/CONTENT_REVIEW.md`, Ministry of Public Health approval, and a clinic pilot." | Speaker |
| What if there's no internet? | "The station, the threshold and baseline rules, the trends, and the emergency screen all work completely offline. Only the AI Coach uses the internet, and if it's offline it automatically falls back to our written guidance cards. On a real deep-space mission, the model would run locally on board." | Speaker |
| How do you stop the AI giving bad advice? | "The Coach can only answer from the written guidance cards the app sends it, and our code strips any card ID not in that list. It never diagnoses or suggests medicines, red-flag words never reach the AI, and any red reading forces escalation to the flight surgeon." | Speaker |
| What about privacy? | "Data stays in the browser on the laptop: there are no user accounts, no cloud database, and the Coach Worker never logs readings or questions. The judge demo runs in Guest mode, so nothing about you is saved." | Driver |
| How much does it cost? | "About QAR 290 in parts, including spares." | Station host |
| Who would pay for it in Qatar? | "Home-care services and clinics that follow up older patients, as well as families. We'd start with a pilot to validate the model." | Speaker |
| Why is the temperature around 33–35 °C? | "That's forehead skin temperature, which sits lower than core body temperature (our normal range is 31.0 to 35.6 °C from published thermometry data). We also track change from your own personal baseline." | Station host |
| What did AI do in your project? | "In the live app, Cloudflare Workers AI (Llama 3.3 70B Instruct) powers the Coach, strictly grounded in our written cards. During the hackathon, Claude Code helped draft code and text, which we verified with automated unit tests, browser E2E checks, and a quote-verification script across 91 NASA source claims." | Speaker |
| What if it's serious, like chest pain? | "Red-flag symptoms skip every rule and never touch AI. One tap on 'I feel unwell now'—or selecting a red-flag chip in the quick log—opens the offline Emergency page, alerts the crew, queues a PRIORITY report to the flight surgeon, and reminds you that normal sensor readings never rule out a heart problem." | Speaker |
| How is this different from what NASA already does? | "NASA's standard in-flight measures happen mostly twice a mission or rely on samples returned to Earth. Dalil adds a 30-second daily self-check on board with personal-baseline tracking and immediate, cited guidance when Earth is 22 minutes away." | Speaker |

---

## 8. Demo table checklist

- [ ] Laptop fully charged, with the charger plugged in
- [ ] Chrome or Edge open, the app full screen in **Guest** mode, the station connected over USB
- [ ] One real test check completed before going up
- [ ] Everyone knows where the **Simulator** switch is in Settings / Check
- [ ] Slides open, plus a PDF copy on the desktop and on a phone
- [ ] HDMI adapter and phone hotspot ready
- [ ] 1–2 m USB data cable, alcohol wipes, tissues
- [ ] Backup video of a real check on the desktop and on a phone
- [ ] Phone timer ready for the timekeeper
