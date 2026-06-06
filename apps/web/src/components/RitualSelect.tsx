import { GOTRAMS, NAKSHATRAS, ritualSelectOptions } from '@tms/types';

type RitualField = 'gotram' | 'nakshatra';

const LISTS: Record<RitualField, readonly string[]> = {
  gotram: GOTRAMS,
  nakshatra: NAKSHATRAS,
};

interface Props {
  id: string;
  field: RitualField;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export function RitualSelect({ id, field, label, value, onChange, required }: Props) {
  const options = ritualSelectOptions(LISTS[field], value);

  return (
    <div className="formGroup">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— Select —</option>
        {options.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </div>
  );
}
