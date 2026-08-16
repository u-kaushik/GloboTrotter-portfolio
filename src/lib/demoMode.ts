import { TravelLog, UserProfile, Itinerary } from '../types';
import { KYOTO_HERO_PHOTO, KYOTO_STREET_MOMENT_PHOTO, KYOTO_TEMPLE_MOMENT_PHOTO } from './demoOnboarding';

const DEMO_MODE_KEY = 'gt_demo_mode';
const DEMO_LOGS_KEY = 'gt_demo_logs';
const DEMO_ITINERARIES_KEY = 'gt_demo_itineraries';
const LEGACY_KYOTO_IMAGE = '/kyoto-demo.svg';

const isLegacyKyotoImage = (url?: string) => !url || url.includes(LEGACY_KYOTO_IMAGE);

const hydrateKyotoDemoMedia = (log: TravelLog): TravelLog => {
  if (log.countryName !== 'Japan' || log.cityName !== 'Kyoto') return log;

  return {
    ...log,
    photoUrl: isLegacyKyotoImage(log.photoUrl) ? KYOTO_HERO_PHOTO : log.photoUrl,
    stories: log.stories?.map((story) => {
      if (story.type === 'text') {
        return {
          ...story,
          mediaUrl: isLegacyKyotoImage(story.mediaUrl) ? KYOTO_TEMPLE_MOMENT_PHOTO : story.mediaUrl,
        };
      }

      if (story.type === 'photo') {
        return {
          ...story,
          mediaUrl: isLegacyKyotoImage(story.mediaUrl) ? KYOTO_STREET_MOMENT_PHOTO : story.mediaUrl,
        };
      }

      return story;
    }),
  };
};

const tripKey = (log: Partial<TravelLog>) =>
  [log.countryCode, log.countryName, log.cityName, log.year, log.month, log.day, log.duration].join('|');

