// Founders Den MVP - Canonical Seed Data
// Iteration 2: 1 Admin, 3 Founders, 5 Startups, 3 Investors, 2 Mentors, 2 Incubators with Programs

import type {
  Profile,
  FounderProfile,
  InvestorProfile,
  MentorProfile,
  IncubatorProfile,
  Startup,
  StartupTeamMember,
  IncubatorProgram,
  Application,
  Document,
  WatchlistEntry,
  InvestorNote,
  Message,
} from './schema.types.js';

// 1. PROFILES
export const seedProfiles: Profile[] = [
  // Admin (1)
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    email: 'admin@foundersden.test',
    full_name: 'Platform Admin',
    role: 'admin',
    is_student: false,
    organization: 'Founders Den Moderation',
    avatar_url: null,
    bio: 'Platform administration, verification queues, and ecosystem moderation.',
    location: 'Global',
    website: 'https://foundersden.network',
    status: 'active',
    verification_status: 'verified',
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-01T10:00:00Z',
  },

  // Founders (3)
  {
    id: 'f0000000-0000-0000-0000-000000000001',
    email: 'manmeet@foundersden.test',
    full_name: 'Manmeet Singh',
    role: 'founder',
    is_student: true, // Student Innovator in Punjab
    organization: 'FarmSense Innovations',
    avatar_url: null,
    bio: 'Student innovator building digital agricultural intelligence for smallholder farmers.',
    location: 'Ludhiana, Punjab, India',
    website: 'https://farmsense.example.com',
    status: 'active',
    verification_status: 'verified',
    created_at: '2026-10-18T10:00:00Z',
    updated_at: '2026-10-18T10:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000002',
    email: 'riya@foundersden.test',
    full_name: 'Riya Kapoor',
    role: 'founder',
    is_student: false,
    organization: 'Medora AI',
    avatar_url: null,
    bio: 'HealthTech founder using clinical NLP to identify early patient follow-up signals.',
    location: 'Delhi, India',
    website: 'https://medora.example.com',
    status: 'active',
    verification_status: 'verified',
    created_at: '2026-10-11T10:00:00Z',
    updated_at: '2026-10-11T10:00:00Z',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000003',
    email: 'arun@foundersden.test',
    full_name: 'Arun Verma',
    role: 'founder',
    is_student: false,
    organization: 'TerraLoop Tech',
    avatar_url: null,
    bio: 'Circular economy materials engineer converting stubble and biomass into biopolymers.',
    location: 'Chandigarh, Punjab, India',
    website: 'https://terraloop.example.com',
    status: 'active',
    verification_status: 'verified',
    created_at: '2026-10-15T10:00:00Z',
    updated_at: '2026-10-15T10:00:00Z',
  },

  // Investors (3)
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    email: 'northstar@foundersden.test',
    full_name: 'Northstar Ventures',
    role: 'investor',
    is_student: false,
    organization: 'Northstar Ventures Fund I',
    avatar_url: null,
    bio: 'Early-stage institutional fund backing AgriTech, Climate Tech, and applied B2B AI.',
    location: 'Mumbai, India',
    website: 'https://northstar.example.com',
    status: 'active',
    verification_status: 'verified',
    created_at: '2026-10-20T10:00:00Z',
    updated_at: '2026-10-20T10:00:00Z',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    email: 'blueseeds@foundersden.test',
    full_name: 'Blue Horizon Capital',
    role: 'investor',
    is_student: false,
    organization: 'Blue Horizon Capital',
    avatar_url: null,
    bio: 'Pre-seed and seed stage fund investing across EdTech, FinTech, and SMB SaaS.',
    location: 'Bengaluru, India',
    website: 'https://bluehorizon.example.com',
    status: 'active',
    verification_status: 'verified',
    created_at: '2026-10-21T10:00:00Z',
    updated_at: '2026-10-21T10:00:00Z',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000003',
    email: 'launchpad@foundersden.test',
    full_name: 'Launchpad Angels',
    role: 'investor',
    is_student: false,
    organization: 'Launchpad Angel Syndicate',
    avatar_url: null,
    bio: 'Syndicate of exited founders investing ₹5L–₹25L in early health and AI innovators.',
    location: 'New Delhi, India',
    website: 'https://launchpadangels.example.com',
    status: 'active',
    verification_status: 'verified',
    created_at: '2026-10-22T10:00:00Z',
    updated_at: '2026-10-22T10:00:00Z',
  },

  // Mentors (2)
  {
    id: 'd0000000-0000-0000-0000-000000000001',
    email: 'kavita@foundersden.test',
    full_name: 'Dr. Kavita Mehra',
    role: 'mentor',
    is_student: false,
    organization: 'Agri-Business Strategy Advisory',
    avatar_url: null,
    bio: 'Former ICAR researcher with 12 years advising AgriTech and deep science founders.',
    location: 'Chandigarh, Punjab, India',
    website: 'https://kavitamehra.example.com',
    status: 'active',
    verification_status: 'verified',
    created_at: '2026-10-23T10:00:00Z',
    updated_at: '2026-10-23T10:00:00Z',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000002',
    email: 'arjun@foundersden.test',
    full_name: 'Arjun Bedi',
    role: 'mentor',
    is_student: false,
    organization: 'ScaleSprint Advisors',
    avatar_url: null,
    bio: 'Product leader & growth mentor helping B2B and climate teams establish repeatable sales.',
    location: 'Gurugram, India',
    website: 'https://arjunbedi.example.com',
    status: 'active',
    verification_status: 'verified',
    created_at: '2026-10-23T11:00:00Z',
    updated_at: '2026-10-23T11:00:00Z',
  },

  // Incubators (2)
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    email: 'punjab@foundersden.test',
    full_name: 'Punjab Innovation Hub',
    role: 'incubator',
    is_student: false,
    organization: 'Punjab State Innovation Council',
    avatar_url: null,
    bio: 'Government and university backed incubator nurturing campus founders and agriculture innovation.',
    location: 'Mohali, Punjab, India',
    website: 'https://punjabinnovation.example.com',
    status: 'active',
    verification_status: 'verified',
    created_at: '2026-10-12T10:00:00Z',
    updated_at: '2026-10-12T10:00:00Z',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    email: 'climatex@foundersden.test',
    full_name: 'ClimateX Accelerator',
    role: 'incubator',
    is_student: false,
    organization: 'ClimateX Foundation',
    avatar_url: null,
    bio: 'Pan-India impact accelerator providing pilot grants and advisory for net-zero solutions.',
    location: 'Bengaluru, India',
    website: 'https://climatex.example.com',
    status: 'active',
    verification_status: 'verified',
    created_at: '2026-10-14T10:00:00Z',
    updated_at: '2026-10-14T10:00:00Z',
  },
];

