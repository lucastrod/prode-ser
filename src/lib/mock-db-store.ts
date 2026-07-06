import fs from 'fs';
import path from 'path';

const MOCK_DB_PATH = path.join(process.cwd(), 'mock_db.json');

interface MockUser {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  active: boolean;
  createdAt: string;
  passwordHash?: string;
  resetPasswordToken?: string | null;
  resetPasswordExpires?: string | null;
}

interface MockMatch {
  id: number;
  externalMatchId: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  groupName: string;
  stage: 'GROUP' | 'ROUND_32' | 'ROUND_16' | 'QUARTER' | 'SEMI' | 'THIRD_PLACE' | 'FINAL';
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELLED';
  homeScore: number | null;
  awayScore: number | null;
  penaltyWinner?: string | null;
}

interface MockPrediction {
  id: number;
  userId: string;
  matchId: number;
  predictedHomeScore: number;
  predictedAwayScore: number;
  points: number | null;
  createdAt: string;
}

interface MockStanding {
  id: number;
  userId: string;
  totalPoints: number;
  exactScores: number;
  correctOutcomes: number;
  updatedAt: string;
}

interface MockPrize {
  id: number;
  position: number;
  title: string;
  description: string;
  enabled: boolean;
}

interface MockDB {
  users: MockUser[];
  matches: MockMatch[];
  predictions: MockPrediction[];
  standings: MockStanding[];
  prizes: MockPrize[];
  healthPing: string;
}

const DEFAULT_MOCK_DATA: MockDB = {
  users: [
    {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Lucas Admin',
      email: 'lucas.admin@prodeser.com',
      role: 'ADMIN',
      active: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      name: 'Lucas',
      email: 'lucas@prodeser.com',
      role: 'USER',
      active: true,
      createdAt: new Date().toISOString(),
    },
  ],
  matches: [],
  predictions: [],
  standings: [
    {
      id: 1,
      userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      totalPoints: 27,
      exactScores: 5,
      correctOutcomes: 12,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 2,
      userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      totalPoints: 0,
      exactScores: 0,
      correctOutcomes: 0,
      updatedAt: new Date().toISOString(),
    },
  ],
  prizes: [
    { id: 1, position: 1, title: '🥇 Primer Puesto', description: 'Cena para dos personas en restaurant premium.', enabled: true },
    { id: 2, position: 2, title: '🥈 Segundo Puesto', description: 'Gift Card SER de $50,000.', enabled: true },
    { id: 3, position: 3, title: '🥉 Tercer Puesto', description: 'Kit Mundialista SER (Remera, Gorra, Termo).', enabled: true },
  ],
  healthPing: new Date().toISOString(),
};

// Reads Mock DB from disk
export function readMockDB(): MockDB {
  try {
    if (!fs.existsSync(MOCK_DB_PATH)) {
      writeMockDB(DEFAULT_MOCK_DATA);
      return DEFAULT_MOCK_DATA;
    }
    const raw = fs.readFileSync(MOCK_DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading mock DB file, returning defaults:', err);
    return DEFAULT_MOCK_DATA;
  }
}

// Writes Mock DB to disk
export function writeMockDB(data: MockDB) {
  try {
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing mock DB file:', err);
  }
}

// Check points formula
export function calculatePoints(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number
): number {
  if (predHome === actualHome && predAway === actualAway) {
    return 6;
  }

  const predWinner = predHome > predAway ? 'home' : predHome < predAway ? 'away' : 'draw';
  const actualWinner = actualHome > actualAway ? 'home' : actualHome < actualAway ? 'away' : 'draw';

  if (predWinner === actualWinner) {
    return 3;
  }

  return 0;
}

// Helper to recalculate standings in Mock DB
export function recalculateMockStandings(db: MockDB) {
  db.standings = db.users.map((user, idx) => {
    const userPredictions = db.predictions.filter((p) => p.userId === user.id);
    let totalPoints = 0;
    let exactScores = 0;
    let correctOutcomes = 0;

    for (const pred of userPredictions) {
      if (pred.points === null) continue;
      
      totalPoints += pred.points;
      if (pred.points === 6) {
        exactScores++;
      } else if (pred.points === 3) {
        correctOutcomes++;
      }
    }

    // Keep the mock Lucas at 27 points if he has no predictions loaded yet (to display mockup state)
    if (user.id === 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' && userPredictions.length === 0) {
      totalPoints = 27;
      exactScores = 5;
      correctOutcomes = 12;
    }

    const existing = db.standings.find((s) => s.userId === user.id);
    return {
      id: existing ? existing.id : idx + 1,
      userId: user.id,
      totalPoints,
      exactScores,
      correctOutcomes,
      updatedAt: new Date().toISOString(),
    };
  });
}
