/** Photo URLs scraped from https://ganeshatemple.org/committee/ */
const GANESHA_COMMITTEE_PHOTOS: Record<string, string> = {
  "s.p.singh": "https://ganeshatemple.org/wp-content/uploads/2017/01/S-P-Singh-e1493957609672-225x300.jpg",
  "chandramouly srinivasan": "https://ganeshatemple.org/wp-content/uploads/2022/12/2022-chandramouly-srinivasan-210x300.jpg",
  "suseela somarajan - chair": "https://ganeshatemple.org/wp-content/uploads/2022/12/TP__020-211x300.jpg",
  "naveen srinivas": "https://ganeshatemple.org/wp-content/uploads/2022/12/2022-naveen-srinivas-dr-200x300.jpg",
  "thanigai muthu": "https://ganeshatemple.org/wp-content/uploads/2022/12/TP__171-205x300.jpg",
  "rakesh sawarkar": "https://ganeshatemple.org/wp-content/uploads/2022/12/TP__001-214x300.jpg",
  "venkat reddy": "https://ganeshatemple.org/wp-content/uploads/2021/02/DrVenkatReddy_Year2021Photo.jpeg",
  "chandramouly srinivasan - co-chair": "https://ganeshatemple.org/wp-content/uploads/2022/12/2022-chandramouly-srinivasan-210x300.jpg",
  "suseela somarajan": "https://ganeshatemple.org/wp-content/uploads/2022/12/TP__020-211x300.jpg",
  "jyotheen karam": "https://ganeshatemple.org/wp-content/uploads/2022/12/2022-jyotheen-karam-270x300.jpg",
  "pankaj srivastava": "https://ganeshatemple.org/wp-content/uploads/2022/12/2022-pankaj-srivastava-223x300.jpg",
  "suma srinivas": "https://ganeshatemple.org/wp-content/uploads/2022/12/2022-suma-srinivas-244x300.jpg",
  "venk mani": "https://ganeshatemple.org/wp-content/uploads/2022/12/2022-venk-mani-dr-227x300.jpg",
  "rama reddy": "https://ganeshatemple.org/wp-content/uploads/2017/04/Rama-Reddy.png",
  "thanigai muthu - co-chair": "https://ganeshatemple.org/wp-content/uploads/2022/12/TP__122-259x300.jpg",
  "mohan reddy": "https://ganeshatemple.org/wp-content/uploads/2017/04/Mohan-Reddy.png",
  "saraswathi gowda": "https://ganeshatemple.org/wp-content/uploads/2017/04/Saraswathi-Gowda.png",
  "usha mani": "https://ganeshatemple.org/wp-content/uploads/2022/12/2022-usha-mani-209x300.jpg",
  "anil somayaji - chair": "https://ganeshatemple.org/wp-content/uploads/2022/12/2022-anil-somayaji-200x300.jpg",
  "shanmuga sundaram": "https://ganeshatemple.org/wp-content/uploads/2022/12/TP__158-237x300.jpg",
  "angeli jain": "https://ganeshatemple.org/wp-content/uploads/2022/12/2022-angeli-jain-203x300.jpg",
  "kamala raghunathan": "https://ganeshatemple.org/wp-content/uploads/2022/12/2022-kamala-raghunathan-236x300.jpg",
  "nishitha reddy": "https://ganeshatemple.org/wp-content/uploads/2022/12/2022-nishitha-reddy-217x300.jpg",
  "ashokan vattakkattil - chair": "https://ganeshatemple.org/wp-content/uploads/2022/12/TP__033-210x300.jpg",
  "prathiba sundaresh": "https://ganeshatemple.org/wp-content/uploads/2017/01/Pratibha-Sundaresh-225x300.png",
  "sankar mahadevan": "https://ganeshatemple.org/wp-content/uploads/2022/12/2022-sankar-mahadevan-dr-232x300.jpg",
  "krish ullur": "https://ganeshatemple.org/wp-content/uploads/2017/01/Krish-Ullur.png",
  "suma srinivas - chair": "https://ganeshatemple.org/wp-content/uploads/2017/04/Suma-Srinivas.png",
  "sumedha somayaji": "https://ganeshatemple.org/wp-content/uploads/2017/01/Sumedha-Somyaji.png",
  "lata duseja": "https://ganeshatemple.org/wp-content/uploads/2017/01/Lata-Duseja.png",
  "pratibha sundaresh": "https://ganeshatemple.org/wp-content/uploads/2017/01/Pratibha-Sundaresh.png",
  "leela gowda": "https://ganeshatemple.org/wp-content/uploads/2017/05/Leela-Gowda-e1494020168612-225x300.jpg",
  "malleshwari parichuri": "https://ganeshatemple.org/wp-content/uploads/2017/01/Malleshwari-Parichuri.png",
  "mangala channabassappa": "https://ganeshatemple.org/wp-content/uploads/2017/01/Mangala-Channabassappa.png",
  "sudhir vaikunth": "https://ganeshatemple.org/wp-content/uploads/2017/01/Sudhir-e1494022531408-225x300.jpg",
  "alok nanda": "https://ganeshatemple.org/wp-content/uploads/2022/12/2022-alok-nanda-218x300.jpg",
  "pushpa ullur": "https://ganeshatemple.org/wp-content/uploads/2022/12/2022-pushpa-ullur-252x300.jpg",
  "nishitha reddy - chair": "https://ganeshatemple.org/wp-content/uploads/2022/12/2022-nishitha-reddy-217x300.jpg",
  "rama jaikumar": "https://ganeshatemple.org/wp-content/uploads/2022/12/TP__005-233x300.jpg",
  "monal": "https://ganeshatemple.org/wp-content/uploads/2022/12/TP__016-200x300.jpg",
  "padmashri snbhat": "https://ganeshatemple.org/wp-content/uploads/2022/12/TP__017-205x300.jpg",
  "radha kirtane - chair": "https://ganeshatemple.org/wp-content/uploads/2017/01/Radha-Kirtane.png",
  "naga rajan": "https://ganeshatemple.org/wp-content/uploads/2026/02/Naga-Pic03.jpg",
  "rita gupta": "https://ganeshatemple.org/wp-content/uploads/2017/05/rita-e1494966499942-225x300.jpg",
  "nil bisoi": "https://ganeshatemple.org/wp-content/uploads/2017/01/Nil-Bisoi.png",
  "thanigs muthu": "https://ganeshatemple.org/wp-content/uploads/2022/12/TP__122-259x300.jpg",
  "priya mani": "https://ganeshatemple.org/wp-content/uploads/2022/12/2022-priya-mani-235x300.jpg",
  "pankaj srivastava - chair": "https://ganeshatemple.org/wp-content/uploads/2022/12/2022-pankaj-srivastava-223x300.jpg",
  "manoj senapati": "https://ganeshatemple.org/wp-content/uploads/2022/12/2022-manoj-senapati-212x300.jpg",
  "cv dash": "https://ganeshatemple.org/wp-content/uploads/2022/12/TP__035-212x300.jpg",
  "ashokan vattakkattil": "https://ganeshatemple.org/wp-content/uploads/2022/12/TP__033-210x300.jpg",
  "dr.suseela somarajan - chair": "https://ganeshatemple.org/wp-content/uploads/2022/12/TP__020-211x300.jpg",
  "naga rajan - chair": "https://ganeshatemple.org/wp-content/uploads/2026/02/Naga-Pic03.jpg",
  "radha babu reddy": "https://ganeshatemple.org/wp-content/uploads/2017/01/Radha-Babu-Reddy.png",
  "kalai mugilan": "https://ganeshatemple.org/wp-content/uploads/2017/01/Kalai-Mugilan.png",
  "priya mani - chair": "https://ganeshatemple.org/wp-content/uploads/2022/12/2022-priya-mani-235x300.jpg",
  "dr. cv dash - chair": "https://ganeshatemple.org/wp-content/uploads/2022/12/TP__035-212x300.jpg",
  "sameer srivastav": "https://ganeshatemple.org/wp-content/uploads/2017/01/Sameer-Srivastava-e1494967340135-225x300.jpg",
  "rajeev mehta": "https://ganeshatemple.org/wp-content/uploads/2017/01/Rajeev-e1493957767668-225x300.jpg",
  "ramesh sharma": "https://ganeshatemple.org/wp-content/uploads/2017/01/Ramessh-Sharma.png",
  "naveen srinivas - chair": "https://ganeshatemple.org/wp-content/uploads/2017/04/Naveen-Srinivas.png",
  "jayaraman muthusamy": "https://ganeshatemple.org/wp-content/uploads/2017/06/mjayaraman.jpg",
  "n rao chunduru": "https://ganeshatemple.org/wp-content/uploads/2017/05/rao-e1494966754326-225x300.jpg",
  "meera kumar - chair": "https://ganeshatemple.org/wp-content/uploads/2017/05/meera-e1494965770157-225x300.jpg",
  "chandramouly srinivasan - chair": "https://ganeshatemple.org/wp-content/uploads/2022/12/2022-chandramouly-srinivasan-210x300.jpg",
  "sunil kaza - chair": "https://ganeshatemple.org/wp-content/uploads/2018/10/sunilkaza.jpg",
  "raghavendra": "https://ganeshatemple.org/wp-content/uploads/2018/10/raghavendra.jpg",
  "kevin": "https://ganeshatemple.org/wp-content/uploads/2017/01/Kevin.png",
  "swetha sakkari": "https://ganeshatemple.org/wp-content/uploads/2022/12/front-desk-team-260x300.jpg",
  "prakash desai": "https://ganeshatemple.org/wp-content/uploads/2017/01/Prakash.png",
  "olga kryshtal": "https://ganeshatemple.org/wp-content/uploads/2022/12/front-desk-team-1-275x300.jpg"
};