// 2. FOUNDER PROFILES
export const seedFounderProfiles: FounderProfile[] = [
  {
    user_id: 'f0000000-0000-0000-0000-000000000001',
    headline: 'Founder @ FarmSense | Punjab Agricultural University Student Innovator',
    linkedin_url: 'https://linkedin.com/in/manmeetsingh-demo',
    bio: 'Building sensor-free, hyper-local crop advisory and market connectivity for northern farmers.',
    created_at: '2026-10-18T10:00:00Z',
    updated_at: '2026-10-18T10:00:00Z',
  },
  {
    user_id: 'f0000000-0000-0000-0000-000000000002',
    headline: 'Founder & CEO @ Medora AI | ex-AI Researcher',
    linkedin_url: 'https://linkedin.com/in/riyakapoor-demo',
    bio: 'Bridging outpatient care gaps with automated clinical communication pipelines.',
    created_at: '2026-10-11T10:00:00Z',
    updated_at: '2026-10-11T10:00:00Z',
  },
  {
    user_id: 'f0000000-0000-0000-0000-000000000003',
    headline: 'Co-Founder @ TerraLoop & SkillSpring | Sustainable Materials Pioneer',
    linkedin_url: 'https://linkedin.com/in/arunverma-demo',
    bio: 'Focusing on stubble burning prevention through circular industrial packaging.',
    created_at: '2026-10-15T10:00:00Z',
    updated_at: '2026-10-15T10:00:00Z',
  },
];

