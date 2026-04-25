// Continent mapping by ISO 3166-1 numeric code (used by world-atlas topojson)
const EUROPE = ['008','020','040','056','070','100','112','191','196','203','208','233','246','250','276','300','336','348','352','372','380','383','428','438','440','442','470','492','498','499','528','578','616','620','642','643','674','688','703','705','724','752','756','792','804','807','826'];
const ASIA = ['004','031','048','050','051','064','096','104','116','144','156','158','268','275','356','360','364','368','376','392','398','400','408','410','414','417','418','422','458','462','496','512','524','586','608','634','682','702','760','762','764','784','795','860','704','887'];
const AFRICA = ['012','024','072','108','120','132','140','148','174','178','180','204','226','231','232','262','266','270','288','324','384','404','426','430','434','450','454','466','478','480','504','508','516','562','566','624','646','678','686','690','694','706','710','716','728','729','748','768','788','800','818','834','854','894'];
const NORTH_AMERICA = ['028','044','052','084','124','188','192','212','214','222','308','320','332','340','388','484','558','591','659','662','670','780','840'];
const SOUTH_AMERICA = ['032','068','076','152','170','218','328','600','604','740','858','862'];
const OCEANIA = ['036','090','242','296','520','548','554','583','584','585','598','776','798','882'];
const ANTARCTICA = ['010'];

export const NUMERIC_TO_CONTINENT: Record<string, string> = {};
EUROPE.forEach(c => { NUMERIC_TO_CONTINENT[c] = 'Europe'; });
ASIA.forEach(c => { NUMERIC_TO_CONTINENT[c] = 'Asia'; });
AFRICA.forEach(c => { NUMERIC_TO_CONTINENT[c] = 'Africa'; });
NORTH_AMERICA.forEach(c => { NUMERIC_TO_CONTINENT[c] = 'North America'; });
SOUTH_AMERICA.forEach(c => { NUMERIC_TO_CONTINENT[c] = 'South America'; });
OCEANIA.forEach(c => { NUMERIC_TO_CONTINENT[c] = 'Oceania'; });
ANTARCTICA.forEach(c => { NUMERIC_TO_CONTINENT[c] = 'Antarctica'; });

