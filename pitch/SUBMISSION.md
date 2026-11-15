# Space Apps submission: copy each box into the form

Fill in the two **[links]** first. Everything else is ready to paste. The form's sections (from a 2025 project page): title, Summary, Project Demonstration, Project, Project Details, Use of Artificial Intelligence (AI), NASA Data, Space Agency Partner & Other Data.

**Challenge:** Create Health Monitoring Software for Astronauts on Space Missions
**Team:** Team Baseera (Doha)

---

## Project title

```
Baseera (بصيرة): a 30-second daily health check that learns each astronaut's normal, cites NASA, and works when Earth is 22 minutes away
```

---

## Summary

```
On a Mars mission, a message to a doctor on Earth takes up to 22 minutes to arrive, and the answer takes as long again. In flight, most of NASA's standard health tests happen only about twice a mission, so nobody checks every morning. Baseera (Arabic for "insight") is a 30-second morning health check for astronauts: a small USB station measures fingertip heart rate, blood oxygen and forehead skin temperature, and a web app learns each person's own 7-day normal, flags a change that lasts three days even when every number still looks "normal", and explains it with guidance built on NASA's crew health standard (NASA-STD-3001) and 14 NASA technical briefs. Fixed rules, never the AI, decide when a reading is red; Baseera then writes a report for the flight surgeon, shows the countdown to Earth's reply, and gives first steps that work offline. The same check works at home: a simple Arabic and English Home Mode for older adults in Qatar, where the population over 60 is expected to grow more than tenfold by 2050. Baseera is a working MVP, tested on real hardware.
```

---

## Project Demonstration (30-second video)

```
[YouTube or Google Drive link: public, 30 seconds or less, English subtitles]
```

## Project (final project link)

```
Live app: https://dalil.msulaiman00711.workers.dev
Code: https://github.com/dalil-qa/dalil
```

(Make the repo public before submitting, or the judges get a 404.)

---

## Project Details

```
WHAT IT DOES
Baseera is a daily health self-check for astronauts on long missions, built for the moment when the doctor is far away. Every morning a crew member rests a fingertip and then their forehead on the Baseera Crew Health Station for about 30 seconds. The app shows the results on a body figure, compares them with that person's own normal, and says in plain words what each number means and what to do next, with the source for every piece of advice.

HOW IT WORKS
1. The station (ESP32, MAX30102 pulse oximeter, MLX90614 infrared thermometer, small screen, button, light and buzzer) measures heart rate, blood oxygen and forehead skin temperature. It checks signal quality every second and throws a reading away instead of guessing when the finger moves. It talks to the browser over USB (one JSON line per message), and a built-in simulator sends the same messages when no station is connected, always labelled as simulated.
2. Personal baseline: the app takes the median of the last 7 days (at least 5 days, weak readings excluded) and flags Watch (amber) when heart rate stays more than 8 bpm, or skin temperature more than 1 °C, away from that normal for 3 days in a row, or when heart rate drifts more than 12 bpm from the pre-flight normal. A baseline change alone can only ever give amber.
3. Fixed rules decide every colour (OK, Watch, Act) for 11 indicators: the 3 station readings plus blood pressure, fasting glucose, sleep, mood, water, exercise and meals from a 20-second quick log. The AI never decides a status.
4. Sourced guidance: 23 written guidance cards, each citing NASA (NASA-STD-3001, OCHMO technical briefs), the Canadian Space Agency or a public health body (NHS, CDC, WHO, MedlinePlus). A script re-checks 91 quoted NASA facts against the original PDFs.
5. The Coach answers questions using only those cards (Cloudflare Workers AI, Llama 3.3 70B). It must cite card ids; unknown citations are removed, medicine doses are blocked, and a red reading always sends the person to a human. Offline, it shows the matching written cards instead.
6. Emergency: an "I feel unwell now" button and red-flag symptoms (chest pain, breathing trouble, fainting, stroke signs) skip the AI completely and open offline emergency steps, warning that normal sensor readings never rule out a heart attack.
7. Earth (Flight Surgeon): a structured report for the doctor and a countdown that shows the real delay for each mission (Space Station about 1 s, Moon 1.3 s, Mars up to 22 minutes, with 14 minutes as the example).
8. Body and Trends: 8 body systems coloured by status, NASA's 5 hazards of human spaceflight, and trend charts showing the safe range, "your normal" and the pre-flight line.
9. Home Mode (Arabic and English, right-to-left): big text, one Start button, plain-language results and a one-tap alert to family, for older adults living at home.

DEMO STORY (sample data)
Day 47 to Mars: Crew Member 2's resting heart rate jumps from about 64 to 74 bpm and stays there for three days while sleep, mood, water and meals drop. 74 bpm is inside the textbook 60-100 range, so a normal device says nothing; against their own normal it is a change, so Baseera turns amber and explains why, citing NASA's sleep brief. The 47-day mission history is sample data we created using these ranges, and it is labelled as sample everywhere, because real astronaut vitals are not public.

WHY IT MATTERS
In space: NASA tracks each astronaut against their own baseline, but in flight most standard measures are taken only about twice a mission and samples go back to Earth. Baseera adds a quick daily check on board, with results on the spot and first steps that do not depend on the link to Earth.
On Earth: in Qatar, people aged 60 and over are expected to grow from about 60,000 to nearly 690,000 by 2050 (WHO), about 1 in 4 adults has diabetes (IDF, 2024) and about 1 in 3 Qatari nationals has high blood pressure (Qatar STEPwise survey). An older parent at home faces the same gap as an astronaut: the doctor is not there every morning.

WHAT IS NEW
Smartwatches can learn a baseline, and telehealth needs a live link. Baseera combines a personal baseline with sourced guidance that works with no doctor and no internet, and it is built around the communication delay: a report for the flight surgeon, the countdown to the reply, and first steps while waiting.

TOOLS AND TESTING
React, TypeScript, Vite, Tailwind CSS, Zustand, Recharts; Web Serial; Cloudflare Workers and Workers AI; ESP32 firmware in Arduino C++. 79 unit tests, browser test suites (including Arabic and right-to-left), Coach Worker tests, and station contract tests run on the real board. All data stays on the device: no accounts and no cloud database; guest mode saves nothing.

HONEST LIMITS
Baseera is not a medical device: guidance only, and it says so. The sensors are hobby-grade with no ECG. The mission history is sample data. Sending the report to Earth or to family is simulated. The ranges and cards are sourced but have not yet been signed off by a clinician; the open decisions are listed in docs/CONTENT_REVIEW.md.

NEXT STEPS
A pilot with a clinic or home-care service in Doha (with clinician sign-off and Ministry of Public Health approval), Bluetooth blood-pressure cuffs and glucose meters so nothing is typed, and the AI running on board with no Earth or cloud link.
```