// 3. INVESTOR PROFILES (satisfying ticket_min <= ticket_max)
export const seedInvestorProfiles: InvestorProfile[] = [
  {
    user_id: 'b0000000-0000-0000-0000-000000000001',
    firm_name: 'Northstar Ventures',
    sectors: ['AgriTech', 'Climate Tech', 'AI'],
    stages: ['Pre-seed', 'Seed'],
    ticket_min: 1000000, // 10 Lakh INR
    ticket_max: 5000000, // 50 Lakh INR
    regions: ['North India', 'Punjab', 'Pan-India'],
    business_models: ['B2B', 'B2B2C', 'Marketplace'],
    thesis: 'Backing technology infrastructure and sustainable supply chains in regional India.',
    accredited: true,
    created_at: '2026-10-20T10:00:00Z',
    updated_at: '2026-10-20T10:00:00Z',
  },
  {
    user_id: 'b0000000-0000-0000-0000-000000000002',
    firm_name: 'Blue Horizon Capital',
    sectors: ['FinTech', 'EdTech', 'SaaS'],
    stages: ['Seed', 'Early traction'],
    ticket_min: 2500000, // 25 Lakh INR
    ticket_max: 20000000, // 2 Crore INR
    regions: ['India'],
    business_models: ['SaaS', 'Subscription'],
    thesis: 'Investing in high-retention software platforms empowering tier-2 SMBs and education.',
    accredited: true,
    created_at: '2026-10-21T10:00:00Z',
    updated_at: '2026-10-21T10:00:00Z',
  },
  {
    user_id: 'b0000000-0000-0000-0000-000000000003',
    firm_name: 'Launchpad Angels',
    sectors: ['HealthTech', 'AI', 'DeepTech'],
    stages: ['Idea', 'MVP'],
    ticket_min: 500000, // 5 Lakh INR
    ticket_max: 2500000, // 25 Lakh INR
    regions: ['Delhi NCR', 'Pan-India'],
    business_models: ['Direct-to-Clinic', 'B2B'],
    thesis: 'Catalytic angel capital for early engineering prototypes and university spinouts.',
    accredited: true,
    created_at: '2026-10-22T10:00:00Z',
    updated_at: '2026-10-22T10:00:00Z',
  },
];

// 4. MENTOR PROFILES
export const seedMentorProfiles: MentorProfile[] = [
  {
    user_id: 'd0000000-0000-0000-0000-000000000001',
    expertise: ['AgriTech', 'Rural Distribution', 'Grant Funding', 'Field Pilots'],
    experience: 12,
    linkedin_url: 'https://linkedin.com/in/kavitamehra-demo',
    bio: '12 years advising rural innovators and validating pilot economics in northern India.',
    created_at: '2026-10-23T10:00:00Z',
    updated_at: '2026-10-23T10:00:00Z',
  },
  {
    user_id: 'd0000000-0000-0000-0000-000000000002',
    expertise: ['SaaS Growth', 'Product Management', 'Go-to-market', 'Pricing'],
    experience: 10,
    linkedin_url: 'https://linkedin.com/in/arjunbedi-demo',
    bio: '10 years scaling enterprise B2B workflows and early tech founder mentorship.',
    created_at: '2026-10-23T11:00:00Z',
    updated_at: '2026-10-23T11:00:00Z',
  },
];

// 5. INCUBATOR PROFILES
export const seedIncubatorProfiles: IncubatorProfile[] = [
  {
    user_id: 'c0000000-0000-0000-0000-000000000001',
    organization_name: 'Punjab Innovation Hub',
    website: 'https://punjabinnovation.example.com',
    focus_sectors: ['AgriTech', 'Climate Tech', 'AI', 'Hardware'],
    cohort_size: 20,
    created_at: '2026-10-12T10:00:00Z',
    updated_at: '2026-10-12T10:00:00Z',
  },
  {
    user_id: 'c0000000-0000-0000-0000-000000000002',
    organization_name: 'ClimateX Accelerator',
    website: 'https://climatex.example.com',
    focus_sectors: ['Clean Energy', 'Circular Economy', 'Water Tech'],
    cohort_size: 15,
    created_at: '2026-10-14T10:00:00Z',
    updated_at: '2026-10-14T10:00:00Z',
  },
];

