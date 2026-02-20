import { DataStore, setStore } from './database';
import { FieldListing, MatchLobby, MatchIntensity, BookingStatus, SoccerProfile, PlayerPosition, PracticeSession } from '../types';

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

const SEED_PROFILES: SoccerProfile[] = [
  { id: 'p1', fullName: 'Keagan Dolly', position: PlayerPosition.MID, avatar: 'https://i.pravatar.cc/150?u=p1' },
  { id: 'p2', fullName: 'Thembinkosi Lorch', position: PlayerPosition.FWD, avatar: 'https://i.pravatar.cc/150?u=p2' },
  { id: 'p3', fullName: 'Ronwen Williams', position: PlayerPosition.GK, avatar: 'https://i.pravatar.cc/150?u=p3' },
  { id: 'p4', fullName: 'Percy Tau', position: PlayerPosition.FWD, avatar: 'https://i.pravatar.cc/150?u=p4' },
  { id: 'p5', fullName: 'Teboho Mokoena', position: PlayerPosition.MID, avatar: 'https://i.pravatar.cc/150?u=p5' },
  { id: 'p6', fullName: 'Siyanda Xulu', position: PlayerPosition.DEF, avatar: 'https://i.pravatar.cc/150?u=p6' },
  { id: 'p7', fullName: 'Siphiwe Tshabalala', position: PlayerPosition.MID, avatar: 'https://i.pravatar.cc/150?u=p7' },
  { id: 'p8', fullName: 'Thembisile Mahlangu', position: PlayerPosition.DEF, avatar: 'https://i.pravatar.cc/150?u=p8' },
  { id: 'p9', fullName: 'Bongani Zungu', position: PlayerPosition.MID, avatar: 'https://i.pravatar.cc/150?u=p9' },
  { id: 'p10', fullName: 'Lyle Foster', position: PlayerPosition.FWD, avatar: 'https://i.pravatar.cc/150?u=p10' },
  { id: 'p11', fullName: 'Grant Kekana', position: PlayerPosition.DEF, avatar: 'https://i.pravatar.cc/150?u=p11' },
  { id: 'p12', fullName: 'Aubrey Modiba', position: PlayerPosition.DEF, avatar: 'https://i.pravatar.cc/150?u=p12' },
];

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

const SEED_LOBBIES: MatchLobby[] = [
  {
    id: 'l1',
    fieldName: 'Urban Fives Sandton',
    fieldId: '1',
    location: 'Sandton, JHB',
    startTime: '18:00',
    date: 'Today',
    intensity: MatchIntensity.COMPETITIVE,
    joinedCount: 8,
    paidCount: 6,
    totalSlots: 10,
    price: 50,
    duration: '1hr',
    isConfirmed: false
  },
  {
    id: 'l2',
    fieldName: 'Urban Fives Sandton',
    fieldId: '1',
    location: 'Sandton, JHB',
    startTime: '20:00',
    date: 'Today',
    intensity: MatchIntensity.CASUAL,
    joinedCount: 4,
    paidCount: 4,
    totalSlots: 10,
    price: 50,
    duration: '1hr',
    isConfirmed: false
  }
];

const SEED_PRACTICE_SESSIONS: PracticeSession[] = [
  {
    id: 'ps1',
    hostName: 'Junior',
    hostAvatar: 'https://i.pravatar.cc/100?u=junior',
    hostType: 'Shooter',
    location: 'Sandton Arena',
    time: '17:00',
    needed: 'GK',
    description: 'Looking for a solid GK for high-velocity shooting practice.'
  },
  {
    id: 'ps2',
    hostName: 'Ace',
    hostAvatar: 'https://i.pravatar.cc/100?u=ace',
    hostType: 'GK',
    location: 'Green Point',
    time: '18:30',
    needed: 'Shooter',
    description: 'Need someone to test my reflexes with some penalties.'
  }
];

const SEED_SQUAD_POOL = [
  { id: 'm1', name: 'Siya Kolisi', role: 'Forward' },
  { id: 'm2', name: 'Thabo Mokoena', role: 'Midfielder' },
  { id: 'm3', name: 'Bongi Mbonambi', role: 'Defender' },
  { id: 'm4', name: 'Cheslin Kolbe', role: 'Forward' },
  { id: 'm10', name: 'Itumeleng Khune', role: 'Goalkeeper' },
];

const SEED_CAPTAIN_MESSAGES = [
  { id: '1', senderId: 'm3', senderName: 'Bongi', text: "Are we still playing at 6?", timestamp: '10:30 AM' },
  { id: '2', senderId: 'm1', senderName: 'Siya (C)', text: "Yes, confirmed. Don't forget to pay!", timestamp: '10:35 AM' },
];

export function seedDatabase(): {
  fields: FieldListing[];
  lobbies: MatchLobby[];
  profiles: SoccerProfile[];
  practiceSessions: PracticeSession[];
  squadPool: { id: string; name: string; role: string }[];
  captainMessages: typeof SEED_CAPTAIN_MESSAGES;
} {
  const data: DataStore = {
    fields: SEED_FIELDS,
    lobbies: SEED_LOBBIES,
    lobbyParticipants: [],
    profiles: SEED_PROFILES,
    practiceSessions: SEED_PRACTICE_SESSIONS,
    walletTransactions: [],
    messages: [],
    teamWalletContributions: [
      { id: 'tc1', teamId: '', memberId: 'm1', memberName: 'Siya Kolisi', amount: 500, createdAt: new Date().toISOString() },
      { id: 'tc2', teamId: '', memberId: 'm2', memberName: 'Thabo Mokoena', amount: 300, createdAt: new Date().toISOString() },
      { id: 'tc3', teamId: '', memberId: 'm3', memberName: 'Bongi Mbonambi', amount: 400, createdAt: new Date().toISOString() },
    ],
    userBalances: {
      'm1': { balance: 1500, escrow: 0 }
    },
    teamBalances: {},
    squadPool: SEED_SQUAD_POOL,
    captainMessages: SEED_CAPTAIN_MESSAGES,
  };

  setStore(data);

  return {
    fields: data.fields,
    lobbies: data.lobbies,
    profiles: data.profiles,
    practiceSessions: data.practiceSessions,
    squadPool: data.squadPool,
    captainMessages: data.captainMessages,
  };
}
