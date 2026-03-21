# HCDB-with-cases.csv Column Guide

Reference guide for all 69 columns in `data/processed/HCDB-with-cases.csv`. Derived from the [HCDB Codebook](../HCDB%20Codebook%2C%20Current.docx) (Release 1.0, March 2024, Robinson & Leslie).

**Important:** The CSV has 7 rows per case (one per justice on the bench). Most columns are identical across all 7 rows for a given case; the only column that varies per justice within a case is `appPMParty`.

Where a variable is irrelevant for the case, the original HCDB uses `999`. Where information is unavailable, `888` is used.

---

## Identification Variables

### 1. `Term`
The High Court term in which the case was decided. A term runs from 1 July to 30 June of the following year.

**Values:** `1994-1995` through `2020-2021`

### 2. `HCA Citation`
Medium-neutral citation assigned by the High Court (e.g. `[1995] HCA 11`). Always present.

### 3. `Case Name`
The name of the case, associated with the specific case number (not necessarily the lead case name when cases are consolidated).

### 4. `Decision Date`
Date the Court announced its decision. Format: `YYYY-MM-DD`.

### 5. `Primary Issue Area`
The broadest categorization of the substantive issue (same as column 55, `primaryIssueArea` — this column comes from the cases.json website data).

### 6. `Outcome`
A summary string combining the winning party and vote split, from the HCDB website (e.g. `appealing/petitioning party received a favourable disposition<br/>5-0`).

### 7. `Justices`
Comma-separated list of justices on the panel, from the HCDB website.

### 8. `url`
Relative URL path to the case on the HCDB website (e.g. `/terms/1994-1995.html#1995032`).

---

## Case Structure Variables

### 9. `multipleMatters`
Whether the decision relates to more than one case (identified by multiple case numbers under one HCA citation).

**Values:** `Yes`, `No`

### 10. `numMultipleMatters`
Total number of matters decided in the single HCA decision (including the matter being coded). Blank if not a multiple-matter decision.

---

## Party Variables

### 11. `numAppellants`
Total number of appellants/petitioners in the matter.

### 12. `numFedGovAppellant`
Number of appellants categorized as the federal government (includes individuals acting in their capacity as federal government employees, e.g. a federal Minister).

### 13. `numStateGovAppellant`
Number of appellants categorized as state or local government (includes individuals acting in their capacity as state/local government employees).

### 14. `numCorpAppellant`
Number of appellants categorized as a corporate entity (any corporate form).

### 15. `numNonCorpOrgAppellant`
Number of appellants categorized as a non-corporate entity (unions, interest groups, foreign nations).

### 16. `numIndividualAppellant`
Number of appellants categorized as individuals.

### 17. `numRespondents`
Total number of respondents.

### 18. `numFedGovResp`
Number of respondents categorized as federal government.

### 19. `numStateGovResp`
Number of respondents categorized as state government.

### 20. `numCorpResp`
Number of respondents categorized as corporate entities.

### 21. `numNonCorpOrgResp`
Number of respondents categorized as non-corporate entities.

### 22. `numIndividualResp`
Number of respondents categorized as individuals.

### 23. `intervener`
Whether there was an intervener participating in the case. Interveners must usually have a personal or direct interest in the outcome. In constitutional matters, state and federal governments have a right of intervention.

**Values:** `intervener`, `no intervener`

### 24. `numIntervener`
Total number of interveners (does not include amici).

### 25. `amicus`
Whether an amicus curiae was granted leave to provide submissions (written or oral). Amici are relatively rare in the HCA.

**Values:** `amici`, `no amici`

### 26. `numAmici`
Total number of amici (does not include interveners).

---

## Jurisdiction Variables

### 27. `jurisdictionGeneral`
General way in which the Court took jurisdiction.

**Values:**
- `special leave` — Court granted special leave to appeal (analogous to US certiorari)
- `appeal as of right` — appeal without needing leave
- `original jurisdiction` — case heard in HCA's original jurisdiction
- `reference` — matter referred to full court by a single justice
- `removal` — case removed from a lower court (pursuant to Sec 40, Judiciary Act)
- `other` — e.g. Court of Disputed Returns

