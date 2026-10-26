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
