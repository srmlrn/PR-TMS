import type {
  CreateDevoteeInput,
  Devotee,
  DevoteeAddressEntry,
  DevoteeEmail,
  DevoteePhone,
  DevoteeTitle,
} from '@tms/types';
import { hydrateDevoteeContacts, syncPrimaryContacts } from '@tms/types';

export interface DevoteeContactFormValue {
  title: DevoteeTitle | '';
  phones: DevoteePhone[];
  emails: DevoteeEmail[];
  addresses: DevoteeAddressEntry[];
  indiaState: string;
  preferredLanguage: string;
  communicationOptIn: boolean;
  country: string;
}

export const EMPTY_CONTACT_FORM: DevoteeContactFormValue = {
  title: '',
  phones: [{ type: 'cell', number: '', primary: true }],
  emails: [{ type: 'home', address: '' }],
  addresses: [{ type: 'home', line1: '', city: '', country: 'US' }],
  indiaState: '',
  preferredLanguage: 'en',
  communicationOptIn: true,
  country: 'US',
};

export function devoteeToContactForm(d: Devotee): DevoteeContactFormValue {
  const hydrated = hydrateDevoteeContacts(d);
  return {
    title: hydrated.title ?? '',
    phones:
      hydrated.phones && hydrated.phones.length > 0
        ? hydrated.phones
        : [{ type: 'cell', number: d.phone ?? '', primary: true }],
    emails:
      hydrated.emails && hydrated.emails.length > 0
        ? hydrated.emails
        : [{ type: 'home', address: d.email ?? '' }],
    addresses:
      hydrated.addresses && hydrated.addresses.length > 0
        ? hydrated.addresses
        : [
            {
              type: 'home',
              line1: d.address?.line1 ?? '',
              line2: d.address?.line2,
              city: d.address?.city ?? '',
              state: d.address?.state,
              postalCode: d.address?.postalCode,
              country: d.address?.country ?? d.country,
            },
          ],
    indiaState: hydrated.indiaState ?? '',
    preferredLanguage: hydrated.preferredLanguage ?? 'en',
    communicationOptIn: hydrated.communicationOptIn ?? true,
    country: d.country,
  };
}

export function contactFormToApiFields(
  contacts: DevoteeContactFormValue,
): Pick<
  CreateDevoteeInput,
  | 'title'
  | 'phone'
  | 'email'
  | 'address'
  | 'phones'
  | 'emails'
  | 'addresses'
  | 'indiaState'
  | 'preferredLanguage'
  | 'communicationOptIn'
> {
  const synced = syncPrimaryContacts({
    country: contacts.country,
    phones: contacts.phones.filter((p) => p.number.trim()),
    emails: contacts.emails.filter((e) => e.address.trim()),
    addresses: contacts.addresses.filter((a) => a.line1.trim()),
  });

  return {
    title: contacts.title || undefined,
    phone: synced.phone,
    email: synced.email,
    address: synced.address,
    phones: synced.phones,
    emails: synced.emails,
    addresses: synced.addresses,
    indiaState: contacts.indiaState || undefined,
    preferredLanguage: contacts.preferredLanguage || undefined,
    communicationOptIn: contacts.communicationOptIn,
  };
}
