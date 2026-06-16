import db from './db';
import { MatchStatus, Stage } from '@prisma/client';
import * as mockDb from './mock-db-store';
import fs from 'fs';
import path from 'path';
import { TEAM_TRANSLATIONS, parseMatchDateTime } from './sync-matches';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const isDbConfigured = () => {
  const url = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;
  return url && url !== '' && !url.includes('postgres.your-project-id');
};

export const dbClient = {
  // --- MATCHES ---
  async getMatches() {
    if (isDbConfigured()) {
      try {
        return await db.match.findMany({
          orderBy: { matchDate: 'asc' },
        });
      } catch (err) {
        console.error('Prisma Match fetch failed, falling back to mock:', err);
      }
    }
    // Mock
    const data = mockDb.readMockDB();
    if (data.matches.length === 0) {
      // Auto import if empty in mock
      await this.importFixtures();
      return mockDb.readMockDB().matches;
    }
    return data.matches;
  },

  async getMatch(id: number) {
    if (isDbConfigured()) {
      try {
        return await db.match.findUnique({ where: { id } });
      } catch (err) {
        console.error('Prisma Match detail fetch failed:', err);
      }
    }
    const data = mockDb.readMockDB();
    return data.matches.find((m) => m.id === id) || null;
  },

  async importFixtures() {
    if (isDbConfigured()) {
      try {
        const { importFixtures: realImport } = require('./sync-matches');
        return await realImport();
      } catch (err) {
        console.error('Prisma fixture import failed:', err);
      }
    }
    // Mock import
    const data = mockDb.readMockDB();
    if (data.matches.length > 0) {
      return { count: data.matches.length, message: 'Matches already imported' };
    }

    try {
      const filePath = path.join(process.cwd(), 'fixture', 'worldcup.json');
      const rawData = fs.readFileSync(filePath, 'utf-8');
      const parsedData = JSON.parse(rawData);

      // Group-stage matches
      const rawGroupMatches = (parsedData.matches || []).filter((m: any) => m.group);

      // Group matches by group name
      const matchesByGroup: Record<string, any[]> = {};
      for (const match of rawGroupMatches) {
        const gName = match.group.replace('Group', 'Grupo');
        if (!matchesByGroup[gName]) {
          matchesByGroup[gName] = [];
        }
        matchesByGroup[gName].push(match);
      }

      // Sort each group's matches chronologically and skip the first 2 matches
      const filteredGroupMatches: any[] = [];
      for (const gName in matchesByGroup) {
        const sorted = matchesByGroup[gName].sort((a, b) => {
          const timeA = parseMatchDateTime(a.date, a.time).getTime();
          const timeB = parseMatchDateTime(b.date, b.time).getTime();
          return timeA - timeB;
        });
        filteredGroupMatches.push(...sorted.slice(2));
      }

      // Knockout matches
      const rawKnockoutMatches = (parsedData.matches || []).filter((m: any) => !m.group);

      // Combine matches
      const allMatchesToImport = [...filteredGroupMatches, ...rawKnockoutMatches];

      data.matches = allMatchesToImport.map((fixture: any, idx: number) => {
        const matchDate = parseMatchDateTime(fixture.date, fixture.time);
        const homeTeam = TEAM_TRANSLATIONS[fixture.team1] || fixture.team1;
        const awayTeam = TEAM_TRANSLATIONS[fixture.team2] || fixture.team2;
        const groupName = fixture.group ? fixture.group.replace('Group', 'Grupo') : 'Fase Final';

        let stage: 'GROUP' | 'ROUND_32' | 'ROUND_16' | 'QUARTER' | 'SEMI' | 'THIRD_PLACE' | 'FINAL' = 'GROUP';
        if (fixture.round === 'Round of 32') stage = 'ROUND_32';
        else if (fixture.round === 'Round of 16') stage = 'ROUND_16';
        else if (fixture.round === 'Quarter-final') stage = 'QUARTER';
        else if (fixture.round === 'Semi-final') stage = 'SEMI';
        else if (fixture.round === 'Match for third place') stage = 'THIRD_PLACE';
        else if (fixture.round === 'Final') stage = 'FINAL';

        return {
          id: idx + 1,
          externalMatchId: `openfootball_2026_${idx + 1}`,
          homeTeam,
          awayTeam,
          matchDate: matchDate.toISOString(),
          groupName,
          stage,
          status: 'SCHEDULED' as const,
          homeScore: null,
          awayScore: null,
        };
      });

      mockDb.writeMockDB(data);
      return { count: data.matches.length, message: 'Successfully imported fixtures from Ronda 2 onwards' };
    } catch (error: any) {
      console.error('Error importing fixtures in mock mode:', error);
      throw new Error(`Failed to import fixtures: ${error.message}`);
    }
  },

  async syncMatchResults(apiFootballKey?: string) {
    if (isDbConfigured()) {
      try {
        const { syncMatchResults: realSync } = require('./sync-matches');
        return await realSync(apiFootballKey);
      } catch (err) {
        console.error('Prisma match sync failed:', err);
      }
    }

    // Mock sync
    const data = mockDb.readMockDB();
    const now = new Date();
    let lockedCount = 0;
    let finishedCount = 0;

    data.matches = data.matches.map((match) => {
      const matchDate = new Date(match.matchDate);
      if (match.status === 'SCHEDULED' && matchDate <= now) {
        const minutesPassed = (now.getTime() - matchDate.getTime()) / (1000 * 60);
        if (minutesPassed >= 120) {
          // Finished match simulation
          const homeScore = Math.floor(Math.random() * 4);
          const awayScore = Math.floor(Math.random() * 4);
          
          finishedCount++;
          return {
            ...match,
            status: 'FINISHED' as const,
            homeScore,
            awayScore,
          };
        } else {
          // Live/Locked
          lockedCount++;
          return {
            ...match,
            status: 'LIVE' as const,
          };
        }
      }
      return match;
    });

    // Recalculate predictions in mock db
    data.predictions = data.predictions.map((pred) => {
      const match = data.matches.find((m) => m.id === pred.matchId);
      if (match && match.status === 'FINISHED' && match.homeScore !== null && match.awayScore !== null) {
        const points = mockDb.calculatePoints(
          pred.predictedHomeScore,
          pred.predictedAwayScore,
          match.homeScore,
          match.awayScore
        );
        return { ...pred, points };
      }
      return pred;
    });

    mockDb.recalculateMockStandings(data);
    mockDb.writeMockDB(data);

    return { lockedCount, finishedCount };
  },

  // --- PREDICTIONS ---
  async getPredictions(userId: string) {
    if (isDbConfigured()) {
      try {
        return await db.prediction.findMany({
          where: { userId },
        });
      } catch (err) {
        console.error('Prisma prediction fetch failed:', err);
      }
    }
    const data = mockDb.readMockDB();
    return data.predictions.filter((p) => p.userId === userId);
  },

  async savePrediction(
    userId: string,
    matchId: number,
    predictedHomeScore: number,
    predictedAwayScore: number
  ) {
    if (isDbConfigured()) {
      try {
        const match = await db.match.findUnique({ where: { id: matchId } });
        if (!match) throw new Error('Match not found');
        
        // Locked check (kickoff passed minus 15 mins)
        if (new Date() >= new Date(new Date(match.matchDate).getTime() - 15 * 60000)) {
          throw new Error('El partido está bloqueado. (Cierra 15 min antes del inicio).');
        }

        return await db.prediction.upsert({
          where: {
            userId_matchId: { userId, matchId },
          },
          create: {
            userId,
            matchId,
            predictedHomeScore,
            predictedAwayScore,
          },
          update: {
            predictedHomeScore,
            predictedAwayScore,
            createdAt: new Date(),
          },
        });
      } catch (err: any) {
        console.error('Prisma prediction save failed:', err);
        throw err;
      }
    }

    // Mock
    const data = mockDb.readMockDB();
    const match = data.matches.find((m) => m.id === matchId);
    if (!match) throw new Error('Match not found');

    if (new Date() >= new Date(new Date(match.matchDate).getTime() - 15 * 60000)) {
      throw new Error('El partido está bloqueado. (Cierra 15 min antes del inicio).');
    }

    // Upsert mock prediction
    const index = data.predictions.findIndex((p) => p.userId === userId && p.matchId === matchId);
    const newPred = {
      id: index >= 0 ? data.predictions[index].id : data.predictions.length + 1,
      userId,
      matchId,
      predictedHomeScore,
      predictedAwayScore,
      points: null,
      createdAt: new Date().toISOString(),
    };

    if (index >= 0) {
      data.predictions[index] = newPred;
    } else {
      data.predictions.push(newPred);
    }

    mockDb.writeMockDB(data);
    return newPred;
  },

  // --- STANDINGS ---
  async getStandings() {
    if (isDbConfigured()) {
      try {
        return await db.standing.findMany({
          include: { user: { select: { name: true, avatarUrl: true } } },
          orderBy: [
            { totalPoints: 'desc' },
            { exactScores: 'desc' },
            { correctOutcomes: 'desc' },
          ],
        });
      } catch (err) {
        console.error('Prisma standings fetch failed:', err);
      }
    }

    // Mock
    const data = mockDb.readMockDB();
    mockDb.recalculateMockStandings(data);
    mockDb.writeMockDB(data);

    return data.standings
      .map((standing) => {
        const user = data.users.find((u) => u.id === standing.userId);
        return {
          ...standing,
          user: { 
            name: user ? user.name : 'Unknown User',
            avatarUrl: user ? (user as any).avatarUrl : null
          },
        };
      })
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
        return b.correctOutcomes - a.correctOutcomes;
      });
  },

  // --- PRIZES ---
  async getPrizes() {
    if (isDbConfigured()) {
      try {
        return await db.prize.findMany({
          orderBy: { position: 'asc' },
        });
      } catch (err) {
        console.error('Prisma prizes fetch failed:', err);
      }
    }
    return mockDb.readMockDB().prizes;
  },

  async savePrize(prize: any) {
    if (isDbConfigured()) {
      try {
        return await db.prize.upsert({
          where: { position: prize.position },
          create: {
            position: prize.position,
            title: prize.title,
            description: prize.description,
            enabled: prize.enabled ?? true,
          },
          update: {
            title: prize.title,
            description: prize.description,
            enabled: prize.enabled ?? true,
          },
        });
      } catch (err) {
        console.error('Prisma prize save failed:', err);
      }
    }

    // Mock
    const data = mockDb.readMockDB();
    const index = data.prizes.findIndex((p) => p.position === prize.position);
    const newPrize = {
      id: index >= 0 ? data.prizes[index].id : data.prizes.length + 1,
      position: prize.position,
      title: prize.title,
      description: prize.description,
      enabled: prize.enabled ?? true,
    };

    if (index >= 0) {
      data.prizes[index] = newPrize;
    } else {
      data.prizes.push(newPrize);
    }
    mockDb.writeMockDB(data);
    return newPrize;
  },

  async deletePrize(position: number) {
    if (isDbConfigured()) {
      try {
        return await db.prize.delete({
          where: { position },
        });
      } catch (err) {
        console.error('Prisma prize delete failed:', err);
      }
    }

    // Mock
    const data = mockDb.readMockDB();
    data.prizes = data.prizes.filter((p) => p.position !== position);
    mockDb.writeMockDB(data);
    return { success: true };
  },

  // --- USERS & PROFILE ---
  async getUsers() {
    if (isDbConfigured()) {
      try {
        return await db.user.findMany({
          orderBy: { name: 'asc' },
        });
      } catch (err) {
        console.error('Prisma users fetch failed:', err);
      }
    }
    return mockDb.readMockDB().users;
  },

  async getUserProfile(userId: string) {
    if (isDbConfigured()) {
      try {
        return await db.user.findUnique({
          where: { id: userId },
        });
      } catch (err) {
        console.error('Prisma user profile fetch failed:', err);
      }
    }
    const data = mockDb.readMockDB();
    return data.users.find((u) => u.id === userId) || null;
  },

  async getUserByEmail(email: string) {
    if (isDbConfigured()) {
      try {
        return await db.user.findUnique({
          where: { email },
        });
      } catch (err) {
        console.error('Prisma getUserByEmail failed:', err);
      }
    }
    const data = mockDb.readMockDB();
    return data.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async syncUserProfile(id: string, name: string, email: string) {
    if (isDbConfigured()) {
      try {
        return await db.user.upsert({
          where: { id },
          create: {
            id,
            name,
            email,
            role: 'USER',
            passwordHash: 'default',
            standing: {
              create: {
                totalPoints: 0,
                exactScores: 0,
                correctOutcomes: 0,
              }
            }
          },
          update: { name, email },
        });
      } catch (err) {
        console.error('Prisma profile sync failed:', err);
        throw err;
      }
    }

    // Mock
    const data = mockDb.readMockDB();
    const index = data.users.findIndex((u) => u.id === id);
    const newUser = {
      id,
      name,
      email,
      role: 'USER' as const,
      active: true,
      createdAt: new Date().toISOString(),
    };

    if (index >= 0) {
      data.users[index] = { ...data.users[index], name, email };
    } else {
      data.users.push(newUser);
    }
    mockDb.writeMockDB(data);
    return newUser;
  },

  async registerUser(userData: { id: string; name: string; email: string; passwordHash: string; verificationToken: string }) {
    if (isDbConfigured()) {
      try {
        return await db.user.create({
          data: {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            passwordHash: userData.passwordHash,
            role: 'USER',
            active: false,
            emailVerified: false,
            verificationToken: userData.verificationToken,
            standing: {
              create: {
                totalPoints: 0,
                exactScores: 0,
                correctOutcomes: 0,
              }
            }
          }
        });
      } catch (err) {
        console.error('Prisma register user failed:', err);
        throw err;
      }
    }

    // Mock
    const data = mockDb.readMockDB();
    const newUser = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: 'USER' as const,
      active: false,
      emailVerified: false,
      verificationToken: userData.verificationToken,
      createdAt: new Date().toISOString(),
    };
    data.users.push(newUser);
    mockDb.writeMockDB(data);
    return newUser;
  },

  async saveUser(userData: any) {
    if (isDbConfigured()) {
      try {
        const passwordHash = userData.password 
          ? await bcrypt.hash(userData.password, 10) 
          : 'default';
        return await db.user.create({
          data: {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            active: userData.active ?? true,
            passwordHash,
            standing: {
              create: {
                totalPoints: 0,
                exactScores: 0,
                correctOutcomes: 0,
              }
            }
          },
        });
      } catch (err) {
        console.error('Prisma save user failed:', err);
        throw err;
      }
    }

    // Mock
    const data = mockDb.readMockDB();
    const newUser = {
      id: userData.id || Math.random().toString(36).substring(7),
      name: userData.name,
      email: userData.email,
      role: userData.role || 'USER',
      active: userData.active ?? true,
      createdAt: new Date().toISOString(),
    };
    data.users.push(newUser);
    mockDb.writeMockDB(data);
    return newUser;
  },

  async updateUser(userData: any) {
    if (isDbConfigured()) {
      try {
        const dataToUpdate: any = {
          name: userData.name,
          email: userData.email,
          role: userData.role,
          active: userData.active,
        };
        if (userData.password) {
          dataToUpdate.passwordHash = await bcrypt.hash(userData.password, 10);
        }
        return await db.user.update({
          where: { id: userData.id },
          data: dataToUpdate,
        });
      } catch (err) {
        console.error('Prisma update user failed:', err);
        throw err;
      }
    }

    // Mock
    const data = mockDb.readMockDB();
    const idx = data.users.findIndex((u) => u.id === userData.id);
    if (idx >= 0) {
      data.users[idx] = {
        ...data.users[idx],
        name: userData.name ?? data.users[idx].name,
        email: userData.email ?? data.users[idx].email,
        role: userData.role ?? data.users[idx].role,
        active: userData.active ?? data.users[idx].active,
      };
      mockDb.writeMockDB(data);
      return data.users[idx];
    }
    throw new Error('User not found in mock store');
  },

  async deleteUser(id: string) {
    if (isDbConfigured()) {
      try {
        return await db.user.delete({
          where: { id },
        });
      } catch (err) {
        console.error('Prisma delete user failed:', err);
        throw err;
      }
    }

    // Mock
    const data = mockDb.readMockDB();
    data.users = data.users.filter((u) => u.id !== id);
    data.standings = data.standings.filter((s) => s.userId !== id);
    data.predictions = data.predictions.filter((p) => p.userId !== id);
    mockDb.writeMockDB(data);
    return { success: true };
  },

  // --- MATCH OVERRIDES ---
  async saveMatch(matchData: any) {
    if (isDbConfigured()) {
      try {
        return await db.match.create({
          data: {
            homeTeam: matchData.homeTeam,
            awayTeam: matchData.awayTeam,
            matchDate: new Date(matchData.matchDate),
            groupName: matchData.groupName,
            stage: matchData.stage || 'GROUP',
            status: matchData.status || 'SCHEDULED',
          },
        });
      } catch (err) {
        console.error('Prisma match save failed:', err);
      }
    }

    // Mock
    const data = mockDb.readMockDB();
    const newMatch = {
      id: data.matches.length + 1,
      externalMatchId: `mock_${Date.now()}`,
      homeTeam: matchData.homeTeam,
      awayTeam: matchData.awayTeam,
      matchDate: new Date(matchData.matchDate).toISOString(),
      groupName: matchData.groupName,
      stage: (matchData.stage || 'GROUP') as any,
      status: (matchData.status || 'SCHEDULED') as any,
      homeScore: null,
      awayScore: null,
    };
    data.matches.push(newMatch);
    mockDb.writeMockDB(data);
    return newMatch;
  },

  async updateMatch(matchData: any) {
    if (isDbConfigured()) {
      try {
        const updated = await db.match.update({
          where: { id: matchData.id },
          data: {
            homeTeam: matchData.homeTeam,
            awayTeam: matchData.awayTeam,
            matchDate: new Date(matchData.matchDate),
            groupName: matchData.groupName,
            status: matchData.status,
            homeScore: matchData.homeScore !== undefined ? matchData.homeScore : undefined,
            awayScore: matchData.awayScore !== undefined ? matchData.awayScore : undefined,
          },
        });

        if (matchData.status === 'FINISHED') {
          const { recalculateMatchPoints } = await import('./points-engine');
          await recalculateMatchPoints(matchData.id);
        }

        return updated;
      } catch (err) {
        console.error('Prisma update match failed:', err);
        throw err;
      }
    }

    // Mock
    const data = mockDb.readMockDB();
    const idx = data.matches.findIndex((m) => m.id === matchData.id);
    if (idx >= 0) {
      data.matches[idx] = {
        ...data.matches[idx],
        homeTeam: matchData.homeTeam ?? data.matches[idx].homeTeam,
        awayTeam: matchData.awayTeam ?? data.matches[idx].awayTeam,
        matchDate: matchData.matchDate ? new Date(matchData.matchDate).toISOString() : data.matches[idx].matchDate,
        groupName: matchData.groupName ?? data.matches[idx].groupName,
        status: matchData.status ?? data.matches[idx].status,
        homeScore: matchData.homeScore !== undefined ? matchData.homeScore : data.matches[idx].homeScore,
        awayScore: matchData.awayScore !== undefined ? matchData.awayScore : data.matches[idx].awayScore,
      };

      if (matchData.status === 'FINISHED') {
        // Recalculate predictions in mock db
        const match = data.matches[idx];
        data.predictions = data.predictions.map((pred) => {
          if (pred.matchId === match.id && match.homeScore !== null && match.awayScore !== null) {
            const points = mockDb.calculatePoints(
              pred.predictedHomeScore,
              pred.predictedAwayScore,
              match.homeScore,
              match.awayScore
            );
            return { ...pred, points };
          }
          return pred;
        });
        mockDb.recalculateMockStandings(data);
      }

      mockDb.writeMockDB(data);
      return data.matches[idx];
    }
    throw new Error('Match not found in mock store');
  },

  // --- ADMIN METRICS ---
  async getAdminMetrics() {
    if (isDbConfigured()) {
      try {
        const usersCount = await db.user.count();
        const predictionsCount = await db.prediction.count();
        const pendingMatches = await db.match.count({
          where: { status: { in: [MatchStatus.SCHEDULED, MatchStatus.LIVE] } },
        });
        const finishedMatches = await db.match.count({
          where: { status: MatchStatus.FINISHED },
        });

        return {
          usersCount,
          predictionsCount,
          pendingMatches,
          finishedMatches,
        };
      } catch (err) {
        console.error('Prisma metrics fetch failed:', err);
      }
    }

    // Mock
    const data = mockDb.readMockDB();
    const pending = data.matches.filter((m) => m.status === 'SCHEDULED' || m.status === 'LIVE').length;
    const finished = data.matches.filter((m) => m.status === 'FINISHED').length;

    return {
      usersCount: data.users.length,
      predictionsCount: data.predictions.length,
      pendingMatches: pending,
      finishedMatches: finished,
    };
  },

  // --- HEALTH PING ---
  async pingHealth() {
    if (isDbConfigured()) {
      try {
        return await db.healthCheck.upsert({
          where: { id: 1 },
          update: { lastPing: new Date() },
          create: { id: 1, lastPing: new Date() },
        });
      } catch (err) {
        console.error('Prisma health ping failed:', err);
      }
    }
    const data = mockDb.readMockDB();
    data.healthPing = new Date().toISOString();
    mockDb.writeMockDB(data);
    return { lastPing: data.healthPing };
  },
};
