export type UserRole = 'founder' | 'investor' | 'mentor' | 'incubator' | 'admin';
export type UserStatus = 'active' | 'suspended';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_student: boolean;
  organization: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  status: UserStatus;
  verification_status: VerificationStatus;
  created_at: string;
  updated_at: string;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  role_requested: UserRole;
  organization: string | null;
  supporting_notes: string | null;
  status: VerificationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvestorProfile {
  user_id: string;
  firm_name?: string | null;
  sectors?: string[];
  stages?: string[];
  ticket_min?: number;
  ticket_max?: number;
  regions?: string[];
  business_models?: string[];
  thesis?: string | null;
  accredited?: boolean;
  investment_thesis?: string | null;
  ticket_size_min?: number;
  ticket_size_max?: number;
  preferred_sectors?: string[];
  preferred_stages?: string[];
  preferred_locations?: string[];
  created_at: string;
  updated_at: string;
}

export interface MentorProfile {
  user_id: string;
  expertise_areas?: string[];
  years_of_experience?: number;
  expertise?: string[];
  experience?: number;
  bio?: string;
  mentoring_topics?: string[];
  linkedin_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncubatorProfile {
  user_id: string;
  organization_name: string | null;
  website: string | null;
  program_types: string[];
  cohort_size: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  admin_id?: string | null;
  actor_id?: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}