// Popular cities by numeric country code (for city enrichment step)
export const POPULAR_CITIES: Record<string, string[]> = {
  '840': ['New York', 'Los Angeles', 'Chicago', 'San Francisco', 'Miami', 'Las Vegas'],
  '826': ['London', 'Edinburgh', 'Manchester', 'Liverpool', 'Oxford', 'Bath'],
  '250': ['Paris', 'Nice', 'Lyon', 'Marseille', 'Bordeaux', 'Strasbourg'],
  '276': ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Dresden'],
  '380': ['Rome', 'Florence', 'Venice', 'Milan', 'Naples', 'Amalfi'],
  '724': ['Barcelona', 'Madrid', 'Seville', 'Valencia', 'Granada', 'Malaga'],
  '392': ['Tokyo', 'Kyoto', 'Osaka', 'Hiroshima', 'Nara', 'Yokohama'],
  '156': ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Chengdu', 'Xi\'an'],
  '356': ['Mumbai', 'Delhi', 'Jaipur', 'Goa', 'Bangalore', 'Kolkata'],
  '036': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Gold Coast', 'Cairns'],
  '124': ['Toronto', 'Vancouver', 'Montreal', 'Ottawa', 'Calgary', 'Quebec City'],
  '076': ['Rio de Janeiro', 'Sao Paulo', 'Salvador', 'Brasilia', 'Florianopolis'],
  '484': ['Mexico City', 'Cancun', 'Guadalajara', 'Playa del Carmen', 'Oaxaca'],
  '764': ['Bangkok', 'Chiang Mai', 'Phuket', 'Pattaya', 'Krabi', 'Koh Samui'],
  '704': ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Hoi An', 'Nha Trang'],
  '360': ['Bali', 'Jakarta', 'Yogyakarta', 'Lombok', 'Bandung'],
  '608': ['Manila', 'Cebu', 'Boracay', 'Palawan', 'Davao'],
  '410': ['Seoul', 'Busan', 'Jeju', 'Incheon', 'Gyeongju'],
  '458': ['Kuala Lumpur', 'Penang', 'Langkawi', 'Malacca', 'Kota Kinabalu'],
  '702': ['Singapore'],
  '528': ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven'],
  '056': ['Brussels', 'Bruges', 'Ghent', 'Antwerp', 'Leuven'],
  '620': ['Lisbon', 'Porto', 'Faro', 'Sintra', 'Madeira'],
  '300': ['Athens', 'Santorini', 'Mykonos', 'Thessaloniki', 'Crete'],
  '792': ['Istanbul', 'Cappadocia', 'Antalya', 'Izmir', 'Bodrum'],
  '818': ['Cairo', 'Luxor', 'Sharm El Sheikh', 'Alexandria', 'Aswan'],
  '710': ['Cape Town', 'Johannesburg', 'Durban', 'Kruger Park', 'Pretoria'],
  '784': ['Dubai', 'Abu Dhabi', 'Sharjah'],
  '682': ['Riyadh', 'Jeddah', 'Mecca', 'Medina'],
  '376': ['Tel Aviv', 'Jerusalem', 'Haifa', 'Eilat'],
  '400': ['Amman', 'Petra', 'Aqaba', 'Dead Sea'],
  '504': ['Marrakech', 'Fez', 'Casablanca', 'Chefchaouen', 'Tangier'],
  '404': ['Nairobi', 'Mombasa', 'Masai Mara', 'Diani Beach'],
  '834': ['Dar es Salaam', 'Zanzibar', 'Arusha', 'Kilimanjaro'],
  '756': ['Zurich', 'Geneva', 'Lucerne', 'Bern', 'Interlaken'],
  '040': ['Vienna', 'Salzburg', 'Innsbruck', 'Graz', 'Hallstatt'],
  '203': ['Prague', 'Brno', 'Cesky Krumlov', 'Karlovy Vary'],
  '348': ['Budapest', 'Debrecen', 'Eger', 'Pecs'],
  '616': ['Warsaw', 'Krakow', 'Gdansk', 'Wroclaw', 'Poznan'],
  '642': ['Bucharest', 'Cluj-Napoca', 'Brasov', 'Sibiu', 'Timisoara'],
  '191': ['Zagreb', 'Dubrovnik', 'Split', 'Plitvice', 'Zadar'],
  '352': ['Reykjavik', 'Blue Lagoon', 'Akureyri', 'Vik'],
  '578': ['Oslo', 'Bergen', 'Tromso', 'Stavanger', 'Trondheim'],
  '752': ['Stockholm', 'Gothenburg', 'Malmo', 'Uppsala'],
  '208': ['Copenhagen', 'Aarhus', 'Odense'],
  '246': ['Helsinki', 'Turku', 'Rovaniemi', 'Tampere'],
  '554': ['Auckland', 'Queenstown', 'Wellington', 'Christchurch', 'Rotorua'],
  '032': ['Buenos Aires', 'Mendoza', 'Bariloche', 'Iguazu', 'Ushuaia'],
  '152': ['Santiago', 'Valparaiso', 'Atacama', 'Patagonia'],
  '170': ['Bogota', 'Cartagena', 'Medellin', 'Cali'],
  '604': ['Lima', 'Cusco', 'Machu Picchu', 'Arequipa'],
  '372': ['Dublin', 'Galway', 'Cork', 'Killarney', 'Belfast'],
  '643': ['Moscow', 'St Petersburg', 'Kazan', 'Sochi'],
  '804': ['Kyiv', 'Lviv', 'Odessa', 'Kharkiv'],
  '116': ['Phnom Penh', 'Siem Reap', 'Sihanoukville'],
  '144': ['Colombo', 'Kandy', 'Galle', 'Ella', 'Sigiriya'],
  '524': ['Kathmandu', 'Pokhara', 'Chitwan', 'Lumbini'],
  '188': ['San Jose', 'Arenal', 'Manuel Antonio', 'Monteverde'],
  '591': ['Panama City', 'Bocas del Toro', 'San Blas'],
  '192': ['Havana', 'Trinidad', 'Varadero', 'Vinales'],
  '388': ['Kingston', 'Montego Bay', 'Ocho Rios', 'Negril'],
  '364': ['Tehran', 'Isfahan', 'Shiraz', 'Yazd'],
};
