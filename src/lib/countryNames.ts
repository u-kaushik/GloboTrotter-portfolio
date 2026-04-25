/**
 * Maps official/verbose country names to natural conversational versions.
 * Used wherever a country name appears in a sentence (e.g. "Quick escape from the UK").
 */
const FRIENDLY: Record<string, string> = {
  // The big ones that sound awkward in sentences
  'United Kingdom':                          'the UK',
  'United States':                           'the US',
  'United Arab Emirates':                    'the UAE',

  // Official names that nobody uses conversationally
  'Russian Federation':                      'Russia',
  'Czech Republic':                          'Czechia',
  'Slovak Republic':                         'Slovakia',
  'Republic of Ireland':                     'Ireland',
  'Viet Nam':                                'Vietnam',
  'Lao People\'s Democratic Republic':       'Laos',
  'Lao PDR':                                 'Laos',
  'Myanmar':                                 'Myanmar',
  'Republic of Korea':                       'South Korea',
  'Democratic People\'s Republic of Korea':  'North Korea',
  'Syrian Arab Republic':                    'Syria',
  'Islamic Republic of Iran':                'Iran',
  'Islamic Republic of Pakistan':            'Pakistan',
  'Bolivarian Republic of Venezuela':        'Venezuela',
  'Plurinational State of Bolivia':          'Bolivia',
  'Democratic Republic of the Congo':        'DR Congo',
  'Republic of the Congo':                   'Congo',
  'Tanzania, United Republic of':            'Tanzania',
  'Taiwan, Province of China':               'Taiwan',
  'China, People\'s Republic of':            'China',
  'Korea, Republic of':                      'South Korea',

  // Countries that need "the" article for natural reading
  'Netherlands':                             'the Netherlands',
  'Philippines':                             'the Philippines',
  'Maldives':                                'the Maldives',
  'Bahamas':                                 'the Bahamas',
  'Gambia':                                  'the Gambia',
  'Ivory Coast':                             'Côte d\'Ivoire',
  'Cote d\'Ivoire':                          'Côte d\'Ivoire',
};

export function friendlyCountryName(name: string): string {
  return FRIENDLY[name] ?? name;
}