### 28. `jurisdictionSpecific`
Specific way the Court took jurisdiction. Pairs with `jurisdictionGeneral`.

**Values:**
- `special leave (appellate)—from state or territory supreme court`
- `special leave (appellate)—from lower federal court`
- `special leave (appellate)—from any court exercising original jurisdiction upon remittal from HCA`
- `special leave (appellate)—other`
- `appeal as of right`
- `leave (appellate)—from High Court justice exercising original jurisdiction`
- `original (Constitution, section 75)`
- `original—all matters arising under the Constitution or involving its interpretation`
- `reference—matter referred to full court by single justice (Judiciary Act sec 18)`
- `removal from lower court (pursuant to Sec 40, Judiciary Act)`
- `special—Court of Disputed Returns`
- `other`

---

## Administrative Action Variables

### 29. `adminAction`
The foundational government administrative action (federal or state) that gave rise to the litigation. Identifies the specific federal administrative actor or the state/territory if a state actor. Only coded where administrative action is relevant to the case.

**Values (48 total):** Federal agencies (e.g. `Commissioner of Taxation, and Related Delegates`, `Minister for Immigration and Border Protection, and Related Delegates (including Secretary)`) and state-level entries (e.g. `South Australia Government Minister, and Related Delegates`, `NSW Independent Body, and Related Delegates`). Blank when no administrative action preceded litigation.

---

## Case Origin & Source Variables

### 30. `caseOriginGeneral`
General level of court where the case entered the judicial system (the first court).

**Values:**
- `Federal court—trial level`
- `Federal court—appellate level`
- `State supreme court—trial level`
- `State supreme court—appellate level`
- `State district court (county court)`
- `State local court (magistrates court)`
- `State speciality court`

### 31. `caseOriginSpecific`
The specific court where the case entered the judicial system (57 distinct courts, e.g. `Federal Court of Australia—Single Judge`, `Supreme Court of New South Wales—Court of Criminal Appeal`, `Magistrates Court of Queensland`).

### 32. `caseOriginState`
The state/territory (or federal) jurisdiction where the case originated.

**Values:** `Australia (federal actor)`, `Australian Capital Territory`, `Nauru`, `New South Wales`, `Norfolk Island`, `Northern Territory`, `Queensland`, `South Australia`, `Tasmania`, `Victoria`, `Western Australia`

### 33. `caseSourceGeneral`
General level of the court whose decision the HCA reviewed (i.e., the court immediately below the HCA). Same value set as `caseOriginGeneral`. If the case went straight from origin to HCA, this equals `caseOriginGeneral`.

**Values:** Same as `caseOriginGeneral`.

### 34. `caseSourceSpecific`
The specific court whose decision the HCA reviewed (31 distinct courts). Subset of the courts in `caseOriginSpecific` (only courts that can be the immediate source to the HCA).

### 35. `caseSourceState`
The state/territory jurisdiction of the source court.

**Values:** Same as `caseOriginState`.

---

## Lower Court Disposition Variables

### 36. `lcDisposition`
How the source court (whose decision the HCA reviewed) treated the decision below it. Only coded when the source court was an appellate court.

**Values:**
- `Appeal/application allowed, in whole or in part, and/or order below set aside and/or varied in whole or in part, and/or matter remitted`
- `Appeal/application dismissed`
- `Other disposition`

### 37. `lcDispositionDirection`
Ideological direction of the lower court's decision (liberal/conservative as defined in `decisionDirection`). Derived from the HCA's decision direction: if HCA allowed the appeal, the lower court direction is the *opposite* of the HCA's; if HCA dismissed, the lower court direction is the *same*.

**Values:** `liberal`, `conservative`, `unspecifiable`

---

## Gatekeeping (Special Leave) Variables

### 38. `specialLeaveMethod`
Whether special leave was determined after an oral hearing or on the papers. Only relevant for special leave and removal cases.

**Values:** `Oral hearing`, `Papers`

### 39. `numJusticesSL`
Number of justices on the preliminary special leave or removal panel (2 or 3).

### 40. `prelimSLHearing`
Whether there was a preliminary hearing on the special leave question before the matter was granted leave or referred to a full court.

**Values:** `Yes`, `No, referred directly to full court on special leave question`

