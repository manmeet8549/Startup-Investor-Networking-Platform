// Founders Den MVP - Database Schema TypeScript Types
// Generated from Supabase PostgreSQL Schema (Migration 0001, 0002, 0003)

export type UserRole = 'founder' | 'investor' | 'mentor' | 'incubator' | 'admin';
export type UserStatus = 'active' | 'suspended';
export type VerificationStatus = 'pending' | 'approved' | 'verified' | 'rejected' | 'suspended';
export type StartupStage = 'idea' | 'validation' | 'mvp' | 'early_traction' | 'growth';
export type Visibility = 'public' | 'access_controlled' | 'private';
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'accepted' | 'declined' | 'cancelled';
export type PipelineStatus = 'interested' | 'meeting_requested' | 'in_discussion' | 'passed' | 'follow_up';
export type ApplicationStatus = 'submitted' | 'under_review' | 'shortlisted' | 'accepted' | 'rejected';

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

export interface FounderProfile {
  user_id: string;
  headline: string | null;
  linkedin_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvestorProfile {
  user_id: string;
  sectors: string[];
  stages: string[];
  ticket_min: number;
  ticket_max: number;
  regions: string[];
  business_models: string[];
  thesis: string | null;
  firm_name: string | null;
  accredited: boolean;
  created_at: string;
  updated_at: string;
}

export interface MentorProfile {
  user_id: string;
  expertise: string[];
  experience: number;
  linkedin_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncubatorProfile {
  user_id: string;
  organization_name: string | null;
  website: string | null;
  focus_sectors: string[];
  cohort_size: number;
  created_at: string;
  updated_at: string;
}

export interface Startup {
  id: string;
  founder_id: string;
  name: string;
  tagline: string;
  description: string;
  sector: string;
  sectors?: string[];
  stage: StartupStage;
  location: string;
  funding_ask: number;
  currency: string;
  visibility: Visibility;
  logo?: string | null;
  problem?: string | null;
  solution?: string | null;
  target_market?: string | null;
  business_model?: string | null;
  pitch_deck_url: string | null;
  website: string | null;
  is_hidden?: boolean;
  tsv?: string;
  profile_completeness?: number;
  created_at: string;
  updated_at: string;
}

export interface StartupTeamMember {
  id: string;
  startup_id: string;
  user_id: string | null;
  name: string;
  role_title: string;
  email: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  startup_id: string;
  uploader_id: string;
  title: string;
  file_path: string;
  file_type: string;
  file_size: number;
  version: number;
  visibility: Visibility;
  created_at: string;
  updated_at: string;
}

export interface DocumentAccessRequest {
  id: string;
  document_id: string;
  requester_id: string;
  startup_id: string;
  status: RequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WatchlistEntry {
  id: string;
  investor_id: string;
  startup_id: string;
  created_at: string;
}

export interface InvestorNote {
  id: string;
  investor_id: string;
  startup_id: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface InvestorStartupStatus {
  id: string;
  investor_id: string;
  startup_id: string;
  status: PipelineStatus;
  created_at: string;
  updated_at: string;
}

export interface PipelineHistory {
  id: string;
  investor_id: string;
  startup_id: string;
  from_status: PipelineStatus | null;
  to_status: PipelineStatus;
  notes: string | null;
  created_at: string;
}

export interface PitchRequest {
  id: string;
  startup_id: string;
  investor_id: string;
  status: RequestStatus;
  proposed_date?: string | null;
  message?: string | null;
  counter_date?: string | null;
  response_message?: string | null;
  pitch_deck_url?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PitchRequestMessage {
  id: string;
  pitch_request_id: string;
  sender_id: string;
  message_type: 'info_request' | 'info_response' | 'general';
  content: string;
  created_at: string;
}

export interface Connection {
  id: string;
  user_a_id: string;
  user_b_id: string;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

export interface MentorshipRequest {
  id: string;
  founder_id: string;
  mentor_id: string;
  startup_id: string | null;
  topic: string;
  message: string;
  status: RequestStatus;
  response_note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MentorFeedback {
  id: string;
  mentorship_request_id?: string | null;
  mentor_id: string;
  startup_id: string;
  feedback: string;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface IncubatorProgram {
  id: string;
  incubator_id: string;
  name: string;
  title?: string;
  description: string;
  eligibility?: string;
  benefits: string;
  sectors: string[];
  stages: string[];
  deadline: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  program_id: string;
  startup_id: string;
  founder_id: string;
  pitch_summary: string | null;
  status: ApplicationStatus;
  decision_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  payload?: Record<string, unknown>;
  link: string | null;
  read: boolean;
  is_read?: boolean;
  created_at: string;
}

export interface MatchScore {
  id: string;
  investor_id: string;
  startup_id: string;
  overall_score: number;
  sector_score: number;
  stage_score: number;
  funding_score: number;
  location_score: number;
  model_score: number;
  reasons?: string[];
  breakdown?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  status: RequestStatus;
  reviewed_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
