'use client';

import { Button } from '@tms/ui';
import {
  ADDRESS_TYPES,
  DEVOTEE_TITLES,
  EMAIL_TYPES,
  IN_LANGUAGES,
  IN_STATES,
  PHONE_TYPES,
  regionSelectOptions,
} from '@tms/types';
import type {
  AddressType,
  DevoteeAddressEntry,
  DevoteeEmail,
  DevoteePhone,
  DevoteeTitle,
  EmailType,
  PhoneType,
} from '@tms/types';
import { CountryStateSelect } from '@/components/CountryStateSelect';
import type { DevoteeContactFormValue } from '@/lib/devotee-contacts';
import styles from './DevoteeContactFields.module.css';

const PHONE_LABELS: Record<PhoneType, string> = {
  cell: 'Cell',
  home: 'Home',
  work: 'Work',
};

const EMAIL_LABELS: Record<EmailType, string> = {
  home: 'Home',
  work: 'Work',
};

const ADDRESS_LABELS: Record<AddressType, string> = {
  home: 'Home',
  work: 'Work',
};

interface Props {
  idPrefix: string;
  value: DevoteeContactFormValue;
  onChange: (value: DevoteeContactFormValue) => void;
  showMailable?: boolean;
  spanFullClassName?: string;
}

function updatePhones(value: DevoteeContactFormValue, phones: DevoteePhone[]): DevoteeContactFormValue {
  return { ...value, phones };
}

function updateEmails(value: DevoteeContactFormValue, emails: DevoteeEmail[]): DevoteeContactFormValue {
  return { ...value, emails };
}

function updateAddresses(
  value: DevoteeContactFormValue,
  addresses: DevoteeAddressEntry[],
): DevoteeContactFormValue {
  return { ...value, addresses };
}

