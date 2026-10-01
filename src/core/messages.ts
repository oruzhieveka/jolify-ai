import type { Lang } from './types.ts';

type Msg = (d: Record<string, string | number | null | undefined>) => string;
const M: Record<string, Record<Lang, Msg>> = {
  planFailed: {
    en: () => 'We could not build a valid plan from the current catalogue. Try fewer constraints.',
    ru: () => 'Не удалось составить корректный план по текущему каталогу. Попробуйте ослабить условия.',
    ky: () => 'Учурдагы каталог боюнча туура план түзүлгөн жок. Шарттарды азайтып көрүңүз.',
  },
  staleItinerary: {
    en: () => 'This plan no longer matches the catalogue (a listing changed). Please regenerate it.',
    ru: () => 'План больше не соответствует каталогу (объявление изменилось). Составьте его заново.',
    ky: () => 'План каталогго дал келбей калды (жарнама өзгөрдү). Кайра түзүңүз.',
  },
  changeInvalid: {
    en: () => 'That change would produce an invalid plan, so it was not applied.',
    ru: () => 'Это изменение сделало бы план некорректным, поэтому оно не применено.',
    ky: () => 'Бул өзгөртүү планды бузмак, ошондуктан колдонулган жок.',
  },
  changeNotPossible: {
    en: () => 'I could not make that change using listings in the catalogue, so your plan is unchanged.',
    ru: () => 'Не получилось внести это изменение с объявлениями из каталога, план не изменён.',
    ky: () => 'Каталогдогу жарнамалар менен бул өзгөртүүнү жасай алган жокмун, план өзгөргөн жок.',
  },
  updated: {
    en: (d) => `Updated your plan. New total ${'$'}${d.total}.`,
    ru: (d) => `План обновлён. Новый итог ${'$'}${d.total}.`,
    ky: (d) => `План жаңыртылды. Жаңы жалпы сумма ${'$'}${d.total}.`,
  },
  created: {
    en: (d) => `Built a ${d.days}-day plan for ${d.trav} traveller(s): ${d.title}. Estimated total ${'$'}${d.total}${d.budget ? ` (your budget ${'$'}${d.budget})` : ''}. Every paid item comes from a listing in our catalogue.`,
    ru: (d) => `Готов план на ${d.days} дн. для ${d.trav} чел.: ${d.title}. Оценка: ${'$'}${d.total}${d.budget ? ` (бюджет ${'$'}${d.budget})` : ''}. Все платные пункты взяты из каталога.`,
    ky: (d) => `${d.trav} киши үчүн ${d.days} күндүк план даяр: ${d.title}. Болжолдуу баасы ${'$'}${d.total}${d.budget ? ` (бюджет ${'$'}${d.budget})` : ''}. Бардык акы төлөнүүчү пункттар каталогдон алынды.`,
  },
  bad_day: {
    en: (d) => `This trip has ${d.days} day(s); please pick a day between 1 and ${d.days}.`,
    ru: (d) => `В поездке ${d.days} дн.; выберите день от 1 до ${d.days}.`,
    ky: (d) => `Сапарда ${d.days} күн бар; 1ден ${d.days}ге чейинки күндү тандаңыз.`,
  },
  budget_ok: {
    en: (d) => `Done: the trip now fits ${'$'}${d.target} (new total ${'$'}${d.total}).`,
    ru: (d) => `Готово: поездка укладывается в ${'$'}${d.target} (итог ${'$'}${d.total}).`,
    ky: (d) => `Даяр: сапар ${'$'}${d.target} ичинде (жаңы жалпы ${'$'}${d.total}).`,
  },
  budget_fail: {
    en: (d) => `I cut what I could with listed options, but the cheapest version is ${'$'}${d.total}. Consider fewer days.`,
    ru: (d) => `Сократил, что мог, но минимальная версия стоит ${'$'}${d.total}. Попробуйте меньше дней.`,
    ky: (d) => `Мүмкүн болгонун кыскарттым, бирок эң арзан вариант ${'$'}${d.total}. Күндөрдү азайтып көрүңүз.`,
  },
  cheaper: {
    en: (d) => `Day ${d.day} is now ${'$'}${d.delta} cheaper. New total ${'$'}${d.total}.`,
    ru: (d) => `День ${d.day} стал дешевле на ${'$'}${d.delta}. Итог ${'$'}${d.total}.`,
    ky: (d) => `${d.day}-күн ${'$'}${d.delta} арзандады. Жалпы ${'$'}${d.total}.`,
  },
  cheaper_none: {
    en: (d) => `Day ${d.day} already uses the cheapest listed options.`,
    ru: (d) => `День ${d.day} уже использует самые дешёвые варианты из каталога.`,
    ky: (d) => `${d.day}-күн каталогдогу эң арзан варианттарды колдонот.`,
  },
  horse_have: {
    en: (d) => `Day ${d.day} already includes a horse ride.`,
    ru: (d) => `В день ${d.day} уже есть конная прогулка.`,
    ky: (d) => `${d.day}-күндө ат минүү бар.`,
  },
  horse: {
    en: (d) => `Added "${d.name}" on day ${d.day} (${'$'}${d.cost}). New total ${'$'}${d.total}.`,
    ru: (d) => `Добавил «${d.name}» в день ${d.day} (${'$'}${d.cost}). Итог ${'$'}${d.total}.`,
    ky: (d) => `${d.day}-күнгө «${d.name}» кошулду (${'$'}${d.cost}). Жалпы ${'$'}${d.total}.`,
  },
  horse_none: {
    en: () => `There is no approved horse-riding listing in the catalogue yet, so I did not add one.`,
    ru: () => `В каталоге пока нет одобренных конных туров, поэтому я ничего не добавил.`,
    ky: () => `Каталогдо азырынча ат минүү боюнча бекитилген сунуш жок.`,
  },
  hotel: {
    en: (d) => `Day ${d.day}: replaced "${d.old}" with "${d.new}". New total ${'$'}${d.total}.`,
    ru: (d) => `День ${d.day}: «${d.old}» заменён на «${d.new}». Итог ${'$'}${d.total}.`,
    ky: (d) => `${d.day}-күн: «${d.old}» «${d.new}» менен алмаштырылды. Жалпы ${'$'}${d.total}.`,
  },
  hotel_none: {
    en: (d) => `No other approved stays are listed near ${d.loc}.`,
    ru: (d) => `Рядом с ${d.loc} нет других одобренных вариантов жилья.`,
    ky: (d) => `${d.loc} жанында башка бекитилген түнөк жок.`,
  },
  rmday: {
    en: (d) => `Removed day ${d.day}. The trip is now ${d.days} days, total ${'$'}${d.total}.`,
    ru: (d) => `День ${d.day} удалён. Теперь ${d.days} дн., итог ${'$'}${d.total}.`,
    ky: (d) => `${d.day}-күн алынды. Эми ${d.days} күн, жалпы ${'$'}${d.total}.`,
  },
  addday: {
    en: (d) => `Added a day in ${d.dest} as day ${d.day}. Now ${d.days} days, total ${'$'}${d.total}.`,
    ru: (d) => `Добавлен день: ${d.dest} (день ${d.day}). Теперь ${d.days} дн., итог ${'$'}${d.total}.`,
    ky: (d) => `${d.dest} күнү кошулду (${d.day}-күн). Эми ${d.days} күн, жалпы ${'$'}${d.total}.`,
  },
  unknown: {
    en: () => `I can change the plan, e.g. "make day 3 less expensive", "add horse riding", "replace the hotel on day 2", "add a day at Issyk-Kul", "keep it under $600", "remove day 4".`,
    ru: () => `Я могу изменить план: «сделай 3-й день дешевле», «добавь конную прогулку», «замени отель во 2-й день», «добавь день на Иссык-Куле», «уложись в $600», «удали 4-й день».`,
    ky: () => `Планды өзгөртө алам: «3-күндү арзаныраак кыл», «ат минүүнү кош», «2-күндөгү мейманкананы алмаштыр», «Ысык-Көлгө бир күн кош», «$600дөн ашпасын», «4-күндү алып сал».`,
  },
};

