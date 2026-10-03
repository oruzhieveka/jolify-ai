import type { Destination } from '../types.ts';
import { DESTINATION_TRANSLATIONS } from './destination-translations.ts';
// Generated once from the prototype (index.html). Demo data: every listing/partner is_demo=true
// and is labelled as a sample in the UI. Prices are illustrative, not quotes from real businesses.
const BASE_DESTINATIONS: Destination[] = [
 {
  "id": "bishkek",
  "name": {
   "en": "Bishkek",
   "ru": "Бишкек",
   "ky": "Бишкек"
  },
  "region": "Chuy",
  "lat": 42.874,
  "lon": 74.59,
  "season": "Apr-Oct",
  "duration": "1-2 days",
  "difficulty": null,
  "budgetPerDayUsd": 45,
  "tags": [
   "culture",
   "food",
   "city"
  ],
  "activities": [
   "Osh Bazaar walk and street food",
   "Ala-Too Square and Oak Park",
   "State History Museum"
  ],
  "description": {
   "en": "Leafy capital with Soviet-modernist avenues at the foot of the Kyrgyz Ala-Too range. Your gateway, and the best place in the country to eat."
  },
  "tips": [
   "Yandex Go taxis are cheap and reliable.",
   "Bazaars close early on Mondays."
  ],
  "order": 0,
  "popularity": 0,
  "zone": "hub",
  "dayTitle": "Bishkek",
  "details": {
   "altitudeM": 800,
   "history": "Founded as the Kokand fortress of Pishpek in 1825; named Frunze in the Soviet era and Bishkek since 1991.",
   "howToGetThere": "Manas International Airport (FRU) is about 30 km north of the centre; taxis via apps are the simplest transfer."
  }
 },
 {
  "id": "ala-archa",
  "name": {
   "en": "Ala Archa",
   "ru": "Ала-Арча",
   "ky": "Ала-Арча"
  },
  "region": "Chuy",
  "lat": 42.565,
  "lon": 74.483,
  "season": "May-Oct",
  "duration": "1 day",
  "difficulty": "Moderate",
  "budgetPerDayUsd": 30,
  "tags": [
   "mountains",
   "hiking",
   "photo"
  ],
  "activities": [
   "Ak-Sai waterfall trail",
   "Gorge walk among juniper forest",
   "Views of Korona peak"
  ],
  "description": {
   "en": "National park 40 km south of Bishkek. Juniper-lined gorge, glaciers and 4,000 m peaks within an hour of the city."
  },
  "tips": [
   "Park entry is paid at the gate in cash.",
   "Start early; afternoon clouds hide the peaks."
  ],
  "order": 1,
  "popularity": 4,
  "zone": "north",
  "dayTitle": "Ala Archa gorge day hike",
  "details": {
   "altitudeM": 2150,
   "history": "Protected as a national park since 1976.",
   "howToGetThere": "About 40 km south of Bishkek: roughly one hour by taxi or private driver. No regular public transport to the gate.",
   "safety": "Weather changes quickly above the tree line; carry layers and water."
  }
 },
 {
  "id": "issyk-kul",
  "name": {
   "en": "Issyk-Kul (South Shore)",
   "ru": "Иссык-Куль (южный берег)",
   "ky": "Ысык-Көл (түштүк жээк)"
  },
  "region": "Issyk-Kul",
  "lat": 42.12,
  "lon": 76.99,
  "season": "Jun-Sep",
  "duration": "2-3 days",
  "difficulty": "Easy",
  "budgetPerDayUsd": 40,
  "tags": [
   "lake",
   "nomad",
   "relax",
   "culture",
   "photo"
  ],
  "activities": [
   "Swim at a quiet south-shore beach",
   "Walk the shore at sunset",
   "Visit a yurt-making workshop village"
  ],
  "description": {
   "en": "The world's second-largest alpine lake. The south shore is wilder and quieter than the north, with red cliffs, yurt camps and eagle hunters."
  },
  "tips": [
   "Water is coldest in June; best swimming mid-July to August."
  ],
  "order": 5.8,
  "popularity": 3,
  "zone": "north",
  "dayTitle": "Issyk-Kul south shore",
  "details": {
   "altitudeM": 1607,
   "history": "A Silk Road lake; it never freezes despite its altitude because of its mild salinity.",
   "howToGetThere": "South shore villages are 4 to 6 hours from Bishkek by road; shared taxis leave from the Western and Eastern bus stations."
  }
 },
 {
  "id": "cholpon-ata",
  "name": {
   "en": "Cholpon-Ata",
   "ru": "Чолпон-Ата",
   "ky": "Чолпон-Ата"
  },
  "region": "Issyk-Kul",
  "lat": 42.649,
  "lon": 77.082,
  "season": "Jun-Sep",
  "duration": "1-2 days",
  "difficulty": "Easy",
  "budgetPerDayUsd": 55,
  "tags": [
   "lake",
   "relax",
   "culture"
  ],
  "activities": [
   "Petroglyph field walk",
   "Beach afternoon",
   "Rukh Ordo cultural center"
  ],
  "description": {
   "en": "North-shore resort town on Issyk-Kul, known for Bronze Age petroglyphs and summer beaches."
  },
  "tips": [
   "Busy in late July; book stays ahead."
  ],
  "order": 11,
  "popularity": 3,
  "zone": "north",
  "dayTitle": "Cholpon-Ata and the petroglyphs",
  "details": {
   "altitudeM": 1620,
   "history": "Known for its open-air petroglyph field with carvings from the Bronze Age onward.",
   "howToGetThere": "North shore of Issyk-Kul, about 250 km from Bishkek (around 4 hours)."
  }
 },
 {
  "id": "karakol",
  "name": {
   "en": "Karakol",
   "ru": "Каракол",
   "ky": "Каракол"
  },
  "region": "Issyk-Kul",
  "lat": 42.49,
  "lon": 78.393,
  "season": "Year-round",
  "duration": "2 days",
  "difficulty": null,
  "budgetPerDayUsd": 40,
  "tags": [
   "food",
   "culture",
   "mountains",
   "hiking"
  ],
  "activities": [
   "Dungan Mosque and wooden Holy Trinity Cathedral",
   "Sunday animal market",
   "Ashlyan-fu crawl"
  ],
  "description": {
   "en": "Trekking capital of the east, with wooden Russian houses, a Dungan mosque built without nails and the best ashlyan-fu in the country."
  },
  "tips": [
   "Sunday animal market starts at dawn."
  ],
  "order": 9,
  "popularity": 4,
  "zone": "north",
  "dayTitle": "Karakol town",
  "details": {
   "altitudeM": 1720,
   "history": "Founded in 1869 as a Russian military and trading post; home to a wooden Holy Trinity cathedral and the Dungan mosque built without nails.",
   "howToGetThere": "About 400 km from Bishkek via the north shore (6 to 7 hours). Marshrutkas run daily from Bishkek."
  }
 },
 {
  "id": "altyn-arashan",
  "name": {
   "en": "Altyn Arashan",
   "ru": "Алтын-Арашан",
   "ky": "Алтын-Арашан"
  },
  "region": "Issyk-Kul",
  "lat": 42.372,
  "lon": 78.628,
  "season": "Jun-Sep",
  "duration": "1-2 days",
  "difficulty": "Moderate",
  "budgetPerDayUsd": 35,
  "tags": [
   "mountains",
   "horses",
   "relax",
   "hiking"
  ],
  "activities": [
   "Hike up the Arashan valley",
   "Soak in the hot springs",
   "View of Palatka peak"
  ],
  "description": {
   "en": "High valley with natural hot springs under Palatka peak, reached on foot, on horseback or by old Soviet truck."
  },
  "tips": [
   "The road is rough: 4x4 or hike (about 5 hours up)."
  ],
  "order": 10,
  "popularity": 3,
  "zone": "north",
  "dayTitle": "Altyn Arashan hot springs",
  "details": {
   "altitudeM": 3000,
   "culture": "Hot-spring valley used by shepherds and trekkers.",
   "howToGetThere": "From Ak-Suu village near Karakol: 4x4 transfer on a rough track, or a 4 to 6 hour hike.",
   "safety": "Altitude around 3,000 m: ascend gradually and carry warm clothing."
  }
 },
 {
  "id": "jeti-oguz",
  "name": {
   "en": "Jeti-Oguz",
   "ru": "Джети-Огуз",
   "ky": "Жети-Өгүз"
  },
  "region": "Issyk-Kul",
  "lat": 42.335,
  "lon": 78.232,
  "season": "May-Oct",
  "duration": "1 day",
  "difficulty": "Easy",
  "budgetPerDayUsd": 30,
  "tags": [
   "mountains",
   "horses",
   "photo"
  ],
  "activities": [
   "Seven Bulls red rocks",
   "Broken Heart rock viewpoint",
   "Valley of Flowers walk"
  ],
  "description": {
   "en": "Red sandstone cliffs called the Seven Bulls, opening into alpine meadows grazed by horses in summer."
  },
  "tips": [
   "Best light for photos is late afternoon."
  ],
  "order": 8,
  "popularity": 3,
  "zone": "north",
  "dayTitle": "Jeti-Oguz red rocks",
  "details": {
   "altitudeM": 2200,
   "culture": "Named after the red sandstone \"Seven Bulls\" cliffs; the Broken Heart rock is nearby.",
   "howToGetThere": "About 25 km west of Karakol, around 40 minutes by car."
  }
 },
 {
  "id": "song-kul",
  "name": {
   "en": "Song-Kul",
   "ru": "Сон-Куль",
   "ky": "Соң-Көл"
  },
  "region": "Naryn",
  "lat": 41.83,
  "lon": 75.13,
  "season": "Jun-Sep",
  "duration": "2 days",
  "difficulty": "Moderate",
  "budgetPerDayUsd": 35,
  "tags": [
   "horses",
   "nomad",
   "mountains",
   "photo",
   "lake"
  ],
  "activities": [
   "Evening with a shepherd family",
   "Sunrise over the lake",
   "Milky Way photography"
  ],
  "description": {
   "en": "Alpine lake at 3,000 m ringed by summer pastures. Herders move up with their yurts from June: the purest nomad experience in the country."
  },
  "tips": [
   "No electricity grid; camps run on solar.",
   "Roads open roughly June to September."
  ],
  "order": 4,
  "popularity": 5,
  "zone": "north",
  "dayTitle": "Nights with shepherds at Song-Kul",
  "details": {
   "altitudeM": 3016,
   "culture": "Summer pasture (jailoo) where herders live in yurts from June to September.",
   "howToGetThere": "Via Kochkor on mountain roads, usually passable only in summer; 4x4 recommended.",
   "safety": "No mobile signal; nights can be near freezing even in July."
  }
 },
 {
  "id": "tash-rabat",
  "name": {
   "en": "Tash Rabat",
   "ru": "Таш-Рабат",
   "ky": "Таш-Рабат"
  },
  "region": "Naryn",
  "lat": 40.823,
  "lon": 75.289,
  "season": "Jun-Sep",
  "duration": "1-2 days",
  "difficulty": "Moderate",
  "budgetPerDayUsd": 35,
  "tags": [
   "culture",
   "horses",
   "nomad",
   "photo"
  ],
  "activities": [
   "15th-century stone caravanserai",
   "Ride toward the Chatyr-Kul pass",
   "Yurt night in the valley"
  ],
  "description": {
   "en": "Stone caravanserai on a Silk Road branch, hidden in a quiet valley near the Chinese border."
  },
  "tips": [
   "Remote: combine with Naryn and Chatyr-Kul."
  ],
  "order": 5,
  "popularity": 2,
  "zone": "remote",
  "dayTitle": "Tash Rabat caravanserai",
  "details": {
   "altitudeM": 3200,
   "history": "Stone caravanserai on a branch of the Silk Road, usually dated to the 15th century.",
   "howToGetThere": "About 90 km south of Naryn on the road to the Torugart pass."
  }
 },
 {
  "id": "naryn",
  "name": {
   "en": "Naryn",
   "ru": "Нарын",
   "ky": "Нарын"
  },
  "region": "Naryn",
  "lat": 41.428,
  "lon": 75.991,
  "season": "May-Oct",
  "duration": "1 day",
  "difficulty": null,
  "budgetPerDayUsd": 30,
  "tags": [
   "culture",
   "mountains"
  ],
  "activities": [
   "Walk the Naryn river embankment",
   "Regional museum",
   "Salkyn-Tor gorge"
  ],
  "description": {
   "en": "Long river town, the practical hub for the inner Tien Shan and the road to Tash Rabat."
  },
  "tips": [
   "Good place to restock cash and fuel."
  ],
  "order": 4.6,
  "popularity": 1,
  "zone": "remote",
  "dayTitle": "Naryn",
  "details": {
   "altitudeM": 2040,
   "howToGetThere": "About 5 hours from Bishkek by road; the base for Tash Rabat and the Torugart road."
  }
 },
 {
  "id": "osh",
  "name": {
   "en": "Osh",
   "ru": "Ош",
   "ky": "Ош"
  },
  "region": "Osh",
  "lat": 40.513,
  "lon": 72.816,
  "season": "Apr-Oct",
  "duration": "2 days",
  "difficulty": null,
  "budgetPerDayUsd": 35,
  "tags": [
   "culture",
   "food"
  ],
  "activities": [
   "Sulaiman-Too sacred mountain",
   "Jayma Bazaar",
   "Plov lunch"
  ],
  "description": {
   "en": "One of Central Asia's oldest cities, centered on the UNESCO-listed Sulaiman-Too mountain and a vast bazaar."
  },
  "tips": [
   "Dress modestly at Sulaiman-Too."
  ],
  "order": -3,
  "popularity": 3,
  "zone": "south",
  "dayTitle": "Osh old city",
  "details": {
   "altitudeM": 1000,
   "history": "One of the oldest cities in Central Asia. Sulaiman-Too mountain is a UNESCO World Heritage Site (2009).",
   "howToGetThere": "Daily flights from Bishkek take about an hour; by road it is a long mountain drive of 10 or more hours."
  }
 },
 {
  "id": "arslanbob",
  "name": {
   "en": "Arslanbob",
   "ru": "Арсланбоб",
   "ky": "Арстанбап"
  },
  "region": "Jalal-Abad",
  "lat": 41.333,
  "lon": 72.933,
  "season": "May-Oct",
  "duration": "2 days",
  "difficulty": "Moderate",
  "budgetPerDayUsd": 25,
  "tags": [
   "hiking",
   "mountains",
   "food"
  ],
  "activities": [
   "World's largest walnut forest",
   "Big and small waterfalls",
   "Homestay cooking"
  ],
  "description": {
   "en": "Village in the world's largest wild walnut forest, with waterfalls and community homestays."
  },
  "tips": [
   "Community tourism office arranges guides."
  ],
  "order": -2,
  "popularity": 2,
  "zone": "south",
  "dayTitle": "Arslanbob walnut forest",
  "details": {
   "altitudeM": 1600,
   "culture": "Village surrounded by one of the largest wild walnut forests in the world.",
   "howToGetThere": "From Jalal-Abad by shared taxi, about 2 to 3 hours."
  }
 },
 {
  "id": "sary-chelek",
  "name": {
   "en": "Sary-Chelek",
   "ru": "Сары-Челек",
   "ky": "Сары-Челек"
  },
  "region": "Jalal-Abad",
  "lat": 41.866,
  "lon": 71.966,
  "season": "Jun-Sep",
  "duration": "2 days",
  "difficulty": "Moderate",
  "budgetPerDayUsd": 30,
  "tags": [
   "lake",
   "hiking",
   "photo"
  ],
  "activities": [
   "Lake viewpoint trail",
   "Biosphere reserve walk",
   "Boat to hidden lakes"
  ],
  "description": {
   "en": "UNESCO biosphere reserve with a deep turquoise lake set in forested mountains."
  },
  "tips": [
   "Reserve fee payable at the entrance."
  ],
  "order": -1,
  "popularity": 2,
  "zone": "south",
  "dayTitle": "Sary-Chelek reserve",
  "details": {
   "altitudeM": 1870,
   "culture": "Lake inside a UNESCO biosphere reserve.",
   "howToGetThere": "Remote: from Jalal-Abad or Tash-Kumyr via Arkyt village; a full day of driving."
  }
 },
 {
  "id": "suusamyr",
  "name": {
   "en": "Suusamyr",
   "ru": "Суусамыр",
   "ky": "Суусамыр"
  },
  "region": "Chuy",
  "lat": 42.18,
  "lon": 73.95,
  "season": "Jun-Sep",
  "duration": "1 day",
  "difficulty": "Easy",
  "budgetPerDayUsd": 30,
  "tags": [
   "mountains",
   "horses",
   "nomad"
  ],
  "activities": [
   "High valley pastures",
   "Kumys tasting with herders",
   "Too-Ashuu pass drive"
  ],
  "description": {
   "en": "Broad high valley between two ranges, full of summer yurts, on the Bishkek to Osh highway."
  },
  "tips": [
   "Too-Ashuu tunnel can close in bad weather."
  ],
  "order": -0.5,
  "popularity": 1,
  "zone": "west",
  "dayTitle": "Suusamyr valley",
  "details": {
   "altitudeM": 2200,
   "howToGetThere": "High valley on the Bishkek to Osh highway, about 3 hours from Bishkek over the Too-Ashuu pass."
  }
 },
 {
  "id": "skazka",
  "name": {
   "en": "Skazka Canyon",
   "ru": "Каньон Сказка",
   "ky": "Жомок капчыгайы"
  },
  "region": "Issyk-Kul",
  "lat": 42.159,
  "lon": 77.357,
  "season": "May-Oct",
  "duration": "Half day",
  "difficulty": "Easy",
  "budgetPerDayUsd": 15,
  "tags": [
   "photo",
   "adventure"
  ],
  "activities": [
   "Scramble the red ridges",
   "Lake views from the top",
   "Golden-hour photos"
  ],
  "description": {
   "en": "\"Fairy Tale\" canyon: eroded red and ochre ridges a short walk from the lake shore."
  },
  "tips": [
   "Wear shoes with grip; ridges crumble."
  ],
  "order": 6.5,
  "popularity": 3,
  "zone": "north",
  "dayTitle": "Skazka canyon",
  "details": {
   "altitudeM": 1700,
   "culture": "\"Fairy Tale\" canyon of eroded red and orange rock formations.",
   "howToGetThere": "South shore of Issyk-Kul near Tosor village; signposted turn-off from the main road."
  }
 },
 {
  "id": "barskoon",
  "name": {
   "en": "Barskoon",
   "ru": "Барскоон",
   "ky": "Барскоон"
  },
  "region": "Issyk-Kul",
  "lat": 42.08,
  "lon": 77.6,
  "season": "Jun-Sep",
  "duration": "1 day",
  "difficulty": "Easy",
  "budgetPerDayUsd": 25,
  "tags": [
   "mountains",
   "photo",
   "hiking"
  ],
  "activities": [
   "Tears of the Leopard waterfall",
   "Gagarin memorial",
   "Gorge drive"
  ],
  "description": {
   "en": "Gorge south of the lake with waterfalls and alpine meadows, once a cosmonaut retreat."
  },
  "tips": [
   "Upper gorge road is for 4x4 only."
  ],
  "order": 7,
  "popularity": 2,
  "zone": "north",
  "dayTitle": "Barskoon waterfalls",
  "details": {
   "altitudeM": 1900,
   "howToGetThere": "South shore of Issyk-Kul; the gorge road climbs from Barskoon village to the waterfalls."
  }
 },
 {
  "id": "kel-suu",
  "name": {
   "en": "Kel-Suu",
   "ru": "Кёль-Суу",
   "ky": "Көл-Суу"
  },
  "region": "Naryn",
  "lat": 41.05,
  "lon": 75.8,
  "season": "Jul-Sep",
  "duration": "2 days",
  "difficulty": "Hard",
  "budgetPerDayUsd": 60,
  "tags": [
   "adventure",
   "lake",
   "photo"
  ],
  "activities": [
   "Boat through the flooded canyon",
   "Border-zone mountain drive"
  ],
  "description": {
   "en": "Remote lake filling a narrow canyon near the Chinese border. Needs a border permit and a 4x4."
  },
  "tips": [
   "Border permit required, arranged 10+ days ahead."
  ],
  "order": 5.3,
  "popularity": 1,
  "zone": "remote",
  "dayTitle": "Kel-Suu expedition",
  "details": {
   "altitudeM": 3500,
   "howToGetThere": "Remote lake in the Kok-Kiya valley near the Chinese border, usually reached from Naryn region by 4x4 and a final walk or boat.",
   "safety": "Border zone: a permit is required and must be arranged in advance."
  }
 },
 {
  "id": "chatyr-kul",
  "name": {
   "en": "Chatyr-Kul",
   "ru": "Чатыр-Куль",
   "ky": "Чатыр-Көл"
  },
  "region": "Naryn",
  "lat": 40.62,
  "lon": 75.3,
  "season": "Jul-Sep",
  "duration": "1 day",
  "difficulty": "Moderate",
  "budgetPerDayUsd": 30,
  "tags": [
   "lake",
   "photo",
   "adventure"
  ],
  "activities": [
   "Alpine lake at 3,500 m",
   "Wildlife and bird watching"
  ],
  "description": {
   "en": "High, windswept lake above Tash Rabat on the old caravan road. Border permit needed."
  },
  "tips": [
   "Permit required; go with a registered operator."
  ],
  "order": 5.4,
  "popularity": 0,
  "zone": "remote",
  "dayTitle": "Chatyr-Kul",
  "details": {
   "altitudeM": 3530,
   "howToGetThere": "Near the Torugart pass beyond Tash Rabat.",
   "safety": "Border zone: a permit is required."
  }
 },
 {
  "id": "konorchek",
  "name": {
   "en": "Konorchek Canyon",
   "ru": "Каньон Конорчек",
   "ky": "Конорчек капчыгайы"
  },
  "region": "Chuy",
  "lat": 42.55,
  "lon": 75.88,
  "season": "Apr-Oct",
  "duration": "1 day",
  "difficulty": "Moderate",
  "budgetPerDayUsd": 20,
  "tags": [
   "adventure",
   "photo",
   "hiking"
  ],
  "activities": [
   "Red canyon hike",
   "Towering clay formations"
  ],
  "description": {
   "en": "Deep red canyons near the Boom gorge, spectacular and surprisingly empty."
  },
  "tips": [
   "No water on trail; carry 2 liters."
  ],
  "order": 3,
  "popularity": 2,
  "zone": "north",
  "dayTitle": "Konorchek red canyons",
  "details": {
   "altitudeM": 1500,
   "culture": "Red clay canyons that are popular for day hikes from Bishkek.",
   "howToGetThere": "In the Chuy region near the Boom gorge, about 2 hours east of Bishkek."
  }
 },
 {
  "id": "burana",
  "name": {
   "en": "Burana Tower",
   "ru": "Башня Бурана",
   "ky": "Бурана мунарасы"
  },
  "region": "Chuy",
  "lat": 42.746,
  "lon": 75.25,
  "season": "Year-round",
  "duration": "Half day",
  "difficulty": "Easy",
  "budgetPerDayUsd": 10,
  "tags": [
   "culture",
   "history",
   "photo"
  ],
  "activities": [
   "11th-century minaret",
   "Balbal stone figures",
   "Site museum"
  ],
  "description": {
   "en": "Remains of the Karakhanid city of Balasagun: a minaret, balbal stones and a small museum."
  },
  "tips": [
   "On the way from Bishkek to Issyk-Kul."
  ],
  "order": 2,
  "popularity": 2,
  "zone": "north",
  "dayTitle": "Burana Tower",
  "details": {
   "altitudeM": 750,
   "history": "An 11th-century minaret, the remains of the Karakhanid city of Balasagun, with balbal stone figures.",
   "howToGetThere": "About 80 km east of Bishkek near Tokmok; often visited on the way to Issyk-Kul."
  }
 }
];

export const DESTINATIONS: Destination[] = BASE_DESTINATIONS.map((d) => {
  const tr = DESTINATION_TRANSLATIONS[d.id];
  return tr ? { ...d, description: { ...d.description, ...tr.description }, i18n: tr.i18n } : d;
});
