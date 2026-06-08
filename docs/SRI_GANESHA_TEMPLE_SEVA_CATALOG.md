# Sri Ganesha Temple — Seva / Category Catalog

> **Source:** [Front desk reports — Category dropdown](https://sriganeshatemple.org/frontdesk/Pages/reports_AdminView.aspx)  
> **Tenant:** Sri Ganesha Temple (`00000000-0000-0000-0000-000000000002`)  
> **Captured:** June 2026  
> **Total items:** 269

Use this document to seed the TMS **seva catalog**, POS categories, or front-desk booking dropdowns.

---

## How to use in the app

| Use case | Suggested mapping |
|----------|-------------------|
| **Seva catalog** (`seva_services`) | Rows where `type` = `seva` or `puja` |
| **POS / donations** | Rows where `type` = `donation`, `fund`, `membership` |
| **Facility rentals** | Rows where `type` = `rental` |
| **Fees & travel** | Rows where `type` = `fee` |

**Price column:** Parsed from the label when present (e.g. `($125)` → `125`). Empty = variable / contact temple / bundled.

**Import tip:** Copy the JSON block at the bottom into a seed script or admin bulk-import tool.

---

## Summary by type

| Type | Count | Examples |
|------|-------|----------|
| `seva` | 152 | Archana, Abhishekam, Homam, Kalyanam, Padi Pooja |
| `donation` | 38 | Hundi, Endowment, relief funds, Annadhan |
| `rental` | 28 | Auditorium, Yagashala, Prasadam Hall, Mandap |
| `membership` | 5 | Life Member, Patron, Regular Family/Single |
| `fee` | 12 | Priest Dakshina, travel, cleaning, deposit |
| `event` | 14 | Special events, concerts, vendor booth |
| `sales` | 6 | Gift Shop, Food, Prasadam options |
| `other` | 14 | General, Other, Walk-In, Self Service |

---

## Full catalog

| # | Name | Price (USD) | Type |
|---|------|-------------|------|
| 1 | 60th Birthday (Shasti Abda Poorthi) | — | seva |
| 2 | Aalayadhar ($1501) | 1501 | seva |
| 3 | Aalayadhar (ABW) | — | seva |
| 4 | Aalayadhar-Mukhya ($3501) | 3501 | seva |
| 5 | Aalayadhar-Mukhya (ABW) | — | seva |
| 6 | Aalayadhar-Pradhana ($3501) | 3501 | seva |
| 7 | Aalayadhar-Pradhana (ABW) | — | seva |
| 8 | Aayush Homa | — | seva |
| 9 | Abhishekam ($125) | 125 | seva |
| 10 | Advertisement-Aradhana Center page ($1500) | 1500 | event |
| 11 | Advertisement-Aradhana Full page ($1000) | 1000 | event |
| 12 | Advertisement-Aradhana Half page ($500) | 500 | event |
| 13 | Advertisement-Aradhana Quarter page ($250) | 250 | event |
| 14 | Aksharabyasa | — | seva |
| 15 | Aksharabyasa on Vasantha Panchami ($51) | 51 | seva |
| 16 | All poojas of Rathayatra ($101) | 101 | seva |
| 17 | Annadhan | — | donation |
| 18 | Annaprasanam | — | seva |
| 19 | Aradhana Sponsors | — | donation |
| 20 | Archana | — | seva |
| 21 | Archana Seva SSK April 22nd | — | seva |
| 22 | Auditorium - 12 hours ($1500) | 1500 | rental |
| 23 | Auditorium - 6 hours ($1000) | 1000 | rental |
| 24 | Auditorium - Additional Charge for Saturday Morning ($1500) | 1500 | rental |
| 25 | Auditorium Advance ($300) | 300 | rental |
| 26 | Bahudayatra Homa ($51) | 51 | seva |
| 27 | Bala Vihar - Sunday School | — | donation |
| 28 | Bala Vihar Award Fund | — | donation |
| 29 | Bala Vihar Certification Fee | — | fee |
| 30 | Bala Vihar Summer Camp | — | event |
| 31 | Bala Vihar Youth Leadership Program | — | event |
| 32 | Bhoomi Pooja | — | seva |
| 33 | Bulletin Board Adv for a month ($30) | 30 | event |
| 34 | Car Pooja ($75) | 75 | seva |
| 35 | Chalisa ($31) | 31 | seva |
| 36 | Chandi Homam - All 4 Days ($3001) | 3001 | seva |
| 37 | Chandi Homam - Annadanam | — | donation |
| 38 | Chandi Homam - Archana ($51) | 51 | seva |
| 39 | Chandi Homam - Deepa Lakshmi Pooja ($251) | 251 | seva |
| 40 | Chandi Homam - Flowers Offering | — | donation |
| 41 | Chandi Homam - Groceries Offering | — | donation |
| 42 | Chandi Homam - One Day ($1001) | 1001 | seva |
| 43 | Chandi Homam - Sri Yantra Pooja ($101) | 101 | seva |
| 44 | Chandi Homam - Suvasini Pooja ($251) | 251 | seva |
| 45 | Chandi Homam - Yaama Pooja ($501) | 501 | seva |
| 46 | Choula | — | seva |
| 47 | Class Room Rentals ($25 for 1 Hour) | 25 | rental |
| 48 | Cleaning Fee | — | fee |
| 49 | Conversion | — | seva |
| 50 | Cookville Satyanarayana Fundraising | — | donation |
| 51 | Cultural Events Donation | — | donation |
| 52 | Cultural Patron Fund | — | donation |
| 53 | Dhwajasthabha Kumbhabhishekam | — | seva |
| 54 | Durga Pooja - All Days ($251) | 251 | seva |
| 55 | Durga Pooja - Archana ($51) | 51 | seva |
| 56 | Durva Yugma Pooja ($21) | 21 | seva |
| 57 | Endowment Trust Fund | — | donation |
| 58 | Engagement | — | seva |
| 59 | Facilities Rental - Additional Hours | — | rental |
| 60 | Flower Offering | — | donation |
| 61 | Food | — | sales |
| 62 | Fund Raising | — | donation |
| 63 | Funeral Service | — | seva |
| 64 | Ganapati Homam on Ganesha Chaturthi ($101) | 101 | seva |
| 65 | Ganesh Chaturthi Pooja ($501) | 501 | seva |
| 66 | Ganesh Puran | — | seva |
| 67 | Ganesha Abhishekam on Ganesha Chaturthi ($125) | 125 | seva |
| 68 | Ganesha Archana on Ganesha Chaturthi ($15) | 15 | seva |
| 69 | Ganesha Chaturthi - All Day Pooja ($251) | 251 | seva |
| 70 | Ganesha Moorti Visarjan | — | seva |
| 71 | Garland for Ganesha (8x8) ($250) | 250 | donation |
| 72 | Garland for Other Deities (3x3) ($100) | 100 | donation |
| 73 | Garland for Shiva (5x5) ($150) | 150 | donation |
| 74 | Garland for Venkateswara (8x8) ($250) | 250 | donation |
| 75 | General | — | other |
| 76 | Ghee Abhishekam for Swami Ayyappa on Padi Pooja ($151) | 151 | seva |
| 77 | Gift Shop | — | sales |
| 78 | Gita Parayan - All Day ($101) | 101 | seva |
| 79 | Gita Parayan - one day ($31) | 31 | seva |
| 80 | Group Pithru Tarpanam ($21) | 21 | seva |
| 81 | Gruhapravesam | — | seva |
| 82 | Gruhapravesam - All Day ($501) | 501 | seva |
| 83 | Gruhapravesam and Satyanarayana Pooja | — | seva |
| 84 | Gruhapravesam Key Pooja ($51) | 51 | seva |
| 85 | Habitat for Humanity | — | donation |
| 86 | Hanuman Chalisa ($21) | 21 | seva |
| 87 | Hanuman Jayanti - $101 | 101 | seva |
| 88 | Harvey Disaster Fund | — | donation |
| 89 | Hasya Kavi Sammelan | — | event |
| 90 | Homa | — | seva |
| 91 | Homa - All Day ($501) | 501 | seva |
| 92 | Homa on New Years Day ($51) | 51 | seva |
| 93 | Hundi | — | donation |
| 94 | India Covid-19 Relief Fund | — | donation |
| 95 | Individual Pooja Done by Devotees ($51) | 51 | seva |
| 96 | Individual Pooja on Special Days ($21) | 21 | seva |
| 97 | Individual Pooja on Special Days ($31) | 31 | seva |
| 98 | Individual Pooja on Special Days ($51) | 51 | seva |
| 99 | Irumudi - $125 | 125 | seva |
| 100 | Jagannath Ratha Yatra ($101) | 101 | seva |
| 101 | Janmashtami 4 day Sponsorship ($101) | 101 | seva |
| 102 | Jeernodharana Kumbhabhishekam | — | seva |
| 103 | Jeernodharana Kumbhabhishekam - $10001 | 10001 | seva |
| 104 | Jeernodharana Kumbhabhishekam - $1001 | 1001 | seva |
| 105 | Jeernodharana Kumbhabhishekam - $101 | 101 | seva |
| 106 | Jeernodharana Kumbhabhishekam - $2001 | 2001 | seva |
| 107 | Jeernodharana Kumbhabhishekam - $2501 | 2501 | seva |
| 108 | Jeernodharana Kumbhabhishekam - $251 | 251 | seva |
| 109 | Jeernodharana Kumbhabhishekam - $5001 | 5001 | seva |
| 110 | Jeernodharana Kumbhabhishekam - $501 | 501 | seva |
| 111 | Jeernodharana Kumbhabhishekam - $751 | 751 | seva |
| 112 | Jeernodharana Kumbhabhishekam - Mandala Pooja - $251 | 251 | seva |
| 113 | Jeernodharana Kumbhabhishekam Prasadam Sponsor | — | donation |
| 114 | Kalyana Utsavam | — | seva |
| 115 | Laksharchana-45 days ($501) | 501 | seva |
| 116 | Laksharchana-One day ($31) | 31 | seva |
| 117 | Maala Dhaaranam - $31 | 31 | seva |
| 118 | Maala Dhaaranam and Irumudi - $151 | 151 | seva |
| 119 | Maala Dhaaranam plus Dhothi - $51 | 51 | seva |
| 120 | Mahalaya Pithru Tarpanam - Individual ($51) | 51 | seva |
| 121 | Main Mandap in Prayer Hall (3 hours) ($501) | 501 | rental |
| 122 | Main Mandap in Prayer Hall (Less than 50 people) ($251) | 251 | rental |
| 123 | Main Temple Expansion Project | — | donation |
| 124 | Mata Ki Chowki ($101) | 101 | seva |
| 125 | Mata Ki Chowki ($51) | 51 | seva |
| 126 | Membership - Life Member in 1 Year ($2000) | 2000 | membership |
| 127 | Membership - Life Patron Member ($10000) | 10000 | membership |
| 128 | Membership - Patron Member in 3 Years ($10000) | 10000 | membership |
| 129 | Membership - Regular per Year - Family ($200) | 200 | membership |
| 130 | Membership - Regular per Year - Single ($100) | 100 | membership |
| 131 | Monthly Contribution (ABW) | — | donation |
| 132 | Musical Concert 16-Sep-2017 | — | event |
| 133 | Namakarnam | — | seva |
| 134 | Navagraha Abhishekam | — | seva |
| 135 | Navagraha Abhishekam on Saturdays | — | seva |
| 136 | Navagraha Puja | — | seva |
| 137 | New Born Baby Blessings ($51) | 51 | seva |
| 138 | New Yagashala Rental Deposit ($50) | 50 | rental |
| 139 | Open Table Nashville | — | donation |
| 140 | Other | — | other |
| 141 | Outdoor Kitchen Rental per hour ($50) | 50 | rental |
| 142 | Paal (Milk) Kudam ($51) | 51 | seva |
| 143 | Padi Pooja | — | seva |
| 144 | Padi Pooja - $1001 | 1001 | seva |
| 145 | Padi Pooja - $101 | 101 | seva |
| 146 | Padi Pooja - $501 | 501 | seva |
| 147 | Padi Pooja - $51 | 51 | seva |
| 148 | Pahandi ($31) | 31 | seva |
| 149 | Pakshastry Dakshina | — | fee |
| 150 | Pooja | — | seva |
| 151 | Prasadam Additional Item ($100) | 100 | sales |
| 152 | Prasadam Additional Item ($200) | 200 | sales |
| 153 | Prasadam Hall - 12 Hours ($450) | 450 | rental |
| 154 | Prasadam Hall - 6 Hours ($300) | 300 | rental |
| 155 | Prasadam Hall - Deposit ($100) | 100 | rental |
| 156 | Prasadam Option A | — | sales |
| 157 | Prasadam Option B | — | sales |
| 158 | Prasadam Option C | — | sales |
| 159 | Priest Dakshina | — | fee |
| 160 | Priest Self Travel ($30) | 30 | fee |
| 161 | Priest Services to Other Temples ($351) | 351 | fee |
| 162 | Priest Travel 40-100 Miles ($100) | 100 | fee |
| 163 | Priest Travel Beyond 100 Miles ($251) | 251 | fee |
| 164 | Priests Benefits Fund | — | donation |
| 165 | Raksha Sutra Bandhan ($51) | 51 | seva |
| 166 | Ram Pattabhishekam ($101) | 101 | seva |
| 167 | Ramayan Paat - All Days ($101) | 101 | seva |
| 168 | Ramayan Paat - One Day ($31) | 31 | seva |
| 169 | Ratha Yatra - All Day ($201) | 201 | seva |
| 170 | Sahasranama ($51) | 51 | seva |
| 171 | Sankaabhishekam ($31) | 31 | seva |
| 172 | Sankatahara Chaturthi Homa ($101) | 101 | seva |
| 173 | Satyanarayana Pooja | — | seva |
| 174 | Satyanarayana Pooja - All Day ($501) | 501 | seva |
| 175 | Satyanarayana Pooja on Poornima Day ($51) | 51 | seva |
| 176 | Seemantham | — | seva |
| 177 | Self Service Poojas | — | other |
| 178 | Shani Shanti Homa - $101 | 101 | seva |
| 179 | Shilpies Dakshina | — | fee |
| 180 | Shivarathri Annadhanam ($51) | 51 | donation |
| 181 | Shivarathri Rudrabhishekam ($125) | 125 | seva |
| 182 | Shraddha | — | seva |
| 183 | Sita Rama Kalyanam ($101) | 101 | seva |
| 184 | Sita Rama Kalyanam ($51) | 51 | seva |
| 185 | Soorasamharam | — | seva |
| 186 | Soorasamharam $1001 | 1001 | seva |
| 187 | Soorasamharam $101 | 101 | seva |
| 188 | Soorasamharam $251 | 251 | seva |
| 189 | Soorasamharam $3001 | 3001 | seva |
| 190 | Soorasamharam $501 | 501 | seva |
| 191 | Soorasamharam-Annadhanam ($51) | 51 | donation |
| 192 | Special Events | — | event |
| 193 | Sri Ganesha Abhishekam on New Years Day ($51) | 51 | seva |
| 194 | Sri Shiva Abhishekam on New Year's Day ($51) | 51 | seva |
| 195 | Sri Srinivasa (Balaji) Dolotsavam (Unjal) - $54 | 54 | seva |
| 196 | Sri Srinivasa (Balaji) Kalyana Seva - $116 | 116 | seva |
| 197 | Sri Srinivasa Kalyanam | — | seva |
| 198 | Sri Srinivasa Kalyanam (minimum $101) | 101 | seva |
| 199 | Sri Srinivasa Kalyanam - $101 | 101 | seva |
| 200 | Sri Subrahmanya Kalyanam ($101) | 101 | seva |
| 201 | Sri Valli Devasena Kalyana Utsavam | — | seva |
| 202 | Sri Valli Devasena Kalyana Utsavam - $25 | 25 | seva |
| 203 | Sri Valli Devasena Kalyana Utsavam-$101 | 101 | seva |
| 204 | Sri Valli Devasena Kalyana Utsavam-1001 | 1001 | seva |
| 205 | Sri Valli Devasena Kalyana Utsavam-251 | 251 | seva |
| 206 | Sri Valli Devasena Kalyana Utsavam-3001 | 3001 | seva |
| 207 | Sri Valli Devasena Kalyana Utsavam-501 | 501 | seva |
| 208 | Sri Valli Sri Deva Sena Prathista | — | seva |
| 209 | Sri Venkateswara Abhishekam on New Year's Day ($51) | 51 | seva |
| 210 | Sri Venkateswara Abhishekam on Vaikunta Ekadashi ($125) | 125 | seva |
| 211 | Sri Venkateswara Kalyana Utsavam ($201) | 201 | seva |
| 212 | Sri Venkateswara Kalyana Utsavam - Archana ($51) | 51 | seva |
| 213 | Sri Venkateswara Kalyana Utsavam Flowers ($501) | 501 | donation |
| 214 | Sri Venkateswara Kalyana Utsavam Prasadam ($501) | 501 | donation |
| 215 | Subrahmanya Kalyana Utsavam-$101 | 101 | seva |
| 216 | Sundarakand Havan ($31) | 31 | seva |
| 217 | Sunday Lunch Prasad | — | donation |
| 218 | Sunday Prasad ($2500) | 2500 | donation |
| 219 | Suprabhata Seva SSK April 22nd | — | seva |
| 220 | Swamy Ayyappa 18 Steps (Each Step) - $1000 | 1000 | seva |
| 221 | Swamy Ayyappa Abhisheka Peetam - $2500 | 2500 | seva |
| 222 | Swamy Ayyappa Murthi - $1000 | 1000 | seva |
| 223 | Swamy Ayyappa Prabhavali - $2500 | 2500 | seva |
| 224 | Swamy Ayyappa Prathista - $1001 | 1001 | seva |
| 225 | Swamy Ayyappa Prathista - $101 | 101 | seva |
| 226 | Swamy Ayyappa Prathista - $251 | 251 | seva |
| 227 | Swamy Ayyappa Prathista - $3001 | 3001 | seva |
| 228 | Swamy Ayyappa Prathista - $501 | 501 | seva |
| 229 | Swamy Ayyappa Prathista - Adivasa - $251 | 251 | seva |
| 230 | Swamy Ayyappa Weekly Abhishekam and Padi Pooja - $251 | 251 | seva |
| 231 | Tamil Vishu Baishaki Odiya New Year Dinner Sponsorship ($51) | 51 | donation |
| 232 | Temple Anniversary Pooja (All Days) ($501) | 501 | seva |
| 233 | Temple Anniversary Pooja (One Day) ($151) | 151 | seva |
| 234 | Temple Expansion Rajagopuram - 1 Brick ($51) | 51 | donation |
| 235 | Temple Expansion Rajagopuram - 11 Bricks ($501) | 501 | donation |
| 236 | Temple Expansion Rajagopuram - 2 Bricks ($101) | 101 | donation |
| 237 | Temple Restoration and Future Expansion Projects Fund | — | donation |
| 238 | Temple Short Term Stay | — | rental |
| 239 | Temple Short Term Stay Deposit | — | rental |
| 240 | Thaipoosam | — | seva |
| 241 | Thaipoosam - $1001 | 1001 | seva |
| 242 | Thaipoosam - $101 | 101 | seva |
| 243 | Thaipoosam - $251 | 251 | seva |
| 244 | Thaipoosam - $3001 | 3001 | seva |
| 245 | Thaipoosam - $501 | 501 | seva |
| 246 | Tornado Relief Fund | — | donation |
| 247 | Ugadi Gudipadava Telugu Kannada Marathi Kashmiri New Year Dinner Sponsorship ($51) | 51 | donation |
| 248 | Ugadi Prayuktha Srinivasa Kalyana Utsavam | — | seva |
| 249 | Ukraine Relief Fund | — | donation |
| 250 | Upanayanam | — | seva |
| 251 | Varalakshmi Pooja - Other Day | — | seva |
| 252 | Vendor Booth on Special Events | — | event |
| 253 | Venkateshwara Kalyana Utsavam 1116 (Main Temple Expansion Project) | 1116 | seva |
| 254 | Venkateshwara Kalyana Utsavam 251 (Main Temple Expansion Project) | 251 | seva |
| 255 | Venkateshwara Kalyana Utsavam 501 (Main Temple Expansion Project) | 501 | seva |
| 256 | Venkateswara Kalyana Utsavam Donation | — | donation |
| 257 | Vidya Ganapati Pooja ($5) | 5 | seva |
| 258 | Vidyashankar Violin Concert (Sep 8) | — | event |
| 259 | Vishnu Sahasranama Homam ($31) | 31 | seva |
| 260 | Vishnu Sahasranama Parayanam ($11) | 11 | seva |
| 261 | Walk-In Facilities Services | — | other |
| 262 | Wedding | — | seva |
| 263 | Wedding - All Day ($501) | 501 | seva |
| 264 | Yagashala - 12 hours ($1000) | 1000 | rental |
| 265 | Yagashala - 6 hours ($675) | 675 | rental |
| 266 | Yagashala Full (Above 50 people) ($501) | 501 | rental |
| 267 | Yagashala Full (Up to 50 people) ($125) | 125 | rental |
| 268 | Yagashala Only Center portion (Returned Unclean) ($101) | 101 | rental |
| 269 | Yearly One Day Sponsor ($251) | 251 | donation |

---

## Core pujas (recommended for booking UI)

Subset most likely needed in **devotee book** / **front desk POS** (type = `seva`, common services):

- Archana
- Abhishekam ($125)
- VIP / special archana variants (see full list for festival-specific)
- Satyanarayana Pooja
- Satyanarayana Pooja - All Day ($501)
- Gruhapravesam / Gruhapravesam - All Day ($501)
- Wedding / Wedding - All Day ($501)
- Car Pooja ($75)
- Navagraha Puja / Navagraha Abhishekam
- Homa / Homa - All Day ($501)
- Annaprasanam, Namakarnam, Upanayanam, Seemantham
- Shraddha, Funeral Service
- Kalyana Utsavam / Sri Venkateswara Kalyana Utsavam ($201)
- Padi Pooja (and tiered $51–$1001 variants)
- Sahasranama ($51)
- Chalisa ($31)
- New Born Baby Blessings ($51)

---

## Machine-readable JSON (for seed scripts)

```json
[
  {"id": 1, "name": "60th Birthday (Shasti Abda Poorthi)", "priceUsd": null, "type": "seva"},
  {"id": 2, "name": "Aalayadhar ($1501)", "priceUsd": 1501, "type": "seva"},
  {"id": 3, "name": "Aalayadhar (ABW)", "priceUsd": null, "type": "seva"},
  {"id": 9, "name": "Abhishekam ($125)", "priceUsd": 125, "type": "seva"},
  {"id": 20, "name": "Archana", "priceUsd": null, "type": "seva"},
  {"id": 34, "name": "Car Pooja ($75)", "priceUsd": 75, "type": "seva"},
  {"id": 93, "name": "Hundi", "priceUsd": null, "type": "donation"}
]
```

> Full JSON export: use the table above or run a one-time script against this file. Ask to generate `apps/api/src/data/ganesha-seva-catalog.json` if you want it committed as seed data.

---

## Notes

- **ABW** = likely automatic bank withdrawal (recurring donation).
- **SSK** = one-off event-specific entries (e.g. April 22nd) — consider archiving or mapping to generic seva.
- **Duplicate Srinivasa entries** in source (rows 195–196) kept as-is from live dropdown.
- Prices are **USD** as shown on the temple site; confirm with temple before production billing.
- Session URL `/(S(...))/` is ASP.NET session — use canonical path without session id for future scrapes.

---

*For TMS integration, map `type: seva` → `SevaService` entity; `donation` / `membership` → donation purposes or POS categories.*