const PHOTO_ALIASES: Record<string, string> = {
  "s.p.singh": "s.p.singh",
  "s p singh": "s.p.singh",
  "angeli jain": "angeli jain",
  "prathiba sundaresh": "pratibha sundaresh",
  "thanigs muthu": "thanigai muthu",
  "suseela somarajan": "suseela somarajan",
  "dr.suseela somarajan": "suseela somarajan",
  "cv dash": "cv dash",
  "dr. cv dash": "cv dash",
  "ashokan vattakkattil": "ashokan vattakkattil - chair",
  "arul nayagadurai": "arul nayagadurai - chair",
  "naga rajan - chair": "naga rajan",
  "priya mani - chair": "priya mani",
  "sudhir vaikunth": "sudhir vaikunth",
  "sumedha somayaji": "sumedha somayaji",
  "sameer srivastav": "sameer srivastav",
  "n rao chunduru": "n rao chunduru",
  "rao velaga": "n rao chunduru",
  "radha babu reddy": "radha babu reddy",
  "jayaraman muthusamy": "jayaraman muthusamy",
  "ramesh sharma": "ramesh sharma",
  "prakash desai": "prakash desai",
  "prakash patel": "prakash desai"
};

function normalizePhotoLookupKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s*-\s*(chair|co-chair|secretary|treasurer).*$/i, '')
    .replace(/^dr\.?\s*/i, '')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function lookupGaneshaCommitteePhoto(name: string): string | undefined {
  const raw = name.trim().toLowerCase();
  const withoutRole = raw.replace(/\s*-\s*(chair|co-chair|secretary|treasurer).*$/i, '').trim();
  const normalized = normalizePhotoLookupKey(name);
  const candidates = [
    raw,
    withoutRole,
    normalized,
    PHOTO_ALIASES[withoutRole],
    PHOTO_ALIASES[normalized],
  ].filter(Boolean) as string[];
  for (const key of candidates) {
    const hit = GANESHA_COMMITTEE_PHOTOS[key] ?? GANESHA_COMMITTEE_PHOTOS[PHOTO_ALIASES[key] ?? ''];
    if (hit) return hit;
  }
  return undefined;
}
