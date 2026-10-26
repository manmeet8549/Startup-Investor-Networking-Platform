# Founders Den — Clickable MVP Prototype

A responsive Next.js + TypeScript + Tailwind CSS prototype covering the public website and all five role-based portals in the supplied MVP scope.

## Included
- Public landing page, Explore Startups, How It Works, For Founders, For Investors
- Founder portal: dashboard, startup profile, pitch documents/access requests, investor matches, investors, mentors, incubators/applications, messages, settings
- Investor portal: dashboard, startup discovery/recommendations, watchlist and notes, pipeline, meeting requests, messages, investment preferences, settings
- Mentor portal: dashboard, expertise profile, mentorship requests, startups to review, messages, settings
- Incubator portal: dashboard, program management, application review, startup discovery, messages, settings
- Admin portal: dashboard, verification queue, users, startup listings, reported content, settings
- Search and filters, weighted-match explanation, mock connection/access/meeting/application flows, notification popover, role switcher, profile/program forms
- Responsive layout and demo data

## Run locally
Requires Node.js 18+.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Important prototype boundary
This is a front-end interactive prototype with in-memory sample data. Authentication, file uploads, approval decisions, messaging, and records are simulated in the browser; they are **not persisted** and no credentials are stored. The Supabase client dependency is included as a planned integration point, but no Supabase project or environment keys are configured.

## Production integration checklist
1. Create a Supabase project and configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. Add SQL migrations for profiles, startups, startup_members, pitch_decks, investor_profiles, connections, pitch_requests, mentorship_requests, incubator_programs, incubator_applications, conversations, messages, notifications, and reports.
3. Enforce Row Level Security and server-side role checks; do not rely on client role selection for authorization.
4. Use private storage buckets and signed URLs for access-controlled pitch decks. Validate MIME type, file size, ownership, and access approval on the server.
5. Replace demo actions and arrays with authenticated Supabase queries and mutations.
6. Add email verification, password reset, admin approval workflow, rate limits, audit logs, and error handling.
7. Add tests for role boundaries, document access, application states, and messaging permissions.

## Design direction
Minimalist, workspace-first SaaS interface; forest-green accent palette; responsive sidebar; distinct role-specific navigation; neutral surfaces and accessible contrast.


## Figma redesign

A new Figma design file was created from the supplied references, with seven desktop frames: public landing page, startup discovery, founder portal, investor portal, mentor portal, incubator portal, and admin portal.

Open the editable Figma design: https://www.figma.com/design/GfhJYMDRNp16ntsFpwM7EL

The visual direction uses editorial monochrome surfaces, large typography, rounded white panels, tactile black pill controls, soft shadows, and a restrained orange accent. The source frontend remains a clickable Next.js demo; backend integrations require Supabase setup.