// 6. STARTUPS (3 founders with 5 startups, including AgriTech MVP in Punjab asking 15 Lakh INR)
export const seedStartups: Startup[] = [
  // Startup 1: FarmSense - AgriTech MVP in Punjab asking 15 lakh INR
  {
    id: 'e0000000-0000-0000-0000-000000000001',
    founder_id: 'f0000000-0000-0000-0000-000000000001',
    name: 'FarmSense',
    tagline: 'Practical intelligence for every farmer.',
    description: 'A multilingual farm companion combining soil intelligence, local mandi price discovery, and climate advisory for Punjab wheat and paddy cultivators.',
    sector: 'AgriTech',
    stage: 'mvp',
    location: 'Ludhiana, Punjab, India',
    funding_ask: 1500000, // 15 Lakh INR
    currency: 'INR',
    visibility: 'access_controlled',
    pitch_deck_url: 'https://storage.foundersden.network/decks/farmsense_seed.pdf',
    website: 'https://farmsense.example.com',
    created_at: '2026-10-18T10:30:00Z',
    updated_at: '2026-10-18T10:30:00Z',
  },

  // Startup 2: AgriDrone Punjab - AgriTech / Clean Energy Idea in Punjab
  {
    id: 'e0000000-0000-0000-0000-000000000002',
    founder_id: 'f0000000-0000-0000-0000-000000000001',
    name: 'AgriDrone Punjab',
    tagline: 'Precision drone spraying cooperatives.',
    description: 'Autonomous micro-drones designed for precision pesticide reduction and solar-powered charging docks in Punjab farming clusters.',
    sector: 'AgriTech',
    stage: 'idea',
    location: 'Bathinda, Punjab, India',
    funding_ask: 2500000, // 25 Lakh INR
    currency: 'INR',
    visibility: 'public',
    pitch_deck_url: null,
    website: null,
    created_at: '2026-10-19T11:00:00Z',
    updated_at: '2026-10-19T11:00:00Z',
  },

  // Startup 3: Medora AI - HealthTech Early Traction in Delhi
  {
    id: 'e0000000-0000-0000-0000-000000000003',
    founder_id: 'f0000000-0000-0000-0000-000000000002',
    name: 'Medora AI',
    tagline: 'Earlier signals. Better healthcare outcomes.',
    description: 'AI-assisted workflows that help polyclinics identify high-risk patient follow-up drop-offs and automate care pathways.',
    sector: 'HealthTech',
    stage: 'early_traction',
    location: 'Delhi, India',
    funding_ask: 4000000, // 40 Lakh INR
    currency: 'INR',
    visibility: 'public',
    pitch_deck_url: 'https://storage.foundersden.network/decks/medora_ai.pdf',
    website: 'https://medora.example.com',
    created_at: '2026-10-11T11:00:00Z',
    updated_at: '2026-10-11T11:00:00Z',
  },

  // Startup 4: TerraLoop - Climate Tech MVP in Punjab
  {
    id: 'e0000000-0000-0000-0000-000000000004',
    founder_id: 'f0000000-0000-0000-0000-000000000003',
    name: 'TerraLoop',
    tagline: 'Turning agricultural waste into high-grade packaging.',
    description: 'A circular manufacturing process that converts paddy straw into compostable packaging foam, eliminating seasonal crop residue burning.',
    sector: 'Climate Tech',
    stage: 'mvp',
    location: 'Chandigarh, Punjab, India',
    funding_ask: 2500000, // 25 Lakh INR
    currency: 'INR',
    visibility: 'access_controlled',
    pitch_deck_url: 'https://storage.foundersden.network/decks/terraloop_pilot.pdf',
    website: 'https://terraloop.example.com',
    created_at: '2026-10-15T11:00:00Z',
    updated_at: '2026-10-15T11:00:00Z',
  },

  // Startup 5: SkillSpring - EdTech Validation in Pune
  {
    id: 'e0000000-0000-0000-0000-000000000005',
    founder_id: 'f0000000-0000-0000-0000-000000000003',
    name: 'SkillSpring',
    tagline: 'Practical apprentice matching for emerging engineers.',
    description: 'Live challenge marketplace connecting engineering college graduates with verified proof-of-work tasks from early-stage tech ventures.',
    sector: 'EdTech',
    stage: 'validation',
    location: 'Pune, India',
    funding_ask: 1000000, // 10 Lakh INR
    currency: 'INR',
    visibility: 'public',
    pitch_deck_url: null,
    website: 'https://skillspring.example.com',
    created_at: '2026-10-16T12:00:00Z',
    updated_at: '2026-10-16T12:00:00Z',
  },
];

