import { inMemoryDb } from '../db/index.js';
import type { InvestorProfile, MentorProfile, IncubatorProfile } from '../db/types.js';
import type {
  FounderProfileUpdateInput,
  InvestorProfileUpdateInput,
  MentorProfileUpdateInput,
  IncubatorProfileUpdateInput,
} from '../schemas/role-profile.schema.js';
import * as profileService from './profile.service.js';

export async function getFounderProfile(userId: string) {
  const profile = await profileService.getProfile(userId);
  return {
    user_id: profile.id,
    full_name: profile.full_name,
    is_student: profile.is_student,
    organization: profile.organization,
    bio: profile.bio,
    location: profile.location,
    website: profile.website,
    verification_status: profile.verification_status,
  };
}

export async function putFounderProfile(userId: string, input: FounderProfileUpdateInput) {
  const updated = await profileService.updateProfile(userId, input);
  return {
    user_id: updated.id,
    full_name: updated.full_name,
    is_student: updated.is_student,
    organization: updated.organization,
    bio: updated.bio,
    location: updated.location,
    website: updated.website,
    verification_status: updated.verification_status,
  };
}

export async function getInvestorProfile(userId: string): Promise<InvestorProfile> {
  let inv = inMemoryDb.getInvestorProfile(userId);
  if (!inv) {
    const profile = await profileService.getProfile(userId);
    inv = inMemoryDb.saveInvestorProfile({
      user_id: profile.id,
      investment_thesis: profile.bio,
      ticket_size_min: 0,
      ticket_size_max: 0,
      preferred_sectors: [],
      preferred_stages: [],
      preferred_locations: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
  return inv;
}

export async function putInvestorProfile(
  userId: string,
  input: InvestorProfileUpdateInput
): Promise<InvestorProfile> {
  const current = await getInvestorProfile(userId);
  const updated: InvestorProfile = {
    ...current,
    investment_thesis: input.investment_thesis !== undefined ? input.investment_thesis : current.investment_thesis,
    ticket_size_min: input.ticket_size_min !== undefined ? input.ticket_size_min : current.ticket_size_min,
    ticket_size_max: input.ticket_size_max !== undefined ? input.ticket_size_max : current.ticket_size_max,
    preferred_sectors: input.preferred_sectors !== undefined ? input.preferred_sectors : current.preferred_sectors,
    preferred_stages: input.preferred_stages !== undefined ? input.preferred_stages : current.preferred_stages,
    preferred_locations: input.preferred_locations !== undefined ? input.preferred_locations : current.preferred_locations,
    updated_at: new Date().toISOString(),
  };
  return inMemoryDb.saveInvestorProfile(updated);
}

export async function getMentorProfile(userId: string): Promise<MentorProfile> {
  let men = inMemoryDb.getMentorProfile(userId);
  if (!men) {
    const profile = await profileService.getProfile(userId);
    men = inMemoryDb.saveMentorProfile({
      user_id: profile.id,
      expertise_areas: [],
      years_of_experience: 0,
      mentoring_topics: [],
      linkedin_url: profile.website,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
  return men;
}

export async function putMentorProfile(
  userId: string,
  input: MentorProfileUpdateInput
): Promise<MentorProfile> {
  const current = await getMentorProfile(userId);
  const updated: MentorProfile = {
    ...current,
    expertise_areas: input.expertise_areas !== undefined ? input.expertise_areas : current.expertise_areas,
    years_of_experience: input.years_of_experience !== undefined ? input.years_of_experience : current.years_of_experience,
    mentoring_topics: input.mentoring_topics !== undefined ? input.mentoring_topics : current.mentoring_topics,
    linkedin_url: input.linkedin_url !== undefined ? input.linkedin_url : current.linkedin_url,
    updated_at: new Date().toISOString(),
  };
  return inMemoryDb.saveMentorProfile(updated);
}

export async function getIncubatorProfile(userId: string): Promise<IncubatorProfile> {
  let inc = inMemoryDb.getIncubatorProfile(userId);
  if (!inc) {
    const profile = await profileService.getProfile(userId);
    inc = inMemoryDb.saveIncubatorProfile({
      user_id: profile.id,
      organization_name: profile.organization || profile.full_name,
      website: profile.website,
      program_types: [],
      cohort_size: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
  return inc;
}

export async function putIncubatorProfile(
  userId: string,
  input: IncubatorProfileUpdateInput
): Promise<IncubatorProfile> {
  const current = await getIncubatorProfile(userId);
  const updated: IncubatorProfile = {
    ...current,
    organization_name: input.organization_name !== undefined ? input.organization_name : current.organization_name,
    website: input.website !== undefined ? input.website : current.website,
    program_types: input.program_types !== undefined ? input.program_types : current.program_types,
    cohort_size: input.cohort_size !== undefined ? input.cohort_size : current.cohort_size,
    updated_at: new Date().toISOString(),
  };
  return inMemoryDb.saveIncubatorProfile(updated);
}
