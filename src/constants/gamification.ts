import { Trophy, Globe, MapPin, Camera, Plane, Star, Zap, Shield, Heart, Award, Users, Timer, Anchor, Gift, Home, Compass, Snowflake, Compass as CompassIcon } from 'lucide-react';

export interface BadgeTier {
  target: number;
  title: string;
  description: string;
  requirement: string;
}

export interface BadgeDefinition {
  id: string;
  icon: any;
  color: string;
  tiers: BadgeTier[];
}

export const BADGES: BadgeDefinition[] = [
  {
    id: 'explorer',
    icon: Globe,
    color: 'bg-blue-500',
    tiers: [
      {
        target: 1,
        title: 'New Explorer',
        description: 'Took the first step into the unknown.',
        requirement: 'Join GloboTrotter'
      }
    ]
  },
  {
    id: 'first_trip',
    icon: Globe,
    color: 'bg-blue-500',
    tiers: [
      {
        target: 1,
        title: 'First Steps',
        description: 'Logged your very first trip. The journey begins.',
        requirement: 'Log your first trip'
      }
    ]
  },
  {
    id: 'cities',
    icon: MapPin,
    color: 'bg-orange-500',
    tiers: [
      {
        target: 5,
        title: 'City Slicker',
        description: 'You know your way around the block.',
        requirement: 'Visit 5 different cities'
      },
      {
        target: 20,
        title: 'Urban Legend',
        description: 'The city lights are your second home.',
        requirement: 'Visit 20 different cities'
      },
      {
        target: 50,
        title: 'Metropolis Master',
        description: 'You have conquered the concrete jungles.',
        requirement: 'Visit 50 different cities'
      },
      {
        target: 100,
        title: 'Centurion',
        description: 'A century of city lights.',
        requirement: 'Visit 100 different cities'
      }
    ]
  },
  {
    id: 'countries',
    icon: Plane,
    color: 'bg-green-500',
    tiers: [
      {
        target: 5,
        title: 'Globe Trotter',
        description: 'The world is starting to look small.',
        requirement: 'Visit 5 different countries'
      },
      {
        target: 10,
        title: 'World Traveler',
        description: 'Crossing borders like a pro.',
        requirement: 'Visit 10 different countries'
      },
      {
        target: 25,
        title: 'World Citizen',
        description: 'You belong everywhere.',
        requirement: 'Visit 25 different countries'
      },
      {
        target: 50,
        title: 'Global Ambassador',
        description: 'The ultimate traveler.',
        requirement: 'Visit 50 different countries'
      }
    ]
  },
  {
    id: 'photos',
    icon: Camera,
    color: 'bg-purple-500',
    tiers: [
      {
        target: 10,
        title: 'Paparazzi',
        description: 'Every memory captured in high definition.',
        requirement: 'Upload 10 travel photos'
      },
      {
        target: 50,
        title: 'Photo Journalist',
        description: 'Your life is a gallery.',
        requirement: 'Upload 50 travel photos'
      },
      {
        target: 100,
        title: 'Visual Historian',
        description: 'Preserving the world one shot at a time.',
        requirement: 'Upload 100 travel photos'
      }
    ]
  },
  {
    id: 'early_bird',
    icon: Zap,
    color: 'bg-yellow-400',
    tiers: [
      {
        target: 1,
        title: 'Early Bird',
        description: 'Started your journey young.',
        requirement: 'Log a trip taken before age 10'
      }
    ]
  },
  {
    id: 'loyalty',
    icon: Heart,
    color: 'bg-red-500',
    tiers: [
      {
        target: 5,
        title: 'Loyal Traveler',
        description: 'Consistency is key to discovery.',
        requirement: 'Log trips in 5 different years'
      },
      {
        target: 10,
        title: 'Veteran Voyager',
        description: 'A decade of dedication.',
        requirement: 'Log trips in 10 different years'
      }
    ]
  },
  {
    id: 'decades',
    icon: Star,
    color: 'bg-amber-600',
    tiers: [
      {
        target: 3,
        title: 'Decade Defier',
        description: 'A lifetime of exploration.',
        requirement: 'Log trips in 3 different decades'
      }
    ]
  },
  {
    id: 'golden_voyager',
    icon: Trophy,
    color: 'bg-yellow-600',
    tiers: [
      {
        target: 1,
        title: 'Golden Voyager',
        description: 'Adventure knows no age.',
        requirement: 'Log a trip taken after age 70'
      }
    ]
  },
  {
    id: 'duration',
    icon: Zap,
    color: 'bg-teal-500',
    tiers: [
      {
        target: 14,
        title: 'Slow Traveler',
        description: 'Savoring every moment.',
        requirement: 'Log a trip longer than 14 days'
      },
      {
        target: 30,
        title: 'Month Dweller',
        description: 'Living like a local.',
        requirement: 'Log a trip longer than 30 days'
      },
      {
        target: 90,
        title: 'Quarterly Nomad',
        description: 'A season of discovery.',
        requirement: 'Log a trip longer than 90 days'
      },
      {
        target: 365,
        title: 'Yearly Resident',
        description: 'A full year of exploration.',
        requirement: 'Log a trip longer than 365 days'
      }
    ]
  },
  {
    id: 'continents',
    icon: Globe,
    color: 'bg-rose-500',
    tiers: [
      {
        target: 3,
        title: 'Continental Pro',
        description: 'Crossing boundaries.',
        requirement: 'Visit 3 different continents'
      },
      {
        target: 5,
        title: 'Continental Master',
        description: 'Almost every corner of the earth.',
        requirement: 'Visit 5 different continents'
      },
      {
        target: 7,
        title: 'World Conqueror',
        description: 'Every continent explored.',
        requirement: 'Visit all 7 continents'
      }
    ]
  },
  {
    id: 'referrals',
    icon: Users,
    color: 'bg-lime-500',
    tiers: [
      {
        target: 1,
        title: 'Recruiter',
        description: 'Your first friend joined!',
        requirement: 'Refer 1 person'
      },
      {
        target: 5,
        title: 'Connector',
        description: 'Building the community.',
        requirement: 'Refer 5 people'
      },
      {
        target: 10,
        title: 'Evangelist',
        description: 'Spreading the travel love.',
        requirement: 'Refer 10 people'
      },
      {
        target: 25,
        title: 'Legend Maker',
        description: 'A quarter century of explorers.',
        requirement: 'Refer 25 people'
      }
    ]
  },
  {
    id: 'weekend_warrior',
    icon: Timer,
    color: 'bg-cyan-500',
    tiers: [
      {
        target: 1,
        title: 'Weekend Warrior',
        description: 'Quick trips pack the biggest punch.',
        requirement: 'Log a trip of 3 days or less'
      },
      {
        target: 5,
        title: 'Flash Packer',
        description: 'Speed is your superpower.',
        requirement: 'Log 5 trips of 3 days or less'
      }
    ]
  },
  {
    id: 'island_hopper',
    icon: Anchor,
    color: 'bg-sky-500',
    tiers: [
      {
        target: 3,
        title: 'Island Hopper',
        description: 'Chasing horizons across the seas.',
        requirement: 'Visit 3 island nations'
      },
      {
        target: 5,
        title: 'Archipelago Pro',
        description: 'Master of island getaways.',
        requirement: 'Visit 5 island nations'
      },
      {
        target: 8,
        title: 'Island Sovereign',
        description: 'Ruler of the seven seas.',
        requirement: 'Visit 8 island nations'
      }
    ]
  },
  {
    id: 'milestone_trip',
    icon: Gift,
    color: 'bg-pink-500',
    tiers: [
      {
        target: 1,
        title: 'Milestone Maker',
        description: 'Celebrated a life milestone abroad.',
        requirement: 'Log a trip at a milestone age (18, 21, 30, 40, 50, 60)'
      },
      {
        target: 3,
        title: 'Birthday Globetrotter',
        description: 'Multiple milestones, multiple memories.',
        requirement: 'Log trips at 3 different milestone ages'
      }
    ]
  },
  {
    id: 'home_explorer',
    icon: Home,
    color: 'bg-emerald-500',
    tiers: [
      {
        target: 1,
        title: 'Homecoming',
        description: 'Not all adventures are far from home.',
        requirement: 'Log a trip in your home country'
      },
      {
        target: 5,
        title: 'Local Legend',
        description: 'Your own backyard has secrets too.',
        requirement: 'Log 5 trips in your home country'
      }
    ]
  },
  {
    id: 'jet_setter',
    icon: CompassIcon,
    color: 'bg-violet-500',
    tiers: [
      {
        target: 5,
        title: 'Jet Setter',
        description: 'Your passport never rests.',
        requirement: 'Visit 5 different countries in one year'
      },
      {
        target: 10,
        title: 'Nomad Elite',
        description: 'Do you even unpack?',
        requirement: 'Visit 10 different countries in one year'
      }
    ]
  },
  {
    id: 'antarctica',
    icon: Snowflake,
    color: 'bg-cyan-400',
    tiers: [
      {
        target: 1,
        title: 'Ice Breaker',
        description: 'You went where most only dream of.',
        requirement: 'Log a trip to Antarctica'
      }
    ]
  },
  {
    id: 'extreme_explorer',
    icon: Shield,
    color: 'bg-indigo-500',
    tiers: [
      {
        target: 5,
        title: 'Pole to Pole',
        description: 'From the frozen south to everywhere else.',
        requirement: 'Visit 5 continents including Antarctica'
      },
      {
        target: 7,
        title: 'Edge of the World',
        description: 'The extremes are your playground.',
        requirement: 'Visit all 7 continents including Antarctica'
      }
    ]
  },
  {
    id: 'pro_traveler',
    icon: Trophy,
    color: 'bg-gradient-to-r from-purple-500 to-indigo-600',
    tiers: [
      {
        target: 1,
        title: 'Pro Traveler',
        description: 'The world just got smaller.',
        requirement: 'Upgrade to Pro'
      }
    ]
  }
];

