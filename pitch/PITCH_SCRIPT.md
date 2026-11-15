# Pitch script: Baseera (بصيرة), by Team Baseera

**Team and project:** **Baseera (بصيرة)**: Arabic for *insight*, seeing clearly.
One name for both: Baseera is how we see the problem, and what we give people: a clear view of their own health.

**Length:** about **2:52** in total: a 6-second silent drama, ~350 spoken words at a calm 135 words a minute, two 3-second pauses and the handoffs. That leaves **8 seconds spare** inside the **3:00** slot.
**Memory anchor:** **`Personal. Sourced. Immediate.`** Said in full at the start and at the end, and each word once in the middle.
**Slides:** [SLIDES.md](SLIDES.md) · **Everything else (background, hardware, the maths, every screen, the full Q&A):** [PRESENTER_MASTER_GUIDE.md](PRESENTER_MASTER_GUIDE.md) · **Health sources:** [docs/CONTENT_REVIEW.md](../docs/CONTENT_REVIEW.md)

> **Why "Sourced", not "Proven":** our thresholds still need a clinician's sign-off ([CONTENT_REVIEW.md](../docs/CONTENT_REVIEW.md)), so "proven" invites the question "proven by whom?". "Sourced" is true today: every tip cites NASA or a public health body.

---

## 1. Who does what

| Person | Speaks | Other jobs |
|---|---|---|
| **Abdullah** | Part 1 (drama + hook, 0:00–0:50) and Part 3 (Qatar, 1:55–2:32) | Stands beside Sulaiman in Q&A; answers nothing unless Sulaiman passes a question |
| **Sulaiman** | Part 2 (how it works, 0:50–1:55) and Part 4 (close, 2:32–2:52) | Answers **all** Q&A. Speaks last so the mic and the judges' eyes are already on him |
| **The Crew Member (actor): Station Host, or a volunteer** | Nothing | Plays the dizzy crew member in the opening (section 3). Then goes to the station |
| **Station Host: [NAME, assign before 15:00]** | Nothing | Sets up the judges' desk laptop + station, advances slides, runs the hands-on check in Q&A, runs the fallback ladder |

**Who plays the Crew Member, in this order:** (1) the Station Host, (2) a volunteer you have rehearsed with at least twice, (3) Sulaiman, only if nobody else is there (see "If Sulaiman is the actor" in section 3).
**If only two of you are there:** Abdullah is the Station Host during Q&A. Someone outside the team advances slides, or use a clicker.

---

## 2. Stage setup

- **Projector:** slides only (Slide 0 to Slide 6), with screenshots of the app. No `Alt+Tab`.
- **Judges' desk:** a laptop running the live app (`F11`, sleep off) plugged into the **Baseera Crew Health Station** by USB. Before 0:00 it shows Crew Member 2's **Today** screen (Mars transit, Day 47).
- **If the venue won't let you put anything on the judges' table:** keep the laptop and station at the front of the stage, and in Q&A the Station Host carries the station (long USB cable) to a judge. Change Sulaiman's "on your desk" line to "here in front of you".
- **If the Wi-Fi is down:** open the local build (`npm run build && npm run preview` in `app/`), started and loaded **before** the pitch. The app has no offline cache, so it must have loaded once.

---

## 3. The opening drama: safety rules first

The Crew Member **gets dizzy and sits down**. They do **not** fall, and nobody says "heart attack".

**Why dizziness, not a heart attack:**
- Feeling faint on standing is a real spaceflight risk that NASA documents (orthostatic intolerance, OCHMO Technical Brief TB-019, in our sources).
- Baseera can't detect a heart attack, and our Emergency screen says so. A staged heart attack invites the question "would Baseera have caught that?", and the answer is no.
- Baseera's real job is catching the **small changes in the days before**, and that's exactly where the story goes next.

**Before the pitch (must do):**
- [ ] **Tell the organisers / MC and the venue first-aid staff** that the opening includes a staged dizzy spell, so nobody calls for help. Get their OK. If they say no, use the hook without the drama (section 8).
- [ ] Walk the stage: no cables or steps where the actor sits down.
- [ ] The actor holds **no microphone**, and wears clothes they can kneel in.
- [ ] Rehearse it at least **twice** at full speed, including getting up on cue.

