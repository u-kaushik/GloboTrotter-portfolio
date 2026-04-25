import { Itinerary, TravelLog, HistoricalContext } from '../types';

export const DEMO_ONBOARDING_DONE_KEY = 'gt_demo_onboarding_done';
export const DEMO_ONBOARDING_ACTIVE_KEY = 'gt_demo_onboarding_active';

const KYOTO_HERO_PHOTO = 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&h=900&fit=crop&auto=format&q=85';
const KYOTO_TEMPLE_MOMENT_PHOTO = 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=900&h=1200&fit=crop&auto=format&q=85';
const KYOTO_STREET_MOMENT_PHOTO = 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=900&h=1200&fit=crop&auto=format&q=85';

const KYOTO_CONTEXT: HistoricalContext = {
  openingLine: 'Kyoto in autumn 2022 had that calm, golden hush — lantern-lit alleys, temple bells, and maple leaves starting to turn.',
  cityPulse: 'The city moved with a quiet rhythm — trains gliding in, bicycle bells outside side streets, and neighborhoods shifting from temple mornings to ramen nights.',
  foodMoment: 'Matcha soft serve, a slow noodle lunch, and a tiny dessert stop that turns into an unexpected favorite.',
  designNote: 'The mix of wooden facades, noren curtains, and immaculate gardens makes even an ordinary walk feel intentional.',
  artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/21/9a/b2/219ab295-469c-f0f9-1369-60c9af11c6f2/21008.jpg/3000x3000bb.jpg',
  topSong: 'Stay',
  topArtist: 'The Kid LAROI & Justin Bieber',
  topSongs: [
    { title: 'Stay', artist: 'The Kid LAROI & Justin Bieber' },
    { title: 'Bad Habits', artist: 'Ed Sheeran' },
    { title: 'Industry Baby', artist: 'Lil Nas X & Jack Harlow' },
  ],
  topTeam: 'Baseball season talk and late-night game recaps were a background soundtrack — the kind of chatter that fills snack bars and stations.',
  majorEvent: 'By late 2022, Japan was fully back on the travel map again, and Kyoto had that fresh, grateful buzz of visitors rediscovering it.',
  funFact: 'Kyoto still has more than 1,600 temples and shrines, so “just one more stop” can turn into a very full day very fast.',
  movieOrShow: 'The world was talking about prestige TV and big streaming drops, but Kyoto’s mood was all about quiet streets and soft light.',
  techMilestone: 'Mobile tickets, translation apps, and digital maps made the trip smoother — even while the city itself stayed beautifully old-school.',
  personalizedNugget: 'October in Kyoto is perfect for wandering: cool mornings, crisp evenings, and just enough color in the trees to make every photo feel edited.',
};

export const DEMO_ONBOARDING_TRIP: TravelLog = {
  uid: 'demo-user-001',
  countryCode: '392',
  countryName: 'Japan',
  cityName: 'Kyoto',
  continent: 'Asia',
  year: 2022,
  month: 10,
  day: 14,
  duration: 4,
  notes: 'Kyoto felt like a slow exhale — temples at sunrise, quiet lanes, and one perfect matcha stop after another.',
  photoUrl: KYOTO_HERO_PHOTO,
  stories: [
    { type: 'text', mediaUrl: KYOTO_TEMPLE_MOMENT_PHOTO, caption: 'Temples first, coffee second. Kyoto makes an early morning feel like a proper ritual.', backgroundColor: 'sunset', createdAt: '2022-10-14T06:40:00Z' },
    { type: 'photo', mediaUrl: KYOTO_STREET_MOMENT_PHOTO, caption: 'Golden leaves, wooden facades, and a lane that makes you slow down on purpose.', createdAt: '2022-10-15T16:10:00Z' },
  ],
  historicalContext: KYOTO_CONTEXT,
  createdAt: new Date().toISOString(),
};

export const DEMO_ONBOARDING_ITINERARY: Partial<Itinerary> = {
  title: 'A Colourful Escape in Marrakech',
  summary: 'A vibrant Marrakech trip built around medina wandering, rooftop sunsets, spice markets, garden pauses, and hammam slow-down moments.',
  intent: 'weekend',
  totalDays: 3,
  countries: ['Morocco'],
  destinations: ['Marrakech, Morocco'],
  days: [
    {
      dayNumber: 1,
      city: 'Marrakech',
      country: 'Morocco',
      activities: [
        'Begin in the medina with a guide or a map-and-go wander — letting the lanes, stalls, and sounds set the pace.',
        'Break for mint tea on a shaded terrace and watch the city pulse from above.',
        'Close the day with a rooftop dinner as the call to prayer rolls over the rooftops at sunset.',
      ],
      localTip: 'The medina feels less overwhelming once you pick one landmark at a time — and the first rooftop stop makes the whole place click.',
    },
    {
      dayNumber: 2,
      city: 'Marrakech',
      country: 'Morocco',
      activities: [
        'Bahia Palace or another architectural stop for color, tilework, and a slower cultural morning.',
        'Lunch in a courtyard restaurant with tagine, couscous, and a little breathing room between courses.',
        'Jardin Majorelle and the neighboring museum for a bright, design-forward afternoon.',
      ],
      interestHighlight: 'Food + architecture, with enough texture to feel immersive without turning into a museum sprint.',
    },
    {
      dayNumber: 3,
      city: 'Marrakech',
      country: 'Morocco',
      activities: [
        'Morning hammam or spa session to slow everything down before travel home.',
        'Last market sweep for ceramics, textiles, or spices — one focused loop, not endless browsing.',
        'A final coffee and rooftop pause to write down the two things you’d want to do differently next time.',
      ],
      personalConnection: 'Feels like a lively reset weekend — vivid, layered, and easy to imagine pairing with a calmer second trip later on.',
    },
  ],
};
