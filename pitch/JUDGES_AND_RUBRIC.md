# The judges and the rubric: how Baseera scores

**Source:** the official rubric, `Judging_Criteria_NASA_Space_Apps_Doha_2026.pdf`. Five criteria, each scored 1 to 5, total out of 25. The judges score the **submitted project and its demo together**. The live pitch feeds mainly into **Presentation**. A 3 means "solid and competent"; a 5 is for work that "genuinely surprised" them.

**What's at stake:** local prizes of QAR 20,000 / 10,000 / 5,000 (funded by Qatar Development Bank), and about **2 Global Nominee** places out of 19 teams. These are two separate decisions, so the submission page and the 30-second video ([VIDEO_30S.md](VIDEO_30S.md)) matter as much as the pitch.

---

## 1. Where each criterion is scored

| Criterion | What a 5 looks like (rubric) | Where Baseera earns it | Say it, show it |
|---|---|---|---|
| **Impact** | Significant problem, real solution, large reach | Astronauts on deep-space missions **and** Qatar's older adults: 60,000 → 690,000 by 2050; 1 in 4 adults with diabetes; 1 in 3 Qataris with high blood pressure | Part 1 (Mars delay), Part 3 (Qatar stats), Slide 5 |
| **Creativity** | Original, challenges conventional methods | Built for the **communication delay**: personal baseline + offline sourced guidance + report and countdown to Earth's reply. No watch or telehealth app does that | Part 2 Slide 3 and Slide 4 ("Only Baseera…"), the opening drama |
| **Validity** | Scientifically sound, feasible, complete, usable | A **working station tested on the real board**, signal-quality check that rejects bad readings, fixed rules (AI never decides a colour), 79 unit tests + browser tests, 91 NASA quotes re-checked against the PDFs, honest limits (sample data, not a medical device) | Part 2, the hands-on check in Q&A, Backup slides B–D |
| **Relevance** | Deeply answers the challenge; NASA data integral | The challenge is *health monitoring software for astronauts*: that is exactly what Baseera is. Guidance cards built on **NASA-STD-3001 and 14 NASA OCHMO technical briefs**; NASA's 5 hazards on the Body screen; NASA's own gap (tests about twice a mission) is our starting point | Part 1 ("about twice a mission"), Part 2 ("NASA's crew health standard and 14 NASA technical briefs"), Slide 2 source strip |
| **Presentation** | Compelling story, audience grasps significance, polished | Drama → "Now rewind" → the days before → Qatar → close. One anchor repeated: **Personal. Sourced. Immediate.** | The whole script; timed rehearsals |

**Weakest spots, and how we cover them:**
- *Validity: "fully developed and ready for real-world use".* We are a working MVP, not a medical device. Don't overclaim. Show the station working live, and name the next steps (clinician sign-off, MoPH approval, pilot). Honest limits score better than a claim a judge can break.
- *Relevance: vital-sign ranges come from public health bodies, not NASA.* True, because NASA-STD-3001 sets no numeric resting ranges. Say NASA data drives the **guidance, hazards and the problem**, and public health bodies give the numbers. Both are cited in the app.

---

## 2. The four judges: what each one is likely to listen for

Public search turned up nothing about these four people individually, so this is based on **their organisations and roles**, not on them personally. Don't mention anything personal about them on stage.

| Judge | Organisation and role | Likely lens | What to make sure they hear | Their likely question |
|---|---|---|---|---|
| **Ameen Taha** | Incubation Program Lead, **Qatar Science and Technology Park (QSTP)**: QSTP's incubation programme takes startups from venture development through incubation to funding | Is this a venture? Is the team able to keep going after the weekend? | Working MVP today, cost per station, who would pay, the next concrete step (clinic pilot), that the team wants to continue | "What happens after Space Apps? Would you join an incubation programme?" |
| **Mohamed Layachi** | Associate Partner, Data and AI, **IBM** | Trustworthy AI, data quality, governance | The AI **never decides** a status; it answers only from our 23 cited cards; red flags skip the AI; bad sensor data is rejected, not guessed; data stays on the device; tests | "How do you stop the AI hallucinating? How good is your data?" |
| **Raymond Obeid** | Operations Director, **INJAZ Qatar** (youth entrepreneurship and education) | Young people building real things; teamwork; clear communication | A student team that built hardware + software and tested it in two days; the station is cheap and open source, so others can learn from it | "What did you learn? How did the team split the work?" |
| **Noora Al-Ashqar** | Sr. Ecosystem Development Officer, **Qatar Development Bank (QDB)**: QDB funds this event's prizes and backs Qatari startups and SMEs | Local market, business model, scale | Qatar market (older adults, diabetes, blood pressure), cost (about QAR [290] in parts), who pays (home-care services, clinics, families), a path to a local pilot and regulation | "Who is the customer in Qatar, and how would you make money?" |

**On stage, speak to the room, not to one judge.** The tailoring is in *what* we say: the business sentence in Part 4 is for QSTP and QDB, the "fixed rules, never the AI" line is for IBM, and the Q&A answers below cover each lens.

---

## 3. Extra Q&A answers, one per judge's lens (Sulaiman, under 20 seconds)

1. **"What happens after Space Apps?"** *(QSTP)*
   > "We want to keep going. The next step is a small pilot with a clinic or home-care service here in Doha, with a clinician signing off our ranges. An incubation programme like QSTP's would be the right place to turn this prototype into a product."
2. **"How do you make sure the AI is trustworthy?"** *(IBM)*
   > "The AI never decides anything. Fixed rules set every colour. The Coach can only answer from our 23 written cards, each with a source, and anything it cites that isn't a real card is removed. Red-flag words skip the AI and open the emergency steps. And the data stays on the device."
3. **"How reliable is your data?"** *(IBM)*
   > "The station checks signal quality every second and throws bad readings away instead of guessing. Weak readings never enter your personal normal. The 47-day mission history is sample data, labelled as sample, because real astronaut vitals are private."
4. **"What did your team learn, and who did what?"** *(INJAZ)*
   > "We built a working sensor station and a full app in two days. [Name] built the hardware, [name] the app, [name] the content and sources. The biggest lesson: test on the real board early, because sensors behave differently from the simulator."
5. **"Who is the customer in Qatar, and how do you make money?"** *(QDB)*
   > "Home-care services and clinics that follow up older patients with diabetes or high blood pressure. They would buy or lease the station, about QAR [290] in parts today, with the app as a subscription. We'd prove it first with one pilot."
6. **"Is there a market beyond Qatar?"** *(QDB / QSTP)*
   > "Yes. The Gulf has the same fast-ageing population and high diabetes rates, and the space version fits any long mission where the doctor is far away. We'd start in Qatar to prove it."

Fill in the **[names]** and **[290]** before rehearsal.

---

## 4. Checklist before 17:30

- [ ] The submission page says clearly which NASA data we use and links to it (Relevance is scored on the **submitted project** too).
- [ ] The 30-second video is uploaded, public, under 30 seconds, with English subtitles ([VIDEO_30S.md](VIDEO_30S.md)).
- [ ] Price and team names filled in.
- [ ] Sulaiman has rehearsed answers 1–6 above out loud.
