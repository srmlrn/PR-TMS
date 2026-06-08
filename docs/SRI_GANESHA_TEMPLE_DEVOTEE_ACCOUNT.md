# Sri Ganesha Temple — Devotee Account Fields & Options

> **Source:** [Front desk — Edit Account popup](https://sriganeshatemple.org/frontdesk/pages/account_edit_popup.aspx)  
> **Tenant:** Sri Ganesha Temple (`00000000-0000-0000-0000-000000000002`)  
> **Captured:** June 2026  

Use this document to align TMS **devotee profile**, **family members**, and **front-desk CRM** with the legacy temple system.

**Related:** [Seva / category catalog](./SRI_GANESHA_TEMPLE_SEVA_CATALOG.md)

---

## Account header (primary devotee)

Displayed at top of edit popup; each field is clickable to edit.

| Field | Example value | TMS mapping |
|-------|---------------|-------------|
| **Full name** | Raghavendra rao Sakkari | `firstName`, `lastName` |
| **Gender** | Male | `gender` (add enum: Male, Female, Other) |
| **Phone** | +1-425-505-7432 | `phone` (E.164) |
| **Address** | 865 BELLEVUE RD J13, NASHVILLE, TN 37221 | `addressLine1`, `city`, `state`, `postalCode` |
| **Date of birth** | 07/27/1978 | `dateOfBirth` |
| **Email** | (optional, separate tab) | `email` |

---

## Tabs (sections)

| Tab | Purpose | TMS module suggestion |
|-----|---------|----------------------|
| **Accounting** | Yearly donation totals by calendar year | Devotee profile → donations summary |
| **Addresses** | Multiple addresses (Home, Work) | `address` + `addressType` |
| **Email Addresses** | Multiple emails by type | `email` + `emailType` |
| **Phone Numbers** | Multiple phones by type | `phone` + `phoneType` |
| **Account Members** | Family / household members | `familyMembers[]` |
| **Additional Info** | Nakshatra, gotram, India state, language, mailable | Devotee extended fields |
| **Login Info** | Portal username / password / security Q | Devotee portal auth (optional) |
| **Reports** | Transaction & tax letters | Profile → history & receipts |
| **Pledges** | Recurring / pledged donations | Donation subscriptions |
| **Retirement Accounts** | QDRO / retirement fund routing | Future: planned giving |

---

## Tab: Addresses

| Field | Type | Options / notes |
|-------|------|-----------------|
| Address type | dropdown | `Home`, `Work` |
| Line 1 | text | Street address |
| Line 2 | text | Apt / suite |
| Line 3 | text | Additional line |
| City | text | |
| State | dropdown | US states (see list below) |
| Zip | text | |

### US states (51)

AL, AK, AZ, AR, CA, CO, CT, DE, FL, GA, HI, ID, IL, IN, IA, KS, KY, LA, ME, MD, MA, MI, MN, MS, MO, MT, NE, NV, NH, NJ, NM, NY, NC, ND, OH, OK, OR, PA, RI, SC, SD, TN, TX, UT, VT, VA, WA, DC, WV, WI, WY

---

## Tab: Email Addresses

| Field | Type | Options |
|-------|------|---------|
| Email type | dropdown | `Home`, `Work` |
| Email address | text | |

---

## Tab: Phone Numbers

| Field | Type | Options |
|-------|------|---------|
| Phone type | dropdown | `Cell`, `Home`, `Work` |
| Area code | text | 3 digits |
| Prefix | text | 3 digits |
| Suffix | text | 4 digits |

> Legacy UI splits phone into 3 boxes; TMS can use single `phone` field with formatting.

---

## Tab: Account Members (family)

Grid columns: **Relationship**, **Name (First Last)**, **Gothram**, **Sort Order**, plus DOB and Nakshatram on add row.

| Field | Type | Options / notes |
|-------|------|-----------------|
| Relationship | dropdown | See relationship list below |
| Name | text | First + last |
| Gothram | text | |
| Date of birth | month / day / year dropdowns | Month: JAN–DEC; Day: 1–31; Year: 1946–2026 |
| Nakshatram | dropdown | See nakshatra list below |
| Sort order | numeric | Display order in household |

### Relationship options (22)

Son, Daughter, Mother, Father, Brother, Sister, Grand Mother, Grand Father, Aunt, Uncle, Cousin(F), Other, Daughter-in-law, Sister-in-law, Son-in-law, Father-in-law, Grand Child(M), Grand Child(F), Brother-in-law, Niece, Mother-in-law, Cousin(M)

---

## Tab: Additional Info

| Field | Type | Options / notes |
|-------|------|-----------------|
| Nakshatram | dropdown | See nakshatra list below |
| Gothram | text | e.g. `kodinisya` |
| India State | dropdown | See India states below |
| Language | dropdown | See languages below |
| Mailable | checkbox | Opt-in for postal mail (checked = yes) |

### Nakshatra options (32)

None Selected, Ashvini, Bharani, Krittika, Rohini, Mrigashirsha, Ardra, Punarvasu, Pushya, Ashlesha, Magha, Purva Phalguni, Uttara Phalguni, Hasta, Chitra, Swati, Vishakha, Anuradha, Jyeshtha, Mula, Purva Ashadha, Uttara Ashadha, Abhijit, Sravana, Dhanishta, Shatabhisha, Purva Bhadrapada, Uttara Bhadrapada, Revati, P.Proshthapada, U.Proshthapada, Thiruvadirai

### India state options (26)

Uttar Pradesh, Telangana, Puducherry, Arunachal Pradesh, Himachal Pradesh, Jammu and Kashmir, Chhattisgarh, Madhya Pradesh, West Bengal, New Delhi, Gujarat, Assam, Jharkhand, Other, Kerala, Uttarakhand, Rajasthan, Karnataka, Chandigarh, Bihar, Punjab, Haryana, Odisha, Maharashtra, Andhra Pradesh, Tamil Nadu

### Language options (10)

Tamil, Hindi, Other, Marathi, Malayalam, Telugu, Odia, Gujarati, Kannada, Bengali

---

## Tab: Login Info (devotee portal)

| Field | Type | Notes |
|-------|------|-------|
| Username | text | e.g. `Raghu@78` |
| Password | password | |
| Confirm Password | password | |
| Security Question | dropdown | `What was the color of your first car?` |
| Answer | text | |

---

## Tab: Accounting

Read-only summary table:

| Column | Description |
|--------|-------------|
| Year | Calendar year |
| Total Donations | Sum for that year (USD) |

Example years shown: 2017–2026 with running totals.

---

## Tab: Reports

| Report | TMS equivalent |
|--------|----------------|
| Devotee Transaction Report | Profile → History & receipts |
| Devotee Contributions By Type | Donations by category |
| Devotee Yearly Summary Report | Annual summary |
| Year End Donation Letter (2014–2025) | Tax receipt PDF per year |

---

## Tab: Pledges

| Field | Type | Notes |
|-------|------|-------|
| Donation type | dropdown | Subset of funds (e.g. Temple Restoration, Aalayadhar ABW tiers) |
| Amount | text | USD |
| Start date | text | MM/DD/YYYY |
| End date | text | MM/DD/YYYY |

### Pledge donation type options (sample)

- Temple Restoration and Future Expansion Projects Fund
- Aalayadhar (ABW)
- Aalayadhar-Mukhya (ABW)
- Aalayadhar-Pradhana (ABW)

---

## Tab: Retirement Accounts

| Field | Type | Notes |
|-------|------|-------|
| Account | text | Free-form; format hint below |

**Format example:** `Prudential Retirement Fund 39700000501999999`  
(Account Name + Account Number)

---

## TMS field mapping summary

```typescript
// Suggested extensions to Devotee / CreateDevoteeInput
interface GaneshaDevoteeProfile {
  // Core (already in TMS)
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  addressLine1?: string;
  city?: string;
  state?: string;        // US state code
  postalCode?: string;
  dateOfBirth?: string;  // ISO date

  // Additional Info tab
  gender?: 'male' | 'female' | 'other';
  nakshatra?: string;    // from nakshatra enum
  gotram?: string;
  indiaState?: string;   // from india state enum
  preferredLanguage?: string;
  mailable?: boolean;

  // Collections
  addresses?: Array<{ type: 'home' | 'work'; lines: string[]; city: string; state: string; zip: string }>;
  emails?: Array<{ type: 'home' | 'work'; address: string }>;
  phones?: Array<{ type: 'cell' | 'home' | 'work'; number: string }>;
  familyMembers?: Array<{
    relationship: string;
    name: string;
    gotram?: string;
    dateOfBirth?: string;
    nakshatra?: string;
    sortOrder?: number;
  }>;
}
```

---

## Gap vs current TMS devotee model

| Legacy field | TMS today (`packages/types/src/devotee.ts`) |
|--------------|---------------------------------------------|
| gotram | ✅ `gotram` |
| nakshatra | ✅ `nakshatra` |
| gender | ❌ not in type |
| indiaState | ❌ |
| preferredLanguage | ❌ |
| mailable | ❌ |
| multiple addresses | ❌ single address |
| phone/email types | ❌ single phone/email |
| family relationship enum | ⚠️ partial (family members exist) |
| member DOB / nakshatra | ⚠️ check family member type |
| login / security Q | ❌ separate auth |
| pledges | ⚠️ donation subscriptions partial |
| retirement accounts | ❌ |
| yearly accounting view | ⚠️ profile donations partial |

---

## JSON enums (for seed / UI dropdowns)

```json
{
  "addressTypes": ["Home", "Work"],
  "phoneTypes": ["Cell", "Home", "Work"],
  "emailTypes": ["Home", "Work"],
  "genders": ["Male", "Female"],
  "relationships": [
    "Son", "Daughter", "Mother", "Father", "Brother", "Sister",
    "Grand Mother", "Grand Father", "Aunt", "Uncle", "Cousin(F)", "Other",
    "Daughter-in-law", "Sister-in-law", "Son-in-law", "Father-in-law",
    "Grand Child(M)", "Grand Child(F)", "Brother-in-law", "Niece",
    "Mother-in-law", "Cousin(M)"
  ],
  "nakshatras": [
    "Ashvini", "Bharani", "Krittika", "Rohini", "Mrigashirsha", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni",
    "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha",
    "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Abhijit",
    "Sravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
    "Uttara Bhadrapada", "Revati", "P.Proshthapada", "U.Proshthapada", "Thiruvadirai"
  ],
  "indiaStates": [
    "Uttar Pradesh", "Telangana", "Puducherry", "Arunachal Pradesh",
    "Himachal Pradesh", "Jammu and Kashmir", "Chhattisgarh", "Madhya Pradesh",
    "West Bengal", "New Delhi", "Gujarat", "Assam", "Jharkhand", "Other",
    "Kerala", "Uttarakhand", "Rajasthan", "Karnataka", "Chandigarh", "Bihar",
    "Punjab", "Haryana", "Odisha", "Maharashtra", "Andhra Pradesh", "Tamil Nadu"
  ],
  "languages": [
    "Tamil", "Hindi", "Other", "Marathi", "Malayalam", "Telugu",
    "Odia", "Gujarati", "Kannada", "Bengali"
  ],
  "usStates": [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID",
    "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS",
    "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK",
    "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "DC",
    "WV", "WI", "WY"
  ]
}
```

---

*For TMS integration, import enums into `packages/types` and use in devotee create/edit forms and front-desk profile panel.*
