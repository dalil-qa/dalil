# Health content: sources, decisions and review log

**Status on 14 Nov 2026: drafted from sources with AI help. NOT yet reviewed by a clinician or the team's health researchers.**
This page is the record of what the health content says, where each number came from, which numbers are only the team's defaults, and
what a person with medical knowledge still has to decide. It is also where the review is signed off.

Dalil is a guidance tool for a hackathon, not a medical device. Nothing here replaces a flight surgeon or a doctor.

## 1. What the NASA documents in `nasa-sources` can and cannot give us

They are a strong source for **spaceflight facts and countermeasures**: sleep, water, food, exercise and bone loss, space sickness,
dizziness on return to gravity, cabin air, mental health, radiation limits, mission differences and how medical care works.

They give **no normal ranges for resting heart rate, SpO2, blood pressure, blood sugar or skin temperature.** NASA-STD-3001 and the
Standard Measures paper only say that these are measured and trended, not what a normal value is. So:

- the **vital-sign ranges come from public health sources** that were opened and read directly (MedlinePlus, the NHS, NHS England, CDC, WHO,
  and one published study for forehead temperature), listed below;
- the **spaceflight guidance** (what to do, why it matters in space) comes from the NASA documents;
- where **no source gives a number** (for example, the heart rate at which Watch becomes Call surgeon), the file says "team default".

## 2. The files

| File (in `app/src/data/`) | What it holds | Main sources | Status |
|---|---|---|---|
| `thresholds.json` | Safe range or target for 11 indicators, and how to measure each | MedlinePlus, NHS England, NHS, CDC, WHO, Ng 2005, NASA TB-041, TB-016, TB-027, TB-013 | Drafted, needs clinician sign-off |
| `cards.json` | 23 guidance cards the Coach may cite | NASA technical briefs and the public sources above | Drafted, needs sign-off |
| `systems.json` | The 8 body systems and NASA's five questions for each | NASA technical briefs and NASA-STD-3001 | Drafted, needs sign-off |
| `symptoms.json` | The symptom chips, and which are red flags | NHS pages, NHS England leaflet, NASA | Drafted, needs sign-off |
| `emergency.json` | The fixed steps on the Emergency page (no AI, no medicines) | NHS heart attack, fainting, stroke and headache pages; NASA TB-003, STD-3001 | **Highest priority to review** |
| `missions.json` | Gravity, signal delay, risks and a radiation note for the four missions | NASA TB-007, TB-020, STD-3001, NASA Science, NASA Mars delay paper, CSA | Drafted, needs sign-off |
| `crew.json`, `scripts/story.json` | Three fictional crew members and their 47-day story | Made up by us, inside the ranges above | Fiction: say so openly |

The facts these files rely on are in [content-quotes.md](content-quotes.md), each with its document and PDF page.

## 3. Decisions a clinician must make

These are the places where a number or a rule is **our choice**, not a published value. Each one is a real decision.