### 41. `prelimSLNatCourt`
The natural court at the time of the preliminary special leave hearing. A "natural court" is the period during which no personnel change occurs on the Court.

**Values (16 total):** Named by Chief Justice and numbered, e.g. `Mason 2 (6-Feb-89-20-Apr-95)`, `Brennan 1 (21-Apr-95-5-Feb-96)`, `Gleeson 1 (22-May-98-10-Feb-03)`, `French 2 (3-Feb-09-8-Oct-12)`, `Kiefel 1 (30-Jan-17-30-Nov-2020)`

### 42. `referralJustice`
If there was no preliminary special leave hearing (matter referred directly to full court), identifies the justice who referred the matter.

**Values:** `Dawson`, `French`, `Gummow`, `Hayne`, `Mason`

### 43. `prelimSLOutcome`
Outcome of the preliminary special leave panel.

**Values:**
- `Special leave granted`
- `Special leave question referred to the full court`
- `Appeal decided by preliminary special leave panel`

### 44. `politicalPowerSL`
The controlling political party in both the House of Representatives and the Senate on the date of the preliminary special leave hearing.

**Values:**
- `Coalition House/Coalition Senate`
- `Coalition House/Not Coalition Senate`
- `Labour House/Not Labour Senate`
- `Minority Labour House/Not Labour Senate`

### 45. `yearSL`
Year of the preliminary special leave hearing (numeric, e.g. `1994`).

### 46. `termSL`
HCA term during which the special leave application was heard (e.g. `1994-1995`).

### 47. `chiefSL`
Chief Justice during whose tenure the special leave hearing occurred.

**Values:** `Mason`, `Brennan`, `Gleeson`, `French`, `Kiefel`

### 48. `pmSL`
Prime Minister on the date of the preliminary special leave hearing (e.g. `Keating (20.12.1991 - 11.03.1996)`, `Howard (11.03.1996 - 03.12.2007)`).

---

## Chronological Variables (Oral Argument)

### 49. `yearArgument`
Year in which the Court heard the merits case on oral argument.

### 50. `termArgument`
HCA term during which oral argument occurred (e.g. `1994-1995`).

### 51. `chiefArgument`
Chief Justice during whose tenure the oral argument occurred.

**Values:** `Mason`, `Brennan`, `Gleeson`, `French`, `Kiefel`

### 52. `politicalPowerArgument`
Controlling political party (House + Senate) on the date of oral argument.

**Values:** Same as `politicalPowerSL`.

### 53. `pmArgument`
Prime Minister on the date of oral argument.

---

## Chronological Variables (Decision)

### 54. `yearDecision`
Year the Court handed down its decision.

### 55. `termDecision`
HCA term during which the decision was issued (e.g. `1994-1995`).

---

## Substantive Issue Variables

### 56. `primaryIssueArea`
Most general categorization of the case's primary issue (10 substantive areas + 1 miscellaneous).

**Values:**
- `Common Law`
- `Criminal Law and Procedure`
- `Economic Relations`
- `Employment and Industrial Relations`
- `Public Law—Federal`
- `Public Law—State`
- `Civil Rights (non-constitutional)`
- `Procedure and Ethics`
- `Costs`
- `Admiralty and Maritime`
- `Miscellaneous`

### 57. `primaryIssueSubArea`
Disaggregates the issue area into sub-areas (37 values).

**Values include:** `Tort`, `Contract`, `Equity`, `Trusts`, `Federal criminal law`, `State criminal law`, `Federal criminal procedure`, `State criminal procedure`, `Constitutional law`, `Administrative law`, `Employment and industrial relations`, `Bankruptcy and insolvency`, `Corporate and business law`, `Taxation`, `Consumer and competition law`, `Property`, `Intellectual property`, `Migration (non-refugee)`, `Refugees`, `Family law`, `Indigenous rights (including native title)`, `Civil procedure/litigation`, `Evidence`, `Statutory interpretation (Acts Interpretation Act)`, `Environmental law`, `International law`, and more.

### 58. `primaryIssue`
Most specific issue categorization (174 distinct values). Identifies the issue from a public policy standpoint, not the legal basis. Formatted as `IssueArea—SubArea—Specific Issue`.