---

## Use of Artificial Intelligence (AI)

```
- In the product: the Coach uses Cloudflare Workers AI (Meta Llama 3.3 70B Instruct). It answers only from our 23 written, cited guidance cards, must cite their ids, never diagnoses, and is checked after it answers (unknown citations removed, medicine doses blocked, red readings always escalated to a human). Status colours, baselines, red-flag detection and the Emergency page use fixed rules and no AI.
- In building the project: the app code, the station firmware and draft text (including documentation and the pitch materials) were written with AI assistance (Claude Code by Anthropic), directed, tested and checked by Team Baseera. Health content was drafted from NASA documents and public health pages with every source cited; it has not yet been reviewed by a clinician.
- Images: app screenshots are our own; the slide photo is a NASA image (Artemis II), credited on the slide.
```

---

## NASA Data

```
NASA-STD-3001 Volume 1, Rev C (crew health standard): https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf
NASA OCHMO Technical Briefs (index): https://www.nasa.gov/ochmo/hsa-standards/ochmo-technical-briefs/
 - TB-003 Habitable Atmosphere: https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-003-habitable-atmosphere.pdf
 - TB-007 Mission Duration: https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-007-mission-duration.pdf
 - TB-013 Food and Nutrition: https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-013-food-and-nutrition.pdf
 - TB-016 Behavioral Health: https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-016-behavioral-health.pdf
 - TB-019 Orthostatic Intolerance: https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-019-orthostatic-intolerance.pdf
 - TB-020 Radiation Protection: https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf
 - TB-027 Water: https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-027-water.pdf
 - TB-033 Spaceflight Experience and Medical Care: https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-033-spaceflight-experience-medical-care.pdf
 - TB-041 Sleep Accommodations: https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-041-sleep-accommodations.pdf
 - TB-043 Longitudinal Health Surveillance: https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-043-longitudinal-health-surveillance.pdf
 - TB-044 Medical Operations: https://www.nasa.gov/wp-content/uploads/2025/08/ochmo-tb-044-medical-operations.pdf
 - MTB-004 Space Adaptation Sickness: https://www.nasa.gov/wp-content/uploads/2025/09/ochmo-mtb-004-space-adaptation-sickness-sas.pdf
 - MTB-009 Circadian Desynchrony: https://www.nasa.gov/wp-content/uploads/2026/03/ochmo-mtb-009-circadian-desynchrony.pdf
 - MTB-013 Bone Loss: https://www.nasa.gov/wp-content/uploads/2026/02/ochmo-mtb-013-bone-loss.pdf
Spaceflight Standard Measures (NTRS 20200001281): https://ntrs.nasa.gov/api/citations/20200001281/downloads/20200001281.pdf
NASA Human Research Program, 5 Hazards of Human Spaceflight: https://www.nasa.gov/hrp/hazards/
NASA Human Research Program, Risks of Human Spaceflight: https://www.nasa.gov/hrp/risks/
NASA Human Research Program, Ongoing Research in Space: https://www.nasa.gov/hrp/ongoing-hrp-research/
NASA image art002e008486 "Thinking of You, Earth" (Artemis II, used in our slides): https://images.nasa.gov/details/art002e008486

How we used it: the guidance cards, body systems, hazards, mission risks and the Flight Surgeon screen are built on these documents, with page-level citations shown in the app; 91 quoted facts are re-checked against the PDFs by a script. NASA-STD-3001 sets no numeric resting vital-sign ranges, so those come from the public health sources below. Real astronaut vitals (Standard Measures, LSAH) need a formal research request, so our mission history is sample data built on these ranges and labelled as sample.
```