const dedupeDemoLogs = (logs: TravelLog[]): TravelLog[] => {
  const seen = new Set<string>();
  return logs.filter((log) => {
    const key = tripKey(log);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const isDemoMode = (): boolean => {
  return localStorage.getItem(DEMO_MODE_KEY) === 'true';
};

export const setDemoMode = (enabled: boolean): void => {
  if (enabled) {
    localStorage.setItem(DEMO_MODE_KEY, 'true');
  } else {
    localStorage.removeItem(DEMO_MODE_KEY);
  }
};

export const getDemoProfile = (): UserProfile => ({
  uid: 'demo-user-001',
  displayName: 'Alex Rivera',
  email: 'alex.rivera@email.com',
  photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
  level: 7,
  xp: 2790,
  badges: ['Globe Trotter', 'Photo Snapper', 'Continent Hopper', 'Weekend Warrior', 'World Traveler', 'Loyal Traveler'],
  totalCountries: 12,
  totalCities: 12,
  credits: 100,
  referralCode: 'alex',
  referralCount: 4,
  onboarded: true,
  historyOnboarded: true,
  lastLogin: new Date().toISOString(),
  loginCount: 22,
  isPro: true,
  homeCountry: 'United States',
  interests: ['Adventure', 'Food', 'History', 'Photography'],
  travelGoals: ['Visit all continents', 'See the Northern Lights', '100 countries'],
});

export const getDemoLogs = (): TravelLog[] => [
  {
    id: 'demo-log-1',
    uid: 'demo-user-001',
    countryCode: '840',
    countryName: 'United States',
    cityName: 'New York City',
    continent: 'North America',
    year: 2024,
    month: 6,
    day: 15,
    duration: 5,
    notes: 'Finally made it to NYC! The energy here is unreal. Got lost in Chinatown trying to find the best dumpling spot - worth every minute. Saw a Broadway show that blew my mind.',
    photoUrl: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop',
    stories: [
      { type: 'text', caption: 'First time seeing the skyline from Brooklyn Bridge at sunset. Absolutely speechless. The way the sun painted the buildings gold... I\'ll never forget this moment.', backgroundColor: 'sunset', createdAt: '2024-06-15T20:30:00Z' },
      { type: 'photo', mediaUrl: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=600&h=400&fit=crop', caption: 'Found this hidden rooftop bar in the West Village. The perfect spot for sunset.', createdAt: '2024-06-16T19:00:00Z' },
    ],
    createdAt: '2024-06-15T10:30:00Z',
    historicalContext: {
      topSong: 'Fast Car',
      topArtist: 'Luke Combs',
      funFact: 'NYC has over 800 languages spoken — the most diverse city on Earth.',
      personalizedNugget: 'In June 2024, Broadway was buzzing with hits like "Stereophonic" and "Hell\'s Kitchen". The city was transitioning into summer mode with rooftop season in full swing.',
    },
  },
  {
    id: 'demo-log-2',
    uid: 'demo-user-001',
    countryCode: '276',
    countryName: 'Germany',
    cityName: 'Berlin',
    continent: 'Europe',
    year: 2023,
    month: 10,
    day: 5,
    duration: 8,
    notes: 'Berlin in autumn felt sharp, creative, and full of history layered over modern life. Could have spent weeks moving between cafes, museums, and late-night food spots.',
    photoUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop',
    stories: [
      { type: 'text', caption: 'Started the trip with a long museum morning and a perfect pretzel break. Berlin has a way of making history feel alive without being heavy.', backgroundColor: 'ocean', createdAt: '2023-10-05T06:30:00Z' },
      { type: 'photo', mediaUrl: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&h=400&fit=crop', caption: 'A moody evening skyline and a city that feels both grounded and creative.', createdAt: '2023-10-07T20:00:00Z' },
      { type: 'text', caption: 'Found a tiny late-night kebab spot in Kreuzberg and followed it with a long walk through the side streets. Perfect ending to the day.', backgroundColor: 'charcoal', createdAt: '2023-10-08T22:00:00Z' },
    ],
    createdAt: '2023-10-05T14:20:00Z',
    historicalContext: {
      topSong: 'Idol',
      topArtist: 'YOASOBI',
      funFact: 'Berlin’s museum island is a UNESCO World Heritage Site packed into the middle of the city.',
      personalizedNugget: 'October 2023 had Berlin in a crisp autumn mood — ideal for museum-hopping, late coffees, and wandering through neighborhoods that feel distinct block by block.',
    },
  },
  {
    id: 'demo-log-3',
    uid: 'demo-user-001',
    countryCode: '250',
    countryName: 'France',
    cityName: 'Paris',
    continent: 'Europe',
    year: 2023,
    month: 4,
    day: 20,
    duration: 6,
    notes: 'Paris in spring is everything they say it is and more. The city just has a certain je ne sais quoi. Spent hours just sitting at cafes watching the world go by.',
    photoUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=600&fit=crop',
    stories: [
      { type: 'text', caption: 'Had the most magical evening at a tiny bistro in Le Marais. The waiter recommended the coq au vin and it was perfection. Ended up chatting with the owner for an hour about his family recipes.', backgroundColor: 'amber', createdAt: '2023-04-20T21:00:00Z' },
      { type: 'photo', mediaUrl: 'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=600&h=400&fit=crop', caption: 'Sunset from Montmartre. Sacré-Cœur glowing white against the pink sky.', createdAt: '2023-04-22T19:30:00Z' },
    ],
    createdAt: '2023-04-20T09:15:00Z',
    historicalContext: {
      topSong: 'Flowers',
      topArtist: 'Miley Cyrus',
      funFact: 'The Eiffel Tower was originally supposed to be temporary!',
      personalizedNugget: 'April 2023 had Paris in full spring bloom. The city was abuzz with anticipation for the upcoming 2024 Olympics, with construction and renovations happening across the city. Spring fashion week had just wrapped.',
    },
  },
  {
    id: 'demo-log-4',
    uid: 'demo-user-001',
    countryCode: '724',
    countryName: 'Spain',
    cityName: 'Barcelona',
    continent: 'Europe',
    year: 2022,
    month: 7,
    day: 10,
    duration: 7,
    notes: 'Barcelona in July is HOT but so worth it. The beach days, the sangria, the architecture - Gaudi really was a genius. Stayed in Gothic Quarter and loved getting lost in those narrow streets.',
    photoUrl: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&h=600&fit=crop',
    stories: [
      { type: 'text', caption: 'Spent 3 hours inside La Sagrada Familia. The way light streams through those stained glass windows is pure magic. Photos don\'t do it justice - you just have to experience it.', backgroundColor: 'coral', createdAt: '2022-07-10T14:00:00Z' },
      { type: 'photo', mediaUrl: 'https://images.unsplash.com/photo-1562883676-8c7feb83f09b?w=600&h=400&fit=crop', caption: 'Beach day at Barceloneta. Nothing beats Spanish beach life.', createdAt: '2022-07-12T16:00:00Z' },
      { type: 'text', caption: 'Found an incredible tapas place near La Boqueria. The padrón peppers and tortilla española were incredible. Paired with a nice Rioja of course.', backgroundColor: 'sage', createdAt: '2022-07-14T20:00:00Z' },
    ],
    createdAt: '2022-07-10T16:45:00Z',
    historicalContext: {
      topSong: 'As It Was',
      topArtist: 'Harry Styles',
      funFact: 'La Sagrada Familia has been under construction for over 140 years!',
      personalizedNugget: 'July 2022 was peak summer in Barcelona. The city was recovering post-pandemic with tourism back in full swing. Spain had just won the UEFA Euro 2022 championship, and the streets were still buzzing with celebration.',
    },
  },
  {
    id: 'demo-log-5',
    uid: 'demo-user-001',
    countryCode: '076',
    countryName: 'Brazil',
    cityName: 'Rio de Janeiro',
    continent: 'South America',
    year: 2022,
    month: 2,
    day: 25,
    duration: 6,
    notes: 'Rio during Carnival is an experience everyone should have at least once. The energy, the music, the costumes - absolutely insane. Though the crowds were next level!',
    photoUrl: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&h=600&fit=crop',
    stories: [
      { type: 'text', caption: 'Got tickets to the Sambadrome parade. Words cannot describe the spectacle - the floats, the dancers, the drummers. I was screaming and dancing along with thousands of strangers.', backgroundColor: 'sunset', createdAt: '2022-02-25T23:00:00Z' },
      { type: 'photo', mediaUrl: 'https://images.unsplash.com/photo-1518639192441-8fce0a366e2e?w=600&h=400&fit=crop', caption: 'Early morning run up Pedra Bonita. The view of the city from up here is insane.', createdAt: '2022-02-27T07:00:00Z' },
    ],
    createdAt: '2022-02-25T11:00:00Z',
    historicalContext: {
      topSong: 'Bam Bam',
      topArtist: 'Camila Cabello',
      funFact: 'Christ the Redeemer was named one of the New 7 Wonders of the World.',
      personalizedNugget: 'February 2022 was Carnival season in Rio, the biggest party on Earth. After pandemic restrictions, the 2022 edition was especially emotional as Brazil was reopening. The city was a explosion of color, music, and joy.',
    },
  },
  {
    id: 'demo-log-6',
    uid: 'demo-user-001',
    countryCode: '124',
    countryName: 'Canada',
    cityName: 'Vancouver',
    continent: 'North America',
    year: 2021,
    month: 12,
    day: 28,
    duration: 10,
    notes: 'Spent Christmas and New Year in Vancouver — rainy, cozy, and exactly the kind of city that makes winter feel cinematic.',
    photoUrl: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&h=600&fit=crop',
    stories: [
      { type: 'text', caption: 'Christmas morning coffee with mountain air in the background felt surprisingly perfect. Vancouver has that calm, outdoorsy rhythm I always forget I need.', backgroundColor: 'ocean', createdAt: '2021-12-25T14:00:00Z' },
      { type: 'photo', mediaUrl: 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=600&h=400&fit=crop', caption: 'Harbor lights at night make the whole city feel like it’s glowing from the inside.', createdAt: '2021-12-31T22:00:00Z' },
      { type: 'text', caption: 'Did a long waterfront walk and stopped whenever the rain let up. The city somehow gets better in the drizzle.', backgroundColor: 'sage', createdAt: '2022-01-02T10:00:00Z' },
    ],
    createdAt: '2021-12-28T08:30:00Z',
    historicalContext: {
      topSong: 'Easy On Me',
      topArtist: 'Adele',
      funFact: 'Vancouver regularly ranks among the world’s most livable cities.',
      personalizedNugget: 'December 2021 was wet, cozy, and perfect for winter cafés, harbor walks, and a slower holiday pace than the usual big-city rush.',
    },
  },
  {
    id: 'demo-log-7',
    uid: 'demo-user-001',
    countryCode: '826',
    countryName: 'United Kingdom',
    cityName: 'London',
    continent: 'Europe',
    year: 2021,
    month: 8,
    day: 12,
    duration: 5,
    notes: 'First trip to London and I completely understand the obsession. Pub culture, history everywhere, the parks - Hyde Park especially became my morning sanctuary.',
    photoUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop',
    stories: [
      { type: 'text', caption: 'Went to a Tottenham pub to watch a football match. The energy in there was unreal. Even though I didn\'t fully understand what was happening, I was screaming along with everyone.', backgroundColor: 'forest', createdAt: '2021-08-12T17:00:00Z' },
      { type: 'photo', mediaUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&h=400&fit=crop', caption: 'Westminster at golden hour. Parliament, Big Ben, London Eye - all in one shot.', createdAt: '2021-08-14T19:00:00Z' },
      { type: 'text', caption: 'Found the best Sunday roast at a tiny pub in Notting Hill. The Yorkshire pudding was HUGE and perfectly crispy. Paired with a proper British ale.', backgroundColor: 'amber', createdAt: '2021-08-15T13:00:00Z' },
    ],
    createdAt: '2021-08-12T13:20:00Z',
    historicalContext: {
      topSong: 'Bad Habits',
      topArtist: 'Ed Sheeran',
      funFact: 'London has over 170 museums — more than any other city!',
      personalizedNugget: 'August 2021 was post-lockdown London coming back to life. Restrictions had just lifted and the city was buzzing. Ed Sheeran\'s "Bad Habits" was the summer anthem, and the UK was celebrating being able to finally gather again.',
    },
  },
  {
    id: 'demo-log-8',
    uid: 'demo-user-001',
    countryCode: '404',
    countryName: 'Kenya',
    cityName: 'Nairobi',
    continent: 'Africa',
    year: 2020,
    month: 2,
    day: 14,
    duration: 7,
    notes: 'Valentine\'s Day in Nairobi felt energetic and full of color. The city has this amazing mix of urban rhythm and natural escapes just outside it.',
    photoUrl: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800&h=600&fit=crop',
    stories: [
      { type: 'text', caption: 'Dinner under city lights, followed by a late drive with windows down and music up. Nairobi has a way of balancing energy with ease.', backgroundColor: 'charcoal', createdAt: '2020-02-14T20:00:00Z' },
      { type: 'photo', mediaUrl: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&h=400&fit=crop', caption: 'A sunrise moment that made the whole trip feel fresh and wide open.', createdAt: '2020-02-15T07:00:00Z' },
      { type: 'text', caption: 'Found a local market stall doing the best grilled corn and tea. Simple, memorable, and exactly the right kind of stop.', backgroundColor: 'coral', createdAt: '2020-02-17T16:00:00Z' },
    ],
    createdAt: '2020-02-14T10:00:00Z',
    historicalContext: {
      topSong: 'Ghungroo',
      topArtist: 'A.R. Rahman',
      funFact: 'Nairobi is one of the few capital cities in the world with a national park right on its edge.',
      personalizedNugget: 'February 2020 was just before travel changed everywhere, so this trip has that especially vivid “last big getaway” feeling to it.',
    },
  },
  {
    id: 'demo-log-9',
    uid: 'demo-user-001',
    countryCode: '504',
    countryName: 'Morocco',
    cityName: 'Marrakech',
    continent: 'Africa',
    year: 2024,
    month: 3,
    day: 8,
    duration: 4,
    notes: 'Marrakech was all color, contrast, and rhythm — spice stalls, rooftop tea, and the kind of light that makes every lane look cinematic.',
    photoUrl: 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=800&h=600&fit=crop',
    stories: [
      { type: 'text', caption: 'Lost myself in the souks and somehow found the best saffron tea of the entire trip. The medina is a beautiful sensory overload.', backgroundColor: 'sunset', createdAt: '2024-03-08T11:00:00Z' },
      { type: 'photo', mediaUrl: 'https://images.unsplash.com/photo-1451186859696-371d9477be93?w=600&h=400&fit=crop', caption: 'Rooftop sunset over Marrakech — the city glows pink right before dusk.', createdAt: '2024-03-09T18:15:00Z' },
    ],
    createdAt: '2024-03-08T09:10:00Z',
    historicalContext: {
      topSong: 'Espresso',
      topArtist: 'Sabrina Carpenter',
      funFact: 'Marrakech’s medina is one of the largest car-free urban spaces in the world.',
      personalizedNugget: 'Spring 2024 brought warm days, packed souks, and rooftop season in full swing. The city had that electric “go explore” energy from first light to late evening.',
    },
  },
  {
    id: 'demo-log-10',
    uid: 'demo-user-001',
    countryCode: '484',
    countryName: 'Mexico',
    cityName: 'Mexico City',
    continent: 'North America',
    year: 2024,
    month: 11,
    day: 2,
    duration: 5,
    notes: 'Mexico City was a perfect blend of art, food, and big-city energy. I could happily live on tacos al pastor and museum hopping forever.',
    photoUrl: 'https://images.unsplash.com/photo-1512813195386-6cf811ad3542?w=800&h=600&fit=crop',
    stories: [
      { type: 'text', caption: 'Spent half a day in Roma and Condesa just wandering between cafes, bookstores, and leafy streets. The neighborhood vibe here is addictive.', backgroundColor: 'sage', createdAt: '2024-11-02T10:30:00Z' },
      { type: 'photo', mediaUrl: 'https://images.unsplash.com/photo-1518659526054-190340b327de?w=600&h=400&fit=crop', caption: 'Templo Mayor at dusk — history sitting right in the middle of the city.', createdAt: '2024-11-03T18:45:00Z' },
    ],
    createdAt: '2024-11-02T08:45:00Z',
    historicalContext: {
      topSong: 'Birds of a Feather',
      topArtist: 'Billie Eilish',
      funFact: 'Mexico City is built on top of the ancient Aztec capital Tenochtitlan.',
      personalizedNugget: 'Late 2024 had the city buzzing with gallery openings, new restaurant chatter, and a constant hum of traffic, music, and neighborhood life.',
    },
  },
  {
    id: 'demo-log-11',
    uid: 'demo-user-001',
    countryCode: '604',
    countryName: 'Peru',
    cityName: 'Lima',
    continent: 'South America',
    year: 2023,
    month: 12,
    day: 11,
    duration: 6,
    notes: 'Lima came in bright, coastal, and unbelievably delicious. Night markets, ocean air, and late dinners made the whole trip feel nonstop in the best way.',
    photoUrl: 'https://images.unsplash.com/photo-1508004680771-708b02aabdc8?w=800&h=600&fit=crop',
    stories: [
      { type: 'text', caption: 'Street food after dark was the highlight — ceviche, anticuchos, and a million tiny decisions I was happy to make.', backgroundColor: 'amber', createdAt: '2023-12-11T19:30:00Z' },
      { type: 'photo', mediaUrl: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=600&h=400&fit=crop', caption: 'Ocean light over Lima in the early morning — worth the alarm.', createdAt: '2023-12-12T06:50:00Z' },
    ],
    createdAt: '2023-12-11T09:05:00Z',
    historicalContext: {
      topSong: 'Cruel Summer',
      topArtist: 'Taylor Swift',
      funFact: 'Lima is one of the world’s top culinary capitals, especially famous for its seafood.',
      personalizedNugget: 'December 2023 was a great month for coastal walks and long dinners — the kind of weather where evenings feel designed for wandering.',
    },
  },
  {
    id: 'demo-log-12',
    uid: 'demo-user-001',
    countryCode: '710',
    countryName: 'South Africa',
    cityName: 'Cape Town',
    continent: 'Africa',
    year: 2022,
    month: 9,
    day: 21,
    duration: 7,
    notes: 'Cape Town felt like the ultimate mix of city, coast, and mountain. One day it was wine country, the next it was ocean cliffs — impossible not to love.',
    photoUrl: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&h=600&fit=crop',
    stories: [
      { type: 'text', caption: 'Table Mountain made every coffee stop feel earned. The views from the top are ridiculous in the best way.', backgroundColor: 'ocean', createdAt: '2022-09-21T08:30:00Z' },
      { type: 'photo', mediaUrl: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=600&h=400&fit=crop', caption: 'V&A Waterfront at golden hour — between the sea breeze and the sunset, I didn’t want to leave.', createdAt: '2022-09-23T18:10:00Z' },
    ],
    createdAt: '2022-09-21T07:40:00Z',
    historicalContext: {
      topSong: 'Break My Soul',
      topArtist: 'Beyoncé',
      funFact: 'Cape Town sits at the foot of Table Mountain, one of the New 7 Wonders of Nature.',
      personalizedNugget: 'September 2022 was springtime in the Southern Hemisphere — perfect for coastal drives, outdoor lunches, and long sunset walks.',
    },
  },
];

export const getDemoItineraries = (): Itinerary[] => {
  const stored = localStorage.getItem(DEMO_ITINERARIES_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
};

export const saveDemoLog = (log: TravelLog): void => {
  const logs = getStoredDemoLogs().filter((existing) => tripKey(existing) !== tripKey(log));
  const newLog = { ...log, id: `demo-log-${Date.now()}`, uid: 'demo-user-001', createdAt: new Date().toISOString() };
  logs.push(newLog);
  localStorage.setItem(DEMO_LOGS_KEY, JSON.stringify(logs));
};

export const saveDemoItinerary = (itinerary: Partial<Itinerary>): void => {
  const itineraries = getDemoItineraries();
  const newItinerary: Itinerary = {
    ...itinerary,
    id: `demo-itinerary-${Date.now()}`,
    uid: 'demo-user-001',
    status: 'dreamed',
    createdAt: new Date().toISOString(),
  } as Itinerary;
  itineraries.push(newItinerary);
  localStorage.setItem(DEMO_ITINERARIES_KEY, JSON.stringify(itineraries));
};

export const clearDemoData = (): void => {
  localStorage.removeItem(DEMO_LOGS_KEY);
  localStorage.removeItem(DEMO_ITINERARIES_KEY);
};

export const getStoredDemoLogs = (): TravelLog[] => {
  const stored = localStorage.getItem(DEMO_LOGS_KEY);
  if (stored) {
    try {
      return dedupeDemoLogs((JSON.parse(stored) as TravelLog[]).map(hydrateKyotoDemoMedia));
    } catch {
      return [];
    }
  }
  return [];
};
