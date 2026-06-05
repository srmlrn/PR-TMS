# TMS Mock UI — mockui-sn46

Second-generation interactive HTML mockups for the Temple Management System.
Dark-mode, saffron/maroon design language. No build step required.

## Open

```bash
open /Users/raghu/Code-pr/2026/GitCode/Pr-TPM/mockui-sn46/index.html
```

Or serve locally (avoids file:// quirks):

```bash
cd /Users/raghu/Code-pr/2026/GitCode/Pr-TPM/mockui-sn46
python3 -m http.server 8081
# → http://localhost:8081
```

## Roles & Screens

| Role | Key Screens |
| --- | --- |
| Devotee / Member | Home (desktop + mobile preview), Book Seva, Donate (campaigns), Receipts & Tax Docs (IRS/80G/CRA receipt preview), Live Darshan, Profile |
| Temple Admin | Dashboard (KPIs, charts), Devotees (multi-country), Bookings, Inventory (alerts), Reports (prebuilt + custom builder), Settings (dev/test/uat/prod environments) |
| Front Desk | Reception console (quick lookup + token), POS (prasadam counter, offline), Queue & Tokens (live stats) |
| Priest | Today's schedule (poojas, gotra/nakshatra, mark done, honorarium) |
| Accountant | Finance dashboard (P&L, tax compliance 80G/IRS/CRA, vendor payments) |
| Volunteer | Hours, recognition (Gold tier), available shifts + sign-up |
| Platform Admin | All tenants, MRR, environments, metered usage |
| Self-Service Kiosk | Full-screen touch UI (book, donate, prasadam, token, rooms) |

## Differences from mockui-c25

- Dark theme (deep purple/saffron)
- Glowing temple icon on landing, gradient headings
- Desktop/mobile device toggle on devotee home
- Receipt preview with IRS/501(c)(3) language
- Live darshan with virtual pooja booking notice
- Platform Admin (Super Admin) screen with tenant list, MRR, metered usage
- Smoother stat cards with background accent circles
- Animated queue token card
- Kiosk adds Room Booking and Print Receipt tiles