**Examples:**
- `Common Law—Tort—Negligence`
- `Criminal Law and Procedure—State criminal law—offenses against the person leading to death (e.g. murder, manslaughter)`
- `Public Law—Federal constitutional law—Federal judicial power—definition and scope of judicial power`
- `Economic Relations—Taxation—Corporate taxation liability disputes`
- `Miscellaneous —Migration (non-refugee)—immigration`

---

## Outcome & Voting Variables

### 59. `decisionDirection`
Ideological direction of the Court's decision, following Australian public policy conventions.

**Values:** `liberal`, `conservative`, `unspecifiable`

**Coding rules (summary):**
- *Criminal/civil rights:* liberal = pro-accused, pro-civil liberties, pro-Indigenous rights, pro-privacy
- *Constitutional/administrative:* liberal = pro-federal power, pro-judicial review, pro-individual against government
- *Economic/employment:* liberal = pro-injured party, pro-union, pro-employee, pro-consumer, pro-debtor, pro-competition, pro-government in tax cases
- *Procedure:* liberal = pro-purposive interpretation, pro-judicial power
- *Migration/family/international:* liberal = pro-immigrant, pro-human rights, pro-environment

### 60. `decisionDirectionDissent`
Whether the majority and dissent were in the same or opposite ideological direction. Rare — usually majority and dissent disagree on direction.

**Values:**
- `dissent in opposite direction`
- `majority and dissent in same direction`

### 61. `caseDisposition`
Specific treatment the majority accorded the lower court's decision.

**Values (17 total):**
- `Appeal/application allowed`
- `Appeal/application allowed, order below set aside and/or varied`
- `Appeal/application allowed, order below set aside and/or varied in part`
- `Appeal/application allowed, order below set aside and/or varied, matter remitted`
- `Appeal/application allowed, order below set aside and/or varied in part, matter remitted`
- `Appeal/application allowed, remit for further determination`
- `Appeal/application allowed in part, order below set aside and/or varied`
- `Appeal/application allowed in part, order below set aside and/or varied in part`
- `Appeal/application allowed in part, order below set aside and/or varied, matter remitted`
- `Appeal/application allowed in part, order below set aside and/or varied in part, matter remitted`
- `Appeal/application allowed in part, remit for further determination`
- `Appeal/application dismissed`
- `Appeal granted and appeal allowed instantia`
- `Special leave revoked`
- `Special leave denied by enlarged bench`
- `Questions answered (special case, case referred, etc)`
- `Other disposition`

### 62. `partyWinning`
Whether the appellant/petitioner won in the High Court.

**Values:**
- `appealing/petitioning party received a favourable disposition`
- `no favourable disposition for appealing/petitioning party apparent`
- `favourable disposition for petitioning party unclear`

### 63. `majVotes`
Number of justices voting in the majority (on the disposition/orders, not on specific legal issues). In an evenly divided court (e.g. 3-3), this reflects the split.

### 64. `minVotes`
Number of justices dissenting from the disposition.

---

## Panel Composition Variables

### 65. `proportionLiberalPanel`
Proportion of ideologically liberal justices on the panel that decided the case. Uses the Robinson, Leslie & Sheppard (RLS) ideology score where justices scoring >0.50 are "liberal" and <=0.50 are "conservative". Varies per case because panel composition varies.

**Values:** Decimal between 0 and 1 (e.g. `0.8`, `0.6`, `0.43`).

### 66. `proportionLiberalCourt`
Proportion of ideologically liberal justices on the full Court at the time of decision. Static for each natural court period.

**Values:** Decimal between 0 and 1.

### 67. `proportionWomenPanel`
Proportion of women justices on the panel that decided the case. Varies per case.

**Values:** Decimal between 0 and 1.

### 68. `proportionWomenCourt`
Proportion of women justices on the full Court at the time of decision. Static for each natural court period.

**Values:** Decimal between 0 and 1.

---

## Justice Characteristics Variable

### 69. `appPMParty`
Political party of the Prime Minister who appointed the justice. **This is the only column that varies per justice within the same case** (each of the 7 rows per case corresponds to a different justice).

**Values:** `ALP` (Australian Labor Party), `Coalition`