export function DevoteeContactFields({
  idPrefix,
  value,
  onChange,
  showMailable = true,
  spanFullClassName = '',
}: Props) {
  const indiaStateOptions = regionSelectOptions(IN_STATES, value.indiaState);
  const spanFull = spanFullClassName || styles.spanFull;

  return (
    <>
      <div className="formGroup">
        <label htmlFor={`${idPrefix}-title`}>Title</label>
        <select
          id={`${idPrefix}-title`}
          value={value.title}
          onChange={(e) =>
            onChange({ ...value, title: e.target.value as DevoteeTitle | '' })
          }
        >
          <option value="">—</option>
          {DEVOTEE_TITLES.map((title) => (
            <option key={title} value={title}>
              {title}
            </option>
          ))}
        </select>
      </div>

      <div className={`${spanFull} ${styles.contactSection}`}>
        <div className={styles.sectionHead}>
          <h4 className="tms-t3">Phone numbers</h4>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              onChange(
                updatePhones(value, [...value.phones, { type: 'cell', number: '' }]),
              )
            }
          >
            + Add phone
          </Button>
        </div>
        {value.phones.map((phone, index) => (
          <div key={`phone-${index}`} className={styles.contactRow}>
            <div className="formGroup">
              <label htmlFor={`${idPrefix}-phone-type-${index}`}>Type</label>
              <select
                id={`${idPrefix}-phone-type-${index}`}
                value={phone.type}
                onChange={(e) => {
                  const phones = [...value.phones];
                  phones[index] = { ...phone, type: e.target.value as PhoneType };
                  onChange(updatePhones(value, phones));
                }}
              >
                {PHONE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {PHONE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className={`formGroup ${styles.flexGrow}`}>
              <label htmlFor={`${idPrefix}-phone-${index}`}>
                Number{index === 0 ? ' *' : ''}
              </label>
              <input
                id={`${idPrefix}-phone-${index}`}
                required={index === 0}
                value={phone.number}
                onChange={(e) => {
                  const phones = [...value.phones];
                  phones[index] = { ...phone, number: e.target.value };
                  onChange(updatePhones(value, phones));
                }}
              />
            </div>
            {value.phones.length > 1 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={styles.removeBtn}
                onClick={() =>
                  onChange(updatePhones(value, value.phones.filter((_, i) => i !== index)))
                }
              >
                Remove
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className={`${spanFull} ${styles.contactSection}`}>
        <div className={styles.sectionHead}>
          <h4 className="tms-t3">Email addresses</h4>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              onChange(updateEmails(value, [...value.emails, { type: 'home', address: '' }]))
            }
          >
            + Add email
          </Button>
        </div>
        {value.emails.map((email, index) => (
          <div key={`email-${index}`} className={styles.contactRow}>
            <div className="formGroup">
              <label htmlFor={`${idPrefix}-email-type-${index}`}>Type</label>
              <select
                id={`${idPrefix}-email-type-${index}`}
                value={email.type}
                onChange={(e) => {
                  const emails = [...value.emails];
                  emails[index] = { ...email, type: e.target.value as EmailType };
                  onChange(updateEmails(value, emails));
                }}
              >
                {EMAIL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {EMAIL_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className={`formGroup ${styles.flexGrow}`}>
              <label htmlFor={`${idPrefix}-email-${index}`}>Address</label>
              <input
                id={`${idPrefix}-email-${index}`}
                type="email"
                value={email.address}
                onChange={(e) => {
                  const emails = [...value.emails];
                  emails[index] = { ...email, address: e.target.value };
                  onChange(updateEmails(value, emails));
                }}
              />
            </div>
            {value.emails.length > 1 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={styles.removeBtn}
                onClick={() =>
                  onChange(updateEmails(value, value.emails.filter((_, i) => i !== index)))
                }
              >
                Remove
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className={`${spanFull} ${styles.contactSection}`}>
        <div className={styles.sectionHead}>
          <h4 className="tms-t3">Addresses</h4>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              onChange(
                updateAddresses(value, [
                  ...value.addresses,
                  { type: 'home', line1: '', city: '', country: value.country },
                ]),
              )
            }
          >
            + Add address
          </Button>
        </div>
        {value.addresses.map((address, index) => (
          <div key={`address-${index}`} className={styles.addressBlock}>
            <div className={styles.contactRow}>
              <div className="formGroup">
                <label htmlFor={`${idPrefix}-addr-type-${index}`}>Type</label>
                <select
                  id={`${idPrefix}-addr-type-${index}`}
                  value={address.type}
                  onChange={(e) => {
                    const addresses = [...value.addresses];
                    addresses[index] = { ...address, type: e.target.value as AddressType };
                    onChange(updateAddresses(value, addresses));
                  }}
                >
                  {ADDRESS_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {ADDRESS_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>
              {value.addresses.length > 1 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={styles.removeBtn}
                  onClick={() =>
                    onChange(
                      updateAddresses(value, value.addresses.filter((_, i) => i !== index)),
                    )
                  }
                >
                  Remove
                </Button>
              )}
            </div>
            <div className="formGroup">
              <label htmlFor={`${idPrefix}-addr-line1-${index}`}>Line 1</label>
              <input
                id={`${idPrefix}-addr-line1-${index}`}
                value={address.line1}
                onChange={(e) => {
                  const addresses = [...value.addresses];
                  addresses[index] = { ...address, line1: e.target.value };
                  onChange(updateAddresses(value, addresses));
                }}
              />
            </div>
            <div className="formGroup">
              <label htmlFor={`${idPrefix}-addr-line2-${index}`}>Line 2</label>
              <input
                id={`${idPrefix}-addr-line2-${index}`}
                value={address.line2 ?? ''}
                onChange={(e) => {
                  const addresses = [...value.addresses];
                  addresses[index] = { ...address, line2: e.target.value };
                  onChange(updateAddresses(value, addresses));
                }}
              />
            </div>
            <div className={styles.addressGrid}>
              <div className="formGroup">
                <label htmlFor={`${idPrefix}-addr-city-${index}`}>City</label>
                <input
                  id={`${idPrefix}-addr-city-${index}`}
                  value={address.city}
                  onChange={(e) => {
                    const addresses = [...value.addresses];
                    addresses[index] = { ...address, city: e.target.value };
                    onChange(updateAddresses(value, addresses));
                  }}
                />
              </div>
              <CountryStateSelect
                countryId={`${idPrefix}-addr-country-${index}`}
                stateId={`${idPrefix}-addr-state-${index}`}
                country={address.country || value.country}
                state={address.state ?? ''}
                onCountryChange={(country) => {
                  const addresses = [...value.addresses];
                  addresses[index] = { ...address, country };
                  onChange(updateAddresses(value, addresses));
                }}
                onStateChange={(state) => {
                  const addresses = [...value.addresses];
                  addresses[index] = { ...address, state };
                  onChange(updateAddresses(value, addresses));
                }}
              />
              <div className="formGroup">
                <label htmlFor={`${idPrefix}-addr-postal-${index}`}>Postal</label>
                <input
                  id={`${idPrefix}-addr-postal-${index}`}
                  value={address.postalCode ?? ''}
                  onChange={(e) => {
                    const addresses = [...value.addresses];
                    addresses[index] = { ...address, postalCode: e.target.value };
                    onChange(updateAddresses(value, addresses));
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="formGroup">
        <label htmlFor={`${idPrefix}-india-state`}>India state (origin)</label>
        <select
          id={`${idPrefix}-india-state`}
          value={value.indiaState}
          onChange={(e) => onChange({ ...value, indiaState: e.target.value })}
        >
          <option value="">—</option>
          {indiaStateOptions.map((region) => (
            <option key={region.code} value={region.code}>
              {region.name === region.code ? region.name : `${region.name} (${region.code})`}
            </option>
          ))}
        </select>
      </div>

      <div className="formGroup">
        <label htmlFor={`${idPrefix}-language`}>Preferred language</label>
        <select
          id={`${idPrefix}-language`}
          value={value.preferredLanguage}
          onChange={(e) => onChange({ ...value, preferredLanguage: e.target.value })}
        >
          {IN_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      {showMailable && (
        <div className="formGroup">
          <label htmlFor={`${idPrefix}-mailable`}>
            <input
              id={`${idPrefix}-mailable`}
              type="checkbox"
              checked={value.communicationOptIn}
              onChange={(e) =>
                onChange({ ...value, communicationOptIn: e.target.checked })
              }
            />{' '}
            Mailable (receives temple mailings)
          </label>
        </div>
      )}
    </>
  );
}
