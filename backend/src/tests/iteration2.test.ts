import { describe, it, expect, beforeAll } from 'vitest';
import { inMemoryDb } from '../db/index.js';
import { resetAndSeedDatabase } from '../db/reset.js';
import type {
  InvestorProfile,
  Application,
  WatchlistEntry,
  Message,
  Startup,
  MentorFeedback,
} from '../db/schema.types.js';

describe('Iteration 2: Database Schema, Constraints, RLS, and Seed Data', () => {
  beforeAll(async () => {
    inMemoryDb.reset();
  });

  describe('1. Clean Database Reset and Seed Verification', () => {
    it('seeds exactly 1 admin, 3 founders, 3 investors, 2 mentors, and 2 incubators', async () => {
      const allProfiles = inMemoryDb.listProfiles({ page: 1, limit: 50 }).profiles;

      const admins = allProfiles.filter((p) => p.role === 'admin');
      const founders = allProfiles.filter((p) => p.role === 'founder');
      const investors = allProfiles.filter((p) => p.role === 'investor');
      const mentors = allProfiles.filter((p) => p.role === 'mentor');
      const incubators = allProfiles.filter((p) => p.role === 'incubator');

      expect(admins).toHaveLength(1);
      expect(founders).toHaveLength(3);
      expect(investors).toHaveLength(3);
      expect(mentors).toHaveLength(2);
      expect(incubators).toHaveLength(2);
    });

    it('seeds 5 startups, including an AgriTech MVP in Punjab asking 15 Lakh INR', async () => {
      const startups = inMemoryDb.listStartups();
      expect(startups).toHaveLength(5);

      // Verify AgriTech MVP in Punjab asking 15 Lakh INR (FarmSense)
      const punjabAgriTech = startups.find(
        (s) =>
          s.sector === 'AgriTech' &&
          s.stage === 'mvp' &&
          s.location.includes('Punjab') &&
          s.funding_ask === 1500000
      );

      expect(punjabAgriTech).toBeDefined();
      expect(punjabAgriTech?.name).toBe('FarmSense');
      expect(punjabAgriTech?.currency).toBe('INR');
      expect(punjabAgriTech?.founder_id).toBe('f0000000-0000-0000-0000-000000000001');
    });

    it('seeds incubator programs and applications with relational integrity', async () => {
      const programs = Array.from(inMemoryDb.incubatorPrograms.values());
      expect(programs.length).toBeGreaterThanOrEqual(3);

      const applications = Array.from(inMemoryDb.applications.values());
      expect(applications.length).toBeGreaterThanOrEqual(2);

      // Verify the FarmSense application to Campus Founders Fellowship
      const farmSenseApp = applications.find(
        (a) => a.startup_id === 'e0000000-0000-0000-0000-000000000001'
      );
      expect(farmSenseApp).toBeDefined();
      expect(farmSenseApp?.status).toBe('under_review');
    });
  });

  describe('2. Constraint Tests', () => {
    it('enforces check_ticket_range: ticket_min <= ticket_max', () => {
      const validProfile = {
        user_id: 'b0000000-0000-0000-0000-000000000001',
        ticket_size_min: 1000000,
        ticket_size_max: 5000000,
      };

      expect(() =>
        inMemoryDb.saveInvestorProfile(validProfile as any)
      ).not.toThrow();

      const invalidProfile = {
        user_id: 'b0000000-0000-0000-0000-000000000001',
        ticket_size_min: 8000000, // min > max
        ticket_size_max: 2000000,
      };

      expect(() =>
        inMemoryDb.saveInvestorProfile(invalidProfile as any)
      ).toThrowError(/check_ticket_range/);
    });

    it('enforces unique_program_startup_application: one application per startup per program', () => {
      const duplicateApp: Application = {
        id: 'b9999999-0000-0000-0000-000000000099',
        program_id: '90000000-0000-0000-0000-000000000001', // already applied by e0000000-0000-0000-0000-000000000001
        startup_id: 'e0000000-0000-0000-0000-000000000001',
        founder_id: 'f0000000-0000-0000-0000-000000000001',
        pitch_summary: 'Duplicate second application attempt',
        status: 'submitted',
        decision_notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(() => inMemoryDb.createApplication(duplicateApp)).toThrowError(
        /unique_program_startup_application/
      );
    });

    it('enforces unique_watchlist_entry: cannot add same startup to watchlist twice', () => {
      const duplicateWatchlist: WatchlistEntry = {
        id: 'w9999999-0000-0000-0000-000000000099',
        investor_id: 'b0000000-0000-0000-0000-000000000001', // already watchlisted e0000000-0000-0000-0000-000000000001
        startup_id: 'e0000000-0000-0000-0000-000000000001',
        created_at: new Date().toISOString(),
      };

      expect(() => inMemoryDb.addToWatchlist(duplicateWatchlist)).toThrowError(
        /unique_watchlist_entry/
      );
    });

    it('enforces check_messages_distinct_users: sender cannot message self', () => {
      const selfMessage: Message = {
        id: 'x9999999-0000-0000-0000-000000000099',
        sender_id: 'f0000000-0000-0000-0000-000000000001',
        recipient_id: 'f0000000-0000-0000-0000-000000000001',
        content: 'Note to self',
        read_at: null,
        created_at: new Date().toISOString(),
      };

      expect(() => inMemoryDb.sendMessage(selfMessage)).toThrowError(
        /check_messages_distinct_users/
      );
    });

    it('enforces check_rating_range: mentor feedback rating must be 1 to 5', () => {
      const invalidFeedback: MentorFeedback = {
        id: 'mf999999-0000-0000-0000-000000000099',
        mentorship_request_id: 'mr000000-0000-0000-0000-000000000001',
        mentor_id: 'd0000000-0000-0000-0000-000000000001',
        startup_id: 'e0000000-0000-0000-0000-000000000001',
        feedback: 'Excellent work',
        rating: 6, // invalid > 5
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(() => inMemoryDb.addMentorFeedback(invalidFeedback)).toThrowError(
        /check_rating_range/
      );
    });
  });

  describe('3. Row Level Security (RLS) Policy Tests', () => {
    it('user A cannot read user B private investor notes; owner and admin succeed', () => {
      const noteOwnerId = 'b0000000-0000-0000-0000-000000000001'; // Investor 1 (Northstar)
      const otherUserId = 'b0000000-0000-0000-0000-000000000002'; // Investor 2 (Blue Horizon)
      const adminId = 'a0000000-0000-0000-0000-000000000001';

      const note = inMemoryDb.investorNotes.get('a2000000-0000-0000-0000-000000000001')!;
      expect(note).toBeDefined();

      // Owner can read
      expect(inMemoryDb.canReadInvestorNote(noteOwnerId, note, 'investor')).toBe(true);

      // Other user CANNOT read
      expect(inMemoryDb.canReadInvestorNote(otherUserId, note, 'investor')).toBe(false);

      // Admin CAN read
      expect(inMemoryDb.canReadInvestorNote(adminId, note, 'admin')).toBe(true);
    });

    it('user A cannot read private messages between user B and user C; participants and admin succeed', () => {
      const senderId = 'b0000000-0000-0000-0000-000000000001';
      const recipientId = 'f0000000-0000-0000-0000-000000000001';
      const eavesdropperId = 'b0000000-0000-0000-0000-000000000002'; // Investor 2
      const adminId = 'a0000000-0000-0000-0000-000000000001';

      const msg = inMemoryDb.messages.get('a3000000-0000-0000-0000-000000000001')!;
      expect(msg).toBeDefined();

      // Participants can read
      expect(inMemoryDb.canReadMessage(senderId, msg, 'investor')).toBe(true);
      expect(inMemoryDb.canReadMessage(recipientId, msg, 'founder')).toBe(true);

      // Non-participant CANNOT read
      expect(inMemoryDb.canReadMessage(eavesdropperId, msg, 'investor')).toBe(false);

      // Admin CAN read
      expect(inMemoryDb.canReadMessage(adminId, msg, 'admin')).toBe(true);
    });

    it('unauthorized user cannot read private startups; founder and admin succeed', () => {
      const privateStartup: Startup = {
        id: 's-private-001',
        founder_id: 'f0000000-0000-0000-0000-000000000001',
        name: 'Stealth AgriTech',
        tagline: 'Proprietary gene editing',
        description: 'Classified R&D project',
        sector: 'AgriTech',
        stage: 'idea',
        location: 'Ludhiana, India',
        funding_ask: 5000000,
        currency: 'INR',
        visibility: 'private',
        pitch_deck_url: null,
        website: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      inMemoryDb.createStartup(privateStartup);

      const founderId = 'f0000000-0000-0000-0000-000000000001';
      const otherFounderId = 'f0000000-0000-0000-0000-000000000002';
      const otherInvestorId = 'b0000000-0000-0000-0000-000000000002';
      const adminId = 'a0000000-0000-0000-0000-000000000001';

      // Founder can read own private startup
      expect(inMemoryDb.canReadStartup(founderId, privateStartup, 'founder')).toBe(true);

      // Other founder CANNOT read
      expect(inMemoryDb.canReadStartup(otherFounderId, privateStartup, 'founder')).toBe(false);

      // Other investor CANNOT read
      expect(inMemoryDb.canReadStartup(otherInvestorId, privateStartup, 'investor')).toBe(false);

      // Admin CAN read
      expect(inMemoryDb.canReadStartup(adminId, privateStartup, 'admin')).toBe(true);
    });

    it('user A cannot read user B private watchlist', () => {
      const watchlistEntry = inMemoryDb.watchlist.get('a1000000-0000-0000-0000-000000000001')!;
      expect(watchlistEntry).toBeDefined();

      const ownerId = 'b0000000-0000-0000-0000-000000000001';
      const strangerId = 'b0000000-0000-0000-0000-000000000002';
      const adminId = 'a0000000-0000-0000-0000-000000000001';

      expect(inMemoryDb.canReadWatchlist(ownerId, watchlistEntry, 'investor')).toBe(true);
      expect(inMemoryDb.canReadWatchlist(strangerId, watchlistEntry, 'investor')).toBe(false);
      expect(inMemoryDb.canReadWatchlist(adminId, watchlistEntry, 'admin')).toBe(true);
    });
  });
});