// 7. INCUBATOR PROGRAMS (2 incubators with programs)
export const seedIncubatorPrograms: IncubatorProgram[] = [
  // Incubator 1 (Punjab Innovation Hub)
  {
    id: '90000000-0000-0000-0000-000000000001',
    incubator_id: 'c0000000-0000-0000-0000-000000000001',
    name: 'Campus Founders Fellowship',
    description: 'A 6-month pre-incubation program for student innovators and campus founders across Punjab universities.',
    benefits: '₹2 Lakh prototype grant, Punjab Agri University labs access, mentor matching, and investor showcase.',
    sectors: ['AgriTech', 'Climate Tech', 'AI', 'EdTech'],
    stages: ['idea', 'validation', 'mvp'],
    deadline: '2026-11-30T23:59:59Z',
    is_active: true,
    created_at: '2026-10-13T10:00:00Z',
    updated_at: '2026-10-13T10:00:00Z',
  },
  {
    id: '90000000-0000-0000-0000-000000000002',
    incubator_id: 'c0000000-0000-0000-0000-000000000001',
    name: 'Punjab Agri-Innovation Launchpad',
    description: 'Dedicated commercialization track for tech startups modernizing Punjab farming, irrigation, and storage.',
    benefits: 'Direct corporate field trials with farm cooperatives, regulatory facilitation, and seed investor round.',
    sectors: ['AgriTech', 'Clean Energy', 'Hardware'],
    stages: ['mvp', 'early_traction'],
    deadline: '2026-12-15T23:59:59Z',
    is_active: true,
    created_at: '2026-10-13T10:30:00Z',
    updated_at: '2026-10-13T10:30:00Z',
  },

  // Incubator 2 (ClimateX Accelerator)
  {
    id: '90000000-0000-0000-0000-000000000003',
    incubator_id: 'c0000000-0000-0000-0000-000000000002',
    name: 'Net-Zero Scale Accelerator',
    description: 'Flagship acceleration program for biomass recycling, circular manufacturing, and solar innovations.',
    benefits: '₹10 Lakh non-dilutive pilot grant, industrial customer introductions, ESG certification support.',
    sectors: ['Climate Tech', 'Clean Energy'],
    stages: ['validation', 'mvp', 'early_traction'],
    deadline: '2027-01-10T23:59:59Z',
    is_active: true,
    created_at: '2026-10-15T10:00:00Z',
    updated_at: '2026-10-15T10:00:00Z',
  },
];