**How to sit down safely (the actor):** slow down, hand to forehead, one step to steady yourself, then **bend your knees, one knee down, then sit to the side**, one hand on the floor. Never fall backwards or straight down, and keep your head up. It should take about 3 seconds and look controlled.

**If someone rushes to help:** the actor gives a clear thumbs-up and smiles, and Abdullah says calmly, "It's okay, this is part of our pitch." The actor gets up and carries on from "Now rewind."

---

## 4. The script

> **Before 0:00:** Slide 0 (silent title) is up. Abdullah stands centre-left, Sulaiman centre-right. The Crew Member waits at the side of the stage. **Don't start with names.**

### Part 1: The drama and the hook *(0:00–0:50 · Abdullah · ~80 words)*

**[0:00 · Slide 1: Mars signal delay · EMPATHY PHOTO: astronaut alone, looking toward Mars]**

**[DRAMA, 0:00–0:06, silent:]** The Crew Member walks slowly across the front of the stage, as if starting a normal day. Mid-stage they stop, press a hand to their forehead, sway, steady themselves, and **sit down slowly** as described above. They **stay down and stay still.** Abdullah lets one second of silence pass, then steps forward.

**[TONE: calm, low, serious. Look at the judges, not at the actor.]**

**Abdullah:**
> "This could happen to anyone. On Earth, someone calls 999. On the way to Mars, a message to your doctor takes **up to 22 minutes** to arrive. The answer takes 22 more."

**[PAUSE - 3 SECONDS]** *(The Crew Member stays still on the floor. Abdullah scans the judges.)*

**Abdullah:**
> "Now rewind."

