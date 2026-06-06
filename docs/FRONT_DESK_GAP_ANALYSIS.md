# Front Desk Gap Analysis — PR-TMS vs Industry

Sources: [TempleManagementSoftware](https://www.templemanagementsoftware.com/), [Grasp TMS](https://graspsoftwaresolutions.com/temple-management-system), [VirtuaQ](https://virtuaq.com/temple-visitor-management-system), [FrontDesk Suite QMS](https://frontdesksuite.com/en/), PRD §3.D.1–3.D.2.

## Industry-standard front desk capabilities

| Capability | VirtuaQ / TMS / PRD | PR-TMS before | PR-TMS after this pass |
|------------|---------------------|---------------|------------------------|
| Phone lookup | ✅ | ✅ | ✅ |
| Name lookup | ✅ | ❌ | ✅ |
| Walk-in register | ✅ | ✅ inline | ✅ |
| Devotee profile + today bookings | ✅ | Partial | ✅ + check-in |
| Darshan queue token | ✅ | ✅ | ✅ |
| Priority / VIP queue | ✅ | ❌ | ✅ |
| Queue types (darshan/seva) | Common | ❌ | ✅ |
| Live queue list | ✅ | ❌ | ✅ `/frontdesk/queue` |
| Call next / mark served | ✅ | ❌ | ✅ |
| Display board (TV) | ✅ | ❌ | ✅ public `/frontdesk/display` + `/frontdesk/display-board` API |
| SMS/WhatsApp token notify | ✅ | ❌ | ✅ stub via notifications API |
| Counter booking + payment + receipt | PRD AC1 | Partial (1st service) | ✅ full form |
| Counter donation + receipt | ✅ | ✅ | ✅ |
| POS day summary | ✅ | ✅ | ✅ |
| Print token / receipt | ✅ | ✅ | ✅ (+ receipt-print chrome fix) |
| Prasadam counter sale | POS §3.D.2 | ❌ | ✅ quick link |
| Barcode / QR scan | Some | ❌ | 🔜 future |
| Multi-counter offline POS | PRD | ❌ | 🔜 future |
| Shift open/close | POS | ❌ | 🔜 future |

## Screens

| Route | Purpose |
|-------|---------|
| `/frontdesk/console` | Primary counter: lookup, register, token, book, donate, POS |
| `/frontdesk/queue` | Staff queue control: call next, serve, priority view |
| `/frontdesk/display` | Public TV: multi-lane counters, stats, ticker, chime (no login) |
| `/frontdesk/token-print` | Thermal-friendly token slip |
| `/frontdesk/receipt-print` | Thermal-friendly payment receipt |

*Last updated: 2026-06-06*
