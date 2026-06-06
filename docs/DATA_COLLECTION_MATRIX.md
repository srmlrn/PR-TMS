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
| First / last name | Required | Required | ✅ | ✅ Create form | Partial — no edit UI |
| Phone | Required | Required | ✅ | ✅ Create + list | OK |
| Email | Required | Required | ✅ | ✅ Create form | OK |
| Country | Required | Required | ✅ | ✅ Create form | OK |
| Address (full) | Common | Required | 🟡 Update DTO | ❌ | **Gap** |
| Gotra / gothram | **Required for rituals** | Required | ✅ | ✅ Create + book | OK |
| Nakshatra (star) | **Required for archana** | Required | ✅ | ✅ Create + book | OK |
| Rashi | Common (India) | Required | ❌ | ❌ | **Gap** |
| Gender | Common (puja forms) | Optional | ❌ | ❌ | **Gap** |
| Date of birth | Common | Required | ❌ | ❌ | **Gap** |
| Photo | Common | Required | ❌ | ❌ | **Gap** |
| Family / household link | **Very common** | Required | ❌ | ❌ | **Gap** |
| Star-day / anniversary reminders | Common | Required | ❌ | ❌ | **Gap** |
| Membership tier / expiry | Common | Required | 🟡 Entity | 👁 | Partial |
| Donation YTD | Common | Required | 🟡 | 👁 Home only | Partial |
| PAN / tax ID (India) | Required for 80G | Required | ❌ | ❌ | **Gap** |
| SSN/EIN (USA) / SIN (Canada) | Required for tax receipt | Required | ❌ | ❌ | **Gap** |
| NRI / overseas flag | Common | Required | ❌ | ❌ | **Gap** |
| Communication opt-in/out | Required (compliance) | Required | ❌ | ❌ | **Gap** |
| Preferred language | Common | Required | ❌ | ❌ | **Gap** |
| Visit / booking history | **Standard** | Required | 🟡 Separate APIs | 👁 | Partial |
| Duplicate detection (phone/email) | Common | AC1 | ❌ | ❌ | **Gap** |

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
| Channel (app/counter/kiosk) | Required | Required | ✅ | Hardcoded `app` | Partial |
| Payment / dakshina | **Required** | Required | 🟡 amount on server | ❌ | **Gap** |
| Receipt / QR confirmation | **Standard** | Required | 🟡 server-generated | ❌ | **Gap** |
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
| Tax ID (PAN/SSN/SIN) | **Required for compliance** | AC3 | 🟡 DTO only | ✅ UI | Partial — server storage |
| Anonymous flag | Common | Optional | ❌ | ❌ | **Gap** |
| Payment gateway | **Required** | Required | ❌ | ❌ | **Gap** |
| Receipt number | Standard | Required | 🟡 server | ❌ show | **Gap** |
| 80G / IRS / CRA doc type | India/USA/Canada | Required | 🟡 server by currency | ❌ | **Gap** |
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
| Quick booking at counter | **Standard** | Required | ❌ | **Gap** |
| Quick donation at counter | **Standard** | Required | ❌ | **Gap** |
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
| Mark seva complete | Common | Required | ❌ | **Gap** |
| Priest assignment | Standard | Required | 🟡 `priestId` on booking | ❌ | **Gap** |
| Honorarium / dakshina tracking | Common | Required | ❌ | **Gap** |

---

## 6. Other screens (summary)

| Screen | Collected today | Industry expects | Priority gap |
|--------|-----------------|------------------|--------------|
| Admin sponsors | List only | Full CRM + pipeline + recognition | P1 |
| Admin prasadam | List only | Calendar, sankalpa form, payment, kitchen | P1 |
| Admin events | Pipeline view | Create event, checklist, deposits | P1 |
| Kiosk | Navigation only | Touch booking, donate, token, language | P2 |
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
- [ ] Devotee: rashi, gender, DOB, address, photo
- [ ] Family/household linking
- [ ] Duplicate warning on phone/email
- [ ] Profile edit (devotee self-service + admin)
- [ ] Important dates + reminders

### Sprint C — Revenue & compliance
- [ ] Payment gateway (Stripe/Razorpay) on book + donate
- [ ] Tax ID validation + receipt download
- [ ] Recurring donations
- [ ] Multi-currency with FX display

### Sprint D — Operations
- [ ] Front desk quick book/donate/POS
- [ ] Priest mark-complete + honorarium
- [ ] Sponsor/prasadam/event create flows wired to API
- [ ] Kiosk capture flow

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