**[CUE: GET UP.]** On **"Now rewind"**, the Crew Member gets up calmly (about 2 seconds; Abdullah waits until they're on their feet), nods to the judges, then walks to the station and rests their finger on it **while Abdullah carries on**, and goes to their post at the side.

**[TONE: pick up the pace. Open palm toward the station.]**

**Abdullah:**
> "Small changes can show up days before. But in flight, NASA's standard health tests happen only **about twice a mission**. Nobody checks every morning.
>
> Meet **Baseera**, بصيرة: Arabic for *insight*, seeing clearly. A 30-second morning check that is **Personal. Sourced. Immediate.**"

*(Abdullah hands the mic to Sulaiman and steps back.)*

**If Sulaiman is the actor:** he does the drama, gets up on "Now rewind", walks to the station, and is in place centre-right by "Meet Baseera". Abdullah hands him the mic after "Immediate." Sulaiman takes one slow breath before he speaks, so Part 2 starts calm.

---

### Part 2: How it works, Day 47, why only Baseera *(0:50–1:55 · Sulaiman · ~150 words)*

**[0:50 · Slide 2: Mind map]**
**[TONE: crisp and confident. Point at the station on the desk, then follow the mind map left to right.]**

**Sulaiman:**
> "For 30 seconds, you rest your finger and forehead on our station, the one on your desk now. If your finger moves, it throws the reading away instead of guessing.
>
> **Personal:** Baseera learns your own normal over seven days, and checks each reading against it and against NASA and public health ranges."

**[1:12 · Slide 3: Day 47 to Mars, two screenshots]**
**[GESTURE: point back to where the Crew Member sat, then at the left screenshot (amber), then the right one (red, countdown).]**

**Sulaiman:**
> "Here are our crew member's days before, in **sample mission data**. Day 47 to Mars: their heart rate **jumped ten beats and stayed up for three days**, while sleep and mood fell. Each number still looks normal. Against their own normal it's a change, so Baseera turns **amber**, and the Coach explains why, citing NASA.
>
> If a reading turns **red**, fixed rules decide, never the AI. Baseera writes the report for the flight surgeon and counts down to Earth's reply, with first steps for now. **Immediate**, and offline."

**[1:45 · Slide 4: Comparison table]**
**[GESTURE: sweep down the Baseera column, stop on the bottom row.]**

**Sulaiman:**
> "Smartwatches learn your normal too. Only Baseera keeps working, **sourced** and offline, when the doctor is minutes away."

---

### Part 3: Impact in Qatar *(1:55–2:32 · Abdullah · ~75 words)*

**[1:55 · Slide 5: From Mars to Doha · EMPATHY PHOTO: older Qatari parent at home with the station + Home Mode screenshots]**
**[TONE: warm. Point to the stats as you say them.]**

**Abdullah:**
> "And it's not only astronauts. Here in Qatar, an older parent living at home faces the same gap. The **WHO** expects Qatar's people over 60 to grow **more than tenfold** by 2050: from about **60,000 to nearly 690,000**."

**[PAUSE - 3 SECONDS]** *(Let "tenfold" land.)*

**[GESTURE: count on fingers for the two health numbers, then point at the Home Mode screenshot.]**

**Abdullah:**
> "Nearly **one in four** adults here has diabetes. **One in three** Qatari nationals has high blood pressure. So Baseera already has **Home Mode**, in Arabic and English: big text, one button, plain words, one tap to alert family."

*(Abdullah turns to Sulaiman and hands over the mic.)*

---

### Part 4: Roadmap and close *(2:32–2:52 · Sulaiman · ~45 words)*

**[2:32 · Slide 6: Roadmap and close]**
**[TONE: step to centre, slow down. One beat between each anchor word.]**

**Sulaiman:**
> "Next: Bluetooth blood-pressure cuffs, the AI running on board, and a clinic pilot here in Doha.
>
> We are **Team Baseera**, and this is **Baseera**, بصيرة: *insight*, seeing your health clearly. **Personal. Sourced. Immediate.** Thank you. Try the station while I take your questions."

**[2:52 · Stop. Leave Slide 6 up for all of Q&A.]**

---

## 5. Team resilience (one line for the Q&A or the slide footer)

> "Every part has a fallback we built and tested: a weak signal asks you to measure again, no internet falls back to written cards, and an unplugged station switches to a clearly labelled simulator, so we can show Baseera working whatever happens on the day."

---

## 6. The hands-on check during Q&A

As Sulaiman says "Try the station", the Station Host:
1. Wipes the finger slot and forehead guide in front of the judge.
2. Switches the desk laptop to **Guest → Check** (nothing saved).
3. Guides: "Rest your fingertip lightly, don't press, keep still" (about 20 s), then "forehead at the window" (about 5 s).
4. Steps back so the judge sees their own heart rate, oxygen and skin temperature on the body figure.

Cold hands give weak signals: ask the judge to rub their fingertips first.

---

## 7. Fallback ladder

| What happens | Say | Do |
|---|---|---|
| Someone rushes to help the actor | "It's okay, this is part of our pitch." | Actor: thumbs-up, gets up, carries on from "Now rewind" |
| Station shows "Try again" or a weak-signal hint | "That's the quality check refusing a bad signal, exactly as designed. Once more." | Retry **once** with a warm, still finger |
| Fails again | "Let me show you on mine." | Station Host does a check on themselves |
| Station disconnects | "Here's the same check on our simulator. **This one is simulated.**" | Flip the Simulator switch in the app |
| Laptop or app dies | "Here's what it looks like." | Stay on the slides (screenshots on Slide 3) |

**Never let a simulated check look live.** Losing a judge's trust costs more than a failed demo.

---

## 8. If the drama is not allowed (or no actor)

Abdullah opens without it, same timings with 10 seconds more to breathe:
> "Imagine you are on the way to Mars, and your heart starts racing. A message to your doctor on Earth can take **up to 22 minutes** to arrive. The answer takes 22 more."

**[PAUSE - 3 SECONDS]**, then carry on from "Small changes can show up days before." In Part 2, Sulaiman says "Here are a crew member's days before, in sample mission data" and skips the point back to the stage.

---

## 9. Rehearsal checks

- [ ] Organisers / MC / first-aid staff told about the drama, and OK given.
- [ ] Time a full run, drama included, with a phone timer. **Over 2:55 → cut words, never speed up.**
- [ ] The actor gets up exactly on "Now rewind", every run.
- [ ] Both presenters say "**up to** 22 minutes", "**about** twice a mission" and "**sample** mission data" exactly.
- [ ] Practise one run with the USB unplugged halfway through.
- [ ] Sulaiman drills the Q&A in [PRESENTER_MASTER_GUIDE.md, Part 6](PRESENTER_MASTER_GUIDE.md#part-6-complete-qa-playbook-for-sulaiman-under-20-seconds-each), especially **"Would Baseera have caught that fall?"**