export const ISLAND_NATIONS = new Set([
  'Maldives', 'Fiji', 'Jamaica', 'Cuba', 'Iceland', 'Japan', 'Philippines',
  'Indonesia', 'Sri Lanka', 'Madagascar', 'New Zealand', 'Singapore',
  'Bahamas', 'Barbados', 'Trinidad and Tobago', 'Mauritius', 'Seychelles',
  'Malta', 'Cyprus', 'Cabo Verde', 'Comoros', 'Dominica', 'Grenada',
  'Kiribati', 'Marshall Islands', 'Micronesia', 'Nauru', 'Palau',
  'Samoa', 'Solomon Islands', 'Tonga', 'Tuvalu', 'Vanuatu',
  'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines',
  'Sao Tome and Principe', 'East Timor', 'Papua New Guinea', 'Antigua and Barbuda',
  'Bahrain'
]);

export const MILESTONE_AGES = [18, 21, 30, 40, 50, 60];

export interface LevelDefinition {
  level: number;
  title: string;
  xpRequired: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
}

export const LEVELS: LevelDefinition[] = [
  { level: 1, title: 'Wanderer', xpRequired: 0, tier: 'Bronze' },
  { level: 2, title: 'Backpacker', xpRequired: 100, tier: 'Bronze' },
  { level: 3, title: 'Voyager', xpRequired: 300, tier: 'Bronze' },
  { level: 4, title: 'Adventurer', xpRequired: 600, tier: 'Silver' },
  { level: 5, title: 'Explorer', xpRequired: 1000, tier: 'Silver' },
  { level: 6, title: 'Pathfinder', xpRequired: 1500, tier: 'Silver' },
  { level: 7, title: 'Navigator', xpRequired: 2100, tier: 'Gold' },
  { level: 8, title: 'Discoverer', xpRequired: 2800, tier: 'Gold' },
  { level: 9, title: 'Pioneer', xpRequired: 3600, tier: 'Gold' },
  { level: 10, title: 'Ambassador', xpRequired: 4500, tier: 'Platinum' },
  { level: 11, title: 'Globetrotter Elite', xpRequired: 5500, tier: 'Platinum' },
  { level: 12, title: 'World Legend', xpRequired: 7000, tier: 'Diamond' },
  { level: 13, title: 'Eternal Traveler', xpRequired: 9000, tier: 'Diamond' }
];
