# Data Collection Matrix — PR-TMS vs Industry

Cross-check of **what data we collect per screen** against major temple management products:

| Product | Focus |
|---------|--------|
| [GullySales CRM](https://www.gullysales.com/industries/temple-branding-marketing/crm) | Gotra, nakshatra, seva prefs, donation history |
| [Niketana / Mandira Pranali](https://rksolution.co.in/temple-and-trust-management/) | Gothram, nakshathram, rasi, regional calendar, prasadam |
| [Grasp / TempleManagementSoftware](https://www.templemanagementsoftware.com/features) | Gothram, nakshathiram, family history, booking & contribution history |
| [SwaDharmaSetu / 3ioNetra](https://swadharmasetu.com/) | DharmaID, gotra, nakshatra, sampradaya, family profiles, PAN/Aadhaar KYB |
| [Trimbakeshwar online puja](https://trimbakeshwartrust.com/online-puja-booking) | Name, gotra, gender, ID proof, address, mobile, email, puja date |
| [Venugopala Swamy temple booking](https://venugopalaswamytemple.in/abhishekam/) | Full name, gotra, nakshatra, purpose/sankalpa |
| [justqr Worship](https://platform.justqr.in/worship) | Family linking, gotra, visit history, QR darshan, 80G |

**Legend:** ✅ Collected (UI→API) · 🟡 API only · 👁 Display only · ❌ Missing · 🔜 Planned (PRD, not built)

---

## 1. Devotee / Member CRM

| Field | Industry | PRD | Our API | Our UI | Status |
|-------|----------|-----|---------|--------|--------|
| First / last name | Required | Required | ✅ | ✅ Create + profile edit | OK |
| Phone | Required | Required | ✅ | ✅ Create + list | OK |
| Email | Required | Required | ✅ | ✅ Create form | OK |
| Country | Required | Required | ✅ | ✅ Create form | OK |
| Address (full) | Common | Required | ✅ | ✅ Profile + admin create | OK |
| Gotra / gothram | **Required for rituals** | Required | ✅ | ✅ Create + book | OK |
| Nakshatra (star) | **Required for archana** | Required | ✅ | ✅ Create + book | OK |
| Rashi | Common (India) | Required | ✅ | ✅ Profile + admin create | OK |
| Gender | Common (puja forms) | Optional | ✅ | ✅ Profile + admin create | OK |
| Date of birth | Common | Required | ✅ | ✅ Profile + admin create | OK |
| Photo | Common | Required | 🟡 `photoUrl` field | ❌ | Partial — no upload UI |
| Family / household link | **Very common** | Required | ✅ | ✅ Profile (`familyId`) | OK |
| Star-day / anniversary reminders | Common | Required | ✅ `importantDates` JSONB | ❌ | Partial — API only |
| Membership tier / expiry | Common | Required | 🟡 Entity | 👁 | Partial |
| Donation YTD | Common | Required | 🟡 | 👁 Home only | Partial |
| PAN / tax ID (India) | Required for 80G | Required | ✅ | ✅ Profile + donate | OK |
| SSN/EIN (USA) / SIN (Canada) | Required for tax receipt | Required | ✅ | ✅ Profile + donate | OK |
| NRI / overseas flag | Common | Required | ✅ `isNri` | ❌ | Partial — API only |
| Communication opt-in/out | Required (compliance) | Required | ✅ `communicationOptIn` | ❌ | Partial — API only |
| Preferred language | Common | Required | ✅ `preferredLanguage` | ❌ | Partial — API only |
| Visit / booking history | **Standard** | Required | 🟡 Separate APIs | 👁 | Partial |
| Duplicate detection (phone/email) | Common | AC1 | ✅ check + create warning / `?blockDuplicate=true` | ✅ Admin create warning | OK |

---

## 2. Pooja / Seva Booking

| Field | Industry | PRD | Our API | Our UI (`/devotee/book`) | Status |
|-------|----------|-----|---------|---------------------------|--------|
| Service / seva selection | Required | Required | ✅ | ✅ | OK |
| Deity / sannidhi | Common | Required | 👁 on service | 👁 | Partial |
| Date & time slot | Required | Required | ✅ | ✅ | OK |
| Devotee ID | Required | Required | ✅ (auth) | ✅ | OK |
| Sankalpa — sponsor name | **Required** | Required | ✅ | ✅ | OK |
| Sankalpa — gotra | **Required** | Required | ✅ | ✅ | OK |
| Sankalpa — nakshatra | **Required** | Required | ✅ | ✅ | OK |
| Sankalpa — occasion / purpose | Common | Required | ✅ | ✅ | OK |
| Sankalpa — beneficiary name | Common | Required | ✅ | ✅ | OK |
| Rashi | Common | Optional | ❌ | ❌ | **Gap** |
| Multiple beneficiaries | Some temples | Optional | ❌ | ❌ | **Gap** |
| Priest preference | Some | Optional | ❌ | ❌ | **Gap** |
| Channel (app/counter/kiosk) | Required | Required | ✅ | ✅ `app` / `counter` / `kiosk` | OK |
| Payment / dakshina | **Required** | Required | ✅ | ✅ Payment session + confirm | OK |
| Receipt / QR confirmation | **Standard** | Required | ✅ JSON receipt download | 🟡 | Partial — no QR/print |
| Remote participation flag | Common post-COVID | Optional | ❌ | ❌ | **Gap** |
| Recurring / annual archana | Common | Required | ❌ | ❌ | **Gap** |

---

## 3. Donations / Hundi

| Field | Industry | PRD | Our API | Our UI (`/devotee/donate`) | Status |
|-------|----------|-----|---------|---------------------------|--------|
| Amount | Required | Required | ✅ | ✅ | OK |
| Currency (USD/INR/CAD) | **Required** | Required | ✅ | ✅ | OK |
| Purpose / campaign | Required | Required | ✅ | ✅ | OK |
| Frequency (one-time/recurring) | **Common** | Required | ✅ | ✅ | OK |
| Devotee ID | Required | Required | ✅ | ✅ | OK |
| Tax ID (PAN/SSN/SIN) | **Required for compliance** | AC3 | ✅ | ✅ Donate + profile | OK |
| Anonymous flag | Common | Optional | ❌ | ❌ | **Gap** |
| Payment gateway | **Required** | Required | ✅ sessions + `GET /payments/providers` | ✅ Stripe/Razorpay/demo/cash | OK |
| Receipt number | Standard | Required | ✅ | 🟡 JSON download | Partial — no print UI |
| 80G / IRS / CRA doc type | India/USA/Canada | Required | ✅ server by currency | 🟡 JSON receipt | Partial |
| In-kind donation | Some | Optional | ❌ | ❌ | **Gap** |

---

## 4. Front Desk / Reception

| Field | Industry | PRD | Our UI | Status |
|-------|----------|-----|--------|--------|
| Phone lookup | **Standard** | Required | ✅ | OK |
| Devotee profile on match | Standard | Required | 👁 partial | Partial |
| Issue queue token | Standard | Required | ✅ | OK |
| Token linked to devotee ID | Standard | Required | ✅ | OK |
| Walk-in devotee create | **Standard** | Required | ✅ Admin CRM | Partial — not on front desk |
| Quick booking at counter | **Standard** | Required | ✅ | OK |
| Quick donation at counter | **Standard** | Required | ✅ | OK |
| POS / cash sale | Common | Required | ❌ | **Gap** |
| Print token / receipt | Common | Required | ❌ | **Gap** |

---

## 5. Priest Schedule

| Field | Industry | PRD | Our UI | Status |
|-------|----------|-----|--------|--------|
| Today's bookings list | **Required** | Required | ✅ | OK |
| Devotee name | **Required** | Required | ✅ | OK |
| Gotra / nakshatra for sankalpa | **Required for ritual** | Required | ✅ | OK |
| Sankalpa text / purpose | **Required** | Required | ✅ | OK |
| Mark seva complete | Common | Required | ✅ | OK |
| Priest assignment | Standard | Required | 🟡 `priestId` on booking | ❌ | **Gap** |
| Honorarium / dakshina tracking | Common | Required | ✅ | ✅ Daily total on schedule | OK |

---

## 6. Other screens (summary)

| Screen | Collected today | Industry expects | Priority gap |
|--------|-----------------|------------------|--------------|
| Admin sponsors | List only | Full CRM + pipeline + recognition | P1 |
| Admin prasadam | List only | Calendar, sankalpa form, payment, kitchen | P1 |
| Admin events | Pipeline view | Create event, checklist, deposits | P1 |
| Kiosk | Book + donate (`channel=kiosk`) | Touch booking, donate, token, language | P2 — partial |
| Volunteer | Static demo | Sign-up, check-in, hours | P2 |
| Accountant | Read finance | Tax export triggers, vendor pay workflow | P2 |

---

## 7. Implementation roadmap (from this audit)

### Sprint A — Industry-minimum ritual data (this pass)
- [x] Document matrix (this file)
- [x] Complete sankalpa on Book Seva (nakshatra, occasion, beneficiary)
- [x] Donate: currency, frequency, optional tax ID
- [x] Admin Devotees: walk-in create form (name, phone, email, country, gotra, nakshatra)
- [x] Front desk: pass `devoteeId` from lookup to token
- [x] Priest: show devotee name + full sankalpa on schedule

### Sprint B — CRM depth
- [x] Devotee: rashi, gender, DOB, address (photo URL field in API)
- [x] Family/household linking (`familyId`)
- [x] Duplicate warning on phone/email
- [x] Profile edit (devotee self-service + admin create)
- [x] Important dates on devotee profile (`importantDates` JSONB); reminder jobs TBD

### Sprint C — Revenue & compliance
- [x] Payment sessions (Stripe/Razorpay/demo/cash) on book + donate
- [x] Tax ID validation + receipt download (JSON)
- [x] Recurring donations (frequency stored; billing engine TBD)
- [x] Multi-currency with FX display

### Sprint D — Operations
- [x] Front desk quick book/donate (counter channel)
- [x] Priest mark-complete + honorarium total
- [x] Sponsor/prasadam/event create flows wired to API
- [x] Kiosk channel on book/donate routes
- [ ] Full POS / print receipt hardware

---

## 8. Screen → minimum required fields (target state)

Use this as the **acceptance checklist** when building or reviewing any screen:

### Book Seva (devotee / kiosk / counter)
`serviceId`, `scheduledAt`, `devoteeId`, `sponsorName`, `gotram`, `nakshatra` (or “unknown”), `occasion?`, `beneficiaryName?`, `channel`, `payment` → receipt

### Donate
`devoteeId`, `amount`, `currency`, `purpose`, `frequency`, `campaignId?`, `taxId?` (country-dependent), `payment` → tax receipt

### Devotee CRM (create)
`firstName`, `lastName`, `phone`, `country`, `email?`, `gotram?`, `nakshatra?`, `rashi?`, `address?`, `membershipTier?`

### Front desk token
`phone` → lookup → `devoteeId` + `devoteeName` → `tokenNumber`

### Priest today
Per booking: `time`, `service`, `devoteeName`, `gotram`, `nakshatra`, `sankalpa`, `status`, `complete` action

---

*Last updated: 2026-06-06 — audit sources: codebase + competitor public feature pages listed above.*
