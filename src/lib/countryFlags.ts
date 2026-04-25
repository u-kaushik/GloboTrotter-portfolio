/** Maps common country names to ISO alpha-2 codes for flag images via flagcdn.com */
export const countryAlpha2 = (country: string): string => {
  const map: Record<string, string> = {
    Hungary: 'hu', Germany: 'de', France: 'fr', Spain: 'es', Italy: 'it',
    Japan: 'jp', 'United States': 'us', 'United Kingdom': 'gb', China: 'cn',
    Australia: 'au', Canada: 'ca', India: 'in', Brazil: 'br', Mexico: 'mx',
    Argentina: 'ar', Chile: 'cl', Norway: 'no', Sweden: 'se', Finland: 'fi',
    Netherlands: 'nl', Belgium: 'be', Switzerland: 'ch', Austria: 'at',
    Poland: 'pl', 'New Zealand': 'nz', 'South Africa': 'za', 'South Korea': 'kr',
    Singapore: 'sg', Thailand: 'th', Malaysia: 'my', Indonesia: 'id',
    Philippines: 'ph', Vietnam: 'vn', Egypt: 'eg', 'United Arab Emirates': 'ae',
    'Saudi Arabia': 'sa', Israel: 'il', Turkey: 'tr', Türkiye: 'tr',
    Russia: 'ru', Ukraine: 'ua', Greece: 'gr', Portugal: 'pt',
    'Czech Republic': 'cz', Czechia: 'cz', Slovakia: 'sk', Romania: 'ro',
    Bulgaria: 'bg', Croatia: 'hr', Slovenia: 'si', Estonia: 'ee',
    Latvia: 'lv', Lithuania: 'lt', Ireland: 'ie', Malta: 'mt',
    Cyprus: 'cy', Luxembourg: 'lu', Iceland: 'is', Denmark: 'dk',
    Colombia: 'co', Peru: 'pe', Morocco: 'ma', Kenya: 'ke', Tanzania: 'tz',
    Nigeria: 'ng', Ghana: 'gh', Ethiopia: 'et', Cuba: 'cu', Jamaica: 'jm',
    'Costa Rica': 'cr', Panama: 'pa', Ecuador: 'ec', Bolivia: 'bo',
    Uruguay: 'uy', Paraguay: 'py', Venezuela: 've',
  };
  return map[country] || '';
};