| # | Decision | What the app does now | Basis |
|---|---|---|---|
| 1 | Heart rate: where Watch becomes Call surgeon | Call surgeon below 40 or above 130 bpm | **Team default** (the station guide's placeholder). The published value is only the normal range, 60 to 100 (MedlinePlus) |
| 2 | Personal-baseline rule for heart rate and skin temperature | Watch when 3 days in a row are more than 8 bpm (heart rate) or 1.0 °C (skin) from your 7-day normal; heart rate also watches for 12 bpm of drift since before launch | **Team design** (APP_BUILD_GUIDE 12.1), no published source. Baselines never create Call surgeon on their own |
| 3 | SpO2 thresholds | 95 or more OK, 93 to 94 Watch, 92 or less Call surgeon | NHS England home-monitoring leaflets for patients. Check they suit healthy crew in a spacecraft |
| 4 | Skin temperature | OK 31.0 to 35.6 °C, Call surgeon at 38.0 °C or more, Watch between and for low readings | One study of one thermometer. **Our MLX90614 sensor must be checked against a reference.** 38 °C is the NHS fever line for core temperature |
| 5 | Blood pressure | OK 90 to 134 over 60 to 84; Call surgeon above 180 or above 120; low readings are Watch only | NHS (home 135/85 high, below 90/60 low) and CDC (above 180 and/or 120). No numeric limit is set for dangerously low pressure |
| 6 | Blood sugar | Fasting ranges only: OK 70 to 99, Watch 54 to 69 and 100 to 125, Call surgeon below 54 or 126 and above | CDC. **The app cannot tell whether a reading was fasting.** The quick log tells people to measure before eating |
| 7 | Sleep, mood, water, exercise, meals | Only ever Watch, never Call surgeon. Targets: sleep 7 h, mood 3 of 5, water 2 L, exercise 22 min, 3 meals | Sleep 7 to 9 h: TB-041 p. 5 (general adults; NASA sets no number). Water: ISS crews averaged 2.0 to 2.3 L, NASA plans 2.5 L (TB-027). Exercise: WHO 150 min a week; NASA crews do far more. **Mood 1 to 5 and "3 meals" are team conventions** |
| 8 | Emergency page steps | "Sit or lie down and rest", "do not stay alone", CPR note, plus one or two steps per red flag | Adapted from NHS pages written for Earth. **Space medicine review needed** (for example, "lie down with legs raised" has no meaning in microgravity) |
| 9 | Red-flag list | Chest pain, trouble breathing, fainting or nearly fainting, sudden severe headache, confusion, face/arm/speech signs | NHS pages. "Nearly fainting" is deliberately cautious: the NHS treats only some faints as emergencies |
| 10 | Which hazards affect which system | Heart: gravity. Lungs: environment. Brain: isolation, distance, environment, radiation. Skin and metabolism: environment. Bones, eyes: gravity. Immune: gravity, isolation | Only what a NASA document supports. The guide also listed radiation for the heart and immune system: **no document here supports that, so it was left out** |

## 4. What was changed from the project guide, and why

- **Forehead temperature range:** the guide said "normally about 33 to 36 °C". No source was found, so it was replaced with the published 31.0 to 35.6 °C.
- **Insight sentence:** "Poor sleep can raise resting heart rate" had no source. It now says "NASA warns that sleep loss affects health and performance" (TB-041, p. 8).
- **Heart rate story:** the guide's gradual rise never reaches Watch under its own rule, so Crew Member 2's story uses the step in APP_BUILD_GUIDE 12.1.
- **Crew Member 1's resting heart rate** was raised from 58 to 62 bpm in the story so the fictional person sits inside the 60 to 100 range.
- **Mars delay:** the guide said 3 to 22 minutes. NASA's Mars paper gives a maximum of about 22 minutes one way, so the label says "up to about 22 minutes". The 14-minute demo value is marked as an example.

## 5. Known gaps

- **No card for back pain.** No NASA document here gives advice for it (it appears only in a sample model output). The chip is saved but gets no card.
- **NASA-STD-3001 Table E.2-1** ("Skin Rash 9.83 per mission") is a sample model output, so it is not used as a fact about how often rashes happen.
- **Dose numbers mix units:** NASA's mission estimates are in mGy and its limits are in mSv. The radiation notes quote each as written and do not convert.
- **The Canadian Space Agency page** gives one usable fact (neutrons are about 30% of ISS radiation) and no dose limits.
- Documents not in `nasa-sources` (for example the carbon dioxide brief, TB-004) are not used. Cabin carbon dioxide limits are therefore not in the content.

## 6. How to re-check

```
pip install pymupdf
python -I scripts/content/extract_pdfs.py <dalil-planning>/nasa-sources <empty-folder>
python -I scripts/content/verify_quotes.py <empty-folder>
```
This confirms every NASA fragment in `scripts/content/claims.json` still appears on its cited page (91 of 91 on 14 Nov 2026).
The public pages were opened on 14 Nov 2026, so dates in the source notes are the "last reviewed" dates those pages showed.

## 7. Sign-off

Nobody has signed anything yet. Fill this in as people review. A reviewer should read the source, not only this page.

| File | Reviewer (name, role) | Date | Decisions in section 3 settled (numbers) | Notes |
|---|---|---|---|---|
| `thresholds.json` | | | 1 to 7 | |
| `emergency.json` | | | 8, 9 | |
| `cards.json` | | | | |
| `systems.json` | | | 10 | |
| `symptoms.json` | | | 9 | |
| `missions.json` | | | | |
| `story.json` (fiction) | | | | |

Prepared by Claude (an AI assistant) with Sulaiman, 14 Nov 2026, from the sources named above.
