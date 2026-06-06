# Temple Management System (TMS) - Requirements

This folder contains the product requirements for a global, multi-tenant, multi-currency
**Temple Management System SaaS** targeting temples in the USA, India, Canada, and other countries.

## Files

- **[REQUIREMENTS.md](REQUIREMENTS.md)** - the master Product Requirements Document (PRD).
  This is the primary document to hand to an AI coding agent or development team.
- **[../docs/DATA_COLLECTION_MATRIX.md](../docs/DATA_COLLECTION_MATRIX.md)** - per-screen data field
  audit cross-checked against GullySales, Grasp, Mandira Pranali, SwaDharmaSetu, temple booking
  sites, and our current API/UI gaps.

## How to use this document

1. Read Sections 1-2 (Overview, Personas) for context.
2. Build from Section 17 (Phased Roadmap) - start with the **MVP** scope, not everything at once.
3. Each functional module (Sections 3-4) includes **features**, **user stories**, and
   **acceptance criteria** so work items can be created directly from them.
4. Sections 6-16 define the non-functional, architecture, payments, security, environments,
   and billing requirements that apply across all modules.
5. Section 18 (Glossary) explains temple-domain terminology used throughout.

## Document status

- Status: Draft v1 (for build)
- Scope: Global SaaS, multi-tenant, multi-currency, multi-language
- Target clients: Web, iOS, Android, macOS, Windows, Linux

## Quick module map

| Group | Modules |
| --- | --- |
| Devotee & Engagement | Devotee/Member CRM, Membership & Pledges, Volunteer Management, Communication Hub, Website + App, Grievance/Feedback |
| Services & Bookings | Services/Poojas Catalog, Seva/Pooja/Darshan Booking, Priest Management, Hall/Venue, Accommodation, Festival Planner, Ticket/Coupon, Parking |
| Donations & Finance | Donation/Hundi, Accounting & Finance, Devotee Bills/Receipts & Tax Documents |
| Operations & Resources | Front Desk, POS/Sales, Canteen/Kitchen & Prasadam, Annadanam, Inventory, Vendor/Procurement, Staff & Payroll, Scheduling/Rostering, Task Management |
| Governance & Insights | Committee & Governance, Reporting & Analytics, Dashboards, Global Search, Document Management & Audit Logs |
| Advanced | Live Streaming/Virtual Darshan, Queue/Crowd, AI Chatbot, Kiosk/Vending, NRI Portal, AI Insights |
| Platform | Multi-tenancy, i18n/Multi-currency, Payments, Security/Compliance, Integrations/APIs, Per-customer Environments, Metered Billing |
