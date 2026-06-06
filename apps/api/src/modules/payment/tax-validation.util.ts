import { BadRequestException } from '@nestjs/common';
import { Currency } from '@tms/types';

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const SSN_RE = /^\d{3}-?\d{2}-?\d{4}$/;
const SIN_RE = /^\d{3}-?\d{3}-?\d{3}$/;

export function validateTaxId(currency: Currency, taxId?: string): void {
  if (!taxId?.trim()) {
    return;
  }

  const value = taxId.trim().toUpperCase();

  switch (currency) {
    case Currency.INR:
      if (!PAN_RE.test(value)) {
        throw new BadRequestException('Invalid PAN format (expected ABCDE1234F)');
      }
      break;
    case Currency.USD: {
      const digits = value.replace(/\D/g, '');
      if (digits.length !== 9) {
        throw new BadRequestException('Invalid SSN/EIN format (9 digits)');
      }
      break;
    }
    case Currency.CAD: {
      const digits = value.replace(/\D/g, '');
      if (digits.length !== 9) {
        throw new BadRequestException('Invalid SIN format (9 digits)');
      }
      break;
    }
    default:
      break;
  }
}
