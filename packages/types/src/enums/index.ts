export enum TenantEnvironment {
  DEV = 'dev',
  TEST = 'test',
  UAT = 'uat',
  PROD = 'prod',
}

export enum Currency {
  USD = 'USD',
  INR = 'INR',
  CAD = 'CAD',
  GBP = 'GBP',
}

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum EventLifecycleStage {
  ENQUIRY = 'enquiry',
  QUOTATION = 'quotation',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum RentalStatus {
  QUOTED = 'quoted',
  CONFIRMED = 'confirmed',
  OUT = 'out',
  RETURNED = 'returned',
  OVERDUE = 'overdue',
}

export enum SponsorTier {
  PLATINUM = 'platinum',
  GOLD = 'gold',
  SILVER = 'silver',
  BRONZE = 'bronze',
  UBAYAM = 'ubayam',
}

export enum SponsorPipelineStage {
  LEAD = 'lead',
  APPROACHED = 'approached',
  PROPOSAL_SENT = 'proposal_sent',
  NEGOTIATING = 'negotiating',
  COMMITTED = 'committed',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  RENEWED = 'renewed',
}

export enum PrasadamSponsorshipType {
  DAILY = 'daily',
  FESTIVAL = 'festival',
  ABHISHEKAM = 'abhishekam',
  ANNADANAM = 'annadanam',
  KIT = 'kit',
  RECURRING = 'recurring',
  NRI = 'nri',
}

export enum PrasadamPackageTier {
  BASIC = 'basic',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  NRI_COURIER = 'nri_courier',
}

export enum DonationFrequency {
  ONE_TIME = 'one_time',
  MONTHLY = 'monthly',
  ANNUAL = 'annual',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PARTIAL = 'partial',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

export enum UserRole {
  DEVOTEE = 'devotee',
  ADMIN = 'admin',
  FRONT_DESK = 'frontdesk',
  PRIEST = 'priest',
  ACCOUNTANT = 'accountant',
  VOLUNTEER = 'volunteer',
  SUPER_ADMIN = 'superadmin',
}
