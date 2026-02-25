import { DataStore, setStore } from './database';
import { FieldListing, BookingStatus } from '../types';

function generateTimetable() {
  const slots = [];
  for (let i = 8; i <= 21; i++) {
    const time = `${i.toString().padStart(2, '0')}:00`;
    // Deterministic seeding based on hour to avoid random changes per render
    const seed = (i * 7 + 3) % 10;
    let status = BookingStatus.AVAILABLE;
    let pendingCount = 0;

    if (seed > 7) {
      status = BookingStatus.CONFIRMED;
    } else if (seed > 4) {
      status = BookingStatus.PENDING;
      pendingCount = (seed % 3) + 1;
    }

    slots.push({
      time,
      status,
      pendingLobbiesCount: pendingCount,
      type: (seed % 2 === 0 ? 'Match' : 'Practice') as 'Match' | 'Practice'
    });
  }
  return slots;
}

const SEED_FIELDS: FieldListing[] = [
  {
    id: '1',
    name: 'Urban Fives & Elevens',
    location: 'Sandton, Johannesburg',
    pricePerPlayer: 50,
    imageUrl: 'https://picsum.photos/800/600?random=1',
    rating: 4.8,
    nextMatchTime: '18:00 Today',
    playersJoined: 14,
    maxPlayers: 22,
    amenities: ['Floodlights', 'Showers', 'Parking'],
    timetable: generateTimetable()
  },
  {
    id: '2',
    name: 'Green Point Arena',
    location: 'Cape Town',
    pricePerPlayer: 50,
    imageUrl: 'https://picsum.photos/800/600?random=2',
    rating: 4.9,
    nextMatchTime: '17:00 Today',
    playersJoined: 18,
    maxPlayers: 22,
    amenities: ['Coffee Shop', 'Pro Shop'],
    timetable: generateTimetable()
  }
];

export function seedDatabase(): {
  fields: FieldListing[];
} {
  const data: DataStore = {
    fields: SEED_FIELDS,
    lobbies: [],
    lobbyParticipants: [],
    profiles: [],
    practiceSessions: [],
    walletTransactions: [],
    messages: [],
    teamWalletContributions: [],
    userBalances: {},
    teamBalances: {},
    squadPool: [],
    captainMessages: [],
  };

  setStore(data);

  return {
    fields: data.fields,
  };
}