// 8. SAMPLE APPLICATIONS (enforcing unique pair: one application per startup per program)
export const seedApplications: Application[] = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    program_id: '90000000-0000-0000-0000-000000000001', // Campus Founders Fellowship
    startup_id: 'e0000000-0000-0000-0000-000000000001', // FarmSense
    founder_id: 'f0000000-0000-0000-0000-000000000001',
    pitch_summary: 'FarmSense offers AI soil advisory for 200+ piloted farms in Punjab; seeking fellowship grant for hardware sensor pilots.',
    status: 'under_review',
    decision_notes: 'Initial evaluation completed. Scheduled for interview.',
    created_at: '2026-10-24T10:00:00Z',
    updated_at: '2026-10-24T10:00:00Z',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    program_id: '90000000-0000-0000-0000-000000000003', // Net-Zero Scale
    startup_id: 'e0000000-0000-0000-0000-000000000004', // TerraLoop
    founder_id: 'f0000000-0000-0000-0000-000000000003',
    pitch_summary: 'Converting 50 tons of stubble biomass into packaging crates; applying for industrial testing partners.',
    status: 'shortlisted',
    decision_notes: 'Strong alignment with industrial packaging partners.',
    created_at: '2026-10-23T11:00:00Z',
    updated_at: '2026-10-23T11:00:00Z',
  },
];

// 9. SAMPLE DOCUMENTS (versioned)
export const seedDocuments: Document[] = [
  {
    id: 'd0000000-0000-0000-0000-000000000001',
    startup_id: 'e0000000-0000-0000-0000-000000000001',
    uploader_id: 'f0000000-0000-0000-0000-000000000001',
    title: 'FarmSense_Pitch_Deck_v1.pdf',
    file_path: 'startups/e0000000-0000-0000-0000-000000000001/decks/v1.pdf',
    file_type: 'application/pdf',
    file_size: 2450000,
    version: 1,
    visibility: 'access_controlled',
    created_at: '2026-10-18T12:00:00Z',
    updated_at: '2026-10-18T12:00:00Z',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000002',
    startup_id: 'e0000000-0000-0000-0000-000000000001',
    uploader_id: 'f0000000-0000-0000-0000-000000000001',
    title: 'FarmSense_Financial_Projections_Private.pdf',
    file_path: 'startups/e0000000-0000-0000-0000-000000000001/financials/v1.pdf',
    file_type: 'application/pdf',
    file_size: 840000,
    version: 1,
    visibility: 'private',
    created_at: '2026-10-20T12:00:00Z',
    updated_at: '2026-10-20T12:00:00Z',
  },
];

// 10. WATCHLIST & PRIVATE NOTES
export const seedWatchlist: WatchlistEntry[] = [
  {
    id: 'a1000000-0000-0000-0000-000000000001',
    investor_id: 'b0000000-0000-0000-0000-000000000001', // Northstar Ventures
    startup_id: 'e0000000-0000-0000-0000-000000000001',  // FarmSense
    created_at: '2026-10-25T14:00:00Z',
  },
];

export const seedInvestorNotes: InvestorNote[] = [
  {
    id: 'a2000000-0000-0000-0000-000000000001',
    investor_id: 'b0000000-0000-0000-0000-000000000001', // Northstar Ventures
    startup_id: 'e0000000-0000-0000-0000-000000000001',  // FarmSense
    note: 'Strong founder pedigree at Punjab Agri University. Pilot metrics in Ludhiana show 18% cost reduction for wheat farmers. Follow up for Series Seed discussion.',
    created_at: '2026-10-25T14:05:00Z',
    updated_at: '2026-10-25T14:05:00Z',
  },
];

// 11. MESSAGES (Participants only)
export const seedMessages: Message[] = [
  {
    id: 'a3000000-0000-0000-0000-000000000001',
    sender_id: 'b0000000-0000-0000-0000-000000000001', // Northstar Ventures
    recipient_id: 'f0000000-0000-0000-0000-000000000001', // Manmeet Singh
    content: 'Hi Manmeet, we reviewed your FarmSense overview and would like to learn more about your pilot numbers in Ludhiana.',
    read_at: '2026-10-25T15:00:00Z',
    created_at: '2026-10-25T14:30:00Z',
  },
  {
    id: 'a3000000-0000-0000-0000-000000000002',
    sender_id: 'f0000000-0000-0000-0000-000000000001',
    recipient_id: 'b0000000-0000-0000-0000-000000000001',
    content: 'Thank you for reaching out! Happy to share our 200-farm pilot data and discuss our ₹15L seed round.',
    read_at: null,
    created_at: '2026-10-25T15:15:00Z',
  },
];