---

## Space Agency Partner & Other Data

```
Canadian Space Agency (CSA):
 - Monitoring Radiation for Astronaut Health: https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp
 - Why Do We Conduct Science Experiments in Space?: https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp

Vital-sign ranges and emergency steps (public health bodies):
 - MedlinePlus, Pulse: https://medlineplus.gov/ency/article/003399.htm
 - NHS England, pulse oximeter guide: https://www.england.nhs.uk/coronavirus/wp-content/uploads/sites/52/2022/02/pulse-oximeter-easy-read-2022-digital.pdf
 - NHS: high blood pressure https://www.nhs.uk/conditions/high-blood-pressure/ · low blood pressure https://www.nhs.uk/conditions/low-blood-pressure-hypotension/ · fever https://www.nhs.uk/conditions/fever-in-adults/ · fainting https://www.nhs.uk/conditions/fainting/ · headaches https://www.nhs.uk/conditions/headaches/ · heart attack https://www.nhs.uk/conditions/heart-attack/ · stroke https://www.nhs.uk/conditions/stroke/symptoms/
 - CDC: high blood pressure https://www.cdc.gov/high-blood-pressure/about/index.html · diabetes testing https://www.cdc.gov/diabetes/diabetes-testing/index.html · low blood sugar https://www.cdc.gov/diabetes/about/low-blood-sugar-hypoglycemia.html
 - WHO, physical activity: https://www.who.int/news-room/fact-sheets/detail/physical-activity
 - Ng et al. 2005, forehead infrared temperature in healthy adults (Am J Infect Control): https://doi.org/10.1016/j.ajic.2005.01.003

Qatar impact figures:
 - WHO, Qatar: Building the Future of Healthy Ageing with WHO-GAPS: https://cdn.who.int/media/docs/default-source/mca-documents/ageing/gaps/qatar_case-study_-building-the-future-of-healthy-ageing-with-who-gaps.pdf
 - International Diabetes Federation, Qatar (IDF Diabetes Atlas, 2024): https://idf.org/our-network/regions-and-members/middle-east-and-north-africa/members/qatar/
 - Al-Thani et al., PLoS ONE 2021 (Qatar STEPwise survey): https://pubmed.ncbi.nlm.nih.gov/34699571/

Software (open source): React, Vite, Tailwind CSS, Zustand, Recharts, Motion (MIT), Lucide (ISC); Cloudflare Workers AI (Meta Llama 3.3 70B Instruct). Our code is MIT licensed.
```

---

## Before you press Submit

- [ ] Video link pasted, public, 30 seconds or less, English subtitles
- [ ] Repo **public** (the Project link and the slide QR code point to it)
- [ ] Live app opens in a private window
- [ ] All team members added on the Members tab
- [ ] Submitted before the deadline