export function msg(key: keyof typeof M | string, lang: Lang, data: Record<string, string | number | null | undefined> = {}) {
  const m = M[key] ?? M.unknown;
  return (m[lang] ?? m.en)(data);
}

export const TIPS: Record<Lang, string[]> = {
  en: ['Currency is the Kyrgyz som (KGS). Carry cash outside Bishkek and Karakol.', 'Mobile data works in towns and along Issyk-Kul; expect no signal at Song-Kul.', 'High-altitude nights (Song-Kul ~3,000 m) are cold even in July: pack a warm layer.', 'Many nationalities get 60 days visa-free. Check the rules for your passport before booking.'],
  ru: ['Валюта: кыргызский сом (KGS). Вне Бишкека и Каракола держите наличные.', 'Мобильный интернет есть в городах и у Иссык-Куля; на Сон-Куле связи нет.', 'Ночи на высоте (Сон-Куль ~3000 м) холодные даже в июле: возьмите тёплую одежду.', 'Для многих стран действует безвиз до 60 дней. Проверьте правила для вашего паспорта.'],
  ky: ['Валюта: кыргыз сому (KGS). Бишкек менен Караколдон тышкары накталай акча алып жүрүңүз.', 'Мобилдик интернет шаарларда жана Ысык-Көл жээгинде бар; Соң-Көлдө байланыш жок.', 'Бийик тоодо (Соң-Көл ~3000 м) июлда да түнү суук: жылуу кийим алыңыз.', 'Көп өлкөлөр үчүн 60 күнгө чейин визасыз. Паспортуңуздун эрежелерин текшериңиз.'],
};
