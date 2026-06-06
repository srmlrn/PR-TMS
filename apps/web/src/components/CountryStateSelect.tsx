import {
  COUNTRIES,
  getStatesForCountry,
  isValidRegionForCountry,
  regionSelectOptions,
  ritualSelectOptions,
} from '@tms/types';

interface Props {
  countryId: string;
  stateId: string;
  country: string;
  state: string;
  onCountryChange: (country: string) => void;
  onStateChange: (state: string) => void;
}

export function CountryStateSelect({
  countryId,
  stateId,
  country,
  state,
  onCountryChange,
  onStateChange,
}: Props) {
  const countryCodes = COUNTRIES.map((c) => c.code);
  const countryOptions = ritualSelectOptions(countryCodes, country);
  const regions = regionSelectOptions(getStatesForCountry(country), state);

  function handleCountryChange(nextCountry: string) {
    onCountryChange(nextCountry);
    if (!isValidRegionForCountry(nextCountry, state)) {
      onStateChange('');
    }
  }

  return (
    <>
      <div className="formGroup">
        <label htmlFor={countryId}>Country</label>
        <select
          id={countryId}
          value={country}
          onChange={(e) => handleCountryChange(e.target.value)}
        >
          {countryOptions.map((code) => {
            const entry = COUNTRIES.find((c) => c.code === code);
            return (
              <option key={code} value={code}>
                {entry?.name ?? code}
              </option>
            );
          })}
        </select>
      </div>
      <div className="formGroup">
        <label htmlFor={stateId}>State / Province</label>
        <select id={stateId} value={state} onChange={(e) => onStateChange(e.target.value)}>
          <option value="">— Select —</option>
          {regions.map((region) => (
            <option key={region.code} value={region.code}>
              {region.name === region.code ? region.name : `${region.name} (${region.code})`}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
