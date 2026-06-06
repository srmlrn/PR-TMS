export const KIOSK_LANG_KEY = 'tms-kiosk-lang';

export type KioskLang = 'en' | 'te' | 'hi';

export const KIOSK_LANGUAGES: { code: KioskLang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'hi', label: 'हिन्दी' },
];

type KioskStrings = {
  welcome: string;
  subtitle: string;
  bookSeva: string;
  bookSevaPageTitle: string;
  bookSevaPageSubtitle: string;
  donate: string;
  donatePageTitle: string;
  donatePageSubtitle: string;
  darshanToken: string;
  myAccount: string;
  staffSignIn: string;
  language: string;
};

const STRINGS: Record<KioskLang, KioskStrings> = {
  en: {
    welcome: 'Welcome',
    subtitle: 'Sri Venkateswara Temple · Self-Service',
    bookSeva: 'Book Seva',
    bookSevaPageTitle: 'Book Seva',
    bookSevaPageSubtitle: 'Select a service, date, and sankalpa details',
    donate: 'Donate',
    donatePageTitle: 'Donate',
    donatePageSubtitle: 'Support the temple — IRS / 80G / CRA compliant receipts',
    darshanToken: 'Darshan Token',
    myAccount: 'My Account',
    staffSignIn: 'Staff sign in',
    language: 'Language',
  },
  te: {
    welcome: 'స్వాగతం',
    subtitle: 'శ్రీ వెంకటేశ్వర స్వామి ఆలయం · స్వయం సేవ',
    bookSeva: 'సేవ బుక్ చేయండి',
    bookSevaPageTitle: 'సేవ బుక్ చేయండి',
    bookSevaPageSubtitle: 'సేవ, తేదీ మరియు సంకల్ప వివరాలను ఎంచుకోండి',
    donate: 'దానం',
    donatePageTitle: 'దానం',
    donatePageSubtitle: 'ఆలయానికి మద్దతు — పన్ను రసీదులు అందుబాటులో',
    darshanToken: 'దర్శన టోకెన్',
    myAccount: 'నా ఖాతా',
    staffSignIn: 'సిబ్బంది ప్రవేశం',
    language: 'భాష',
  },
  hi: {
    welcome: 'स्वागत है',
    subtitle: 'श्री वेंकटेश्वर मंदिर · स्वयं सेवा',
    bookSeva: 'सेवा बुक करें',
    bookSevaPageTitle: 'सेवा बुक करें',
    bookSevaPageSubtitle: 'सेवा, तिथि और संकल्प विवरण चुनें',
    donate: 'दान करें',
    donatePageTitle: 'दान करें',
    donatePageSubtitle: 'मंदिर का समर्थन — कर रसीद उपलब्ध',
    darshanToken: 'दर्शन टोकन',
    myAccount: 'मेरा खाता',
    staffSignIn: 'कर्मचारी साइन इन',
    language: 'भाषा',
  },
};

export function kioskStrings(lang: KioskLang): KioskStrings {
  return STRINGS[lang];
}

export function parseKioskLang(value: string | null | undefined): KioskLang {
  if (value === 'en' || value === 'te' || value === 'hi') return value;
  return 'en';
}

export function readKioskLang(): KioskLang {
  if (typeof window === 'undefined') return 'en';
  const stored = sessionStorage.getItem(KIOSK_LANG_KEY);
  return parseKioskLang(stored);
}

export function persistKioskLang(lang: KioskLang): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(KIOSK_LANG_KEY, lang);
}
