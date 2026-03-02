# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FootyFinder 2.0 is a React/TypeScript web application for football (soccer) matchmaking. Players can find matches, create teams, join lobbies, and manage their football activities. The app supports both individual players and team captains with different dashboards and capabilities.

The backend is a fully operational Express + SQLite (sql.js) server running on the same dev port via Vite proxy. All features are wired end-to-end: frontend React → `frontend/api/` HTTP client → Express routes → SQLite DB.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (http://localhost:3000 — frontend + backend via Vite proxy)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Setup

Create a `.env.local` file in the root directory with:
```
GEMINI_API_KEY=your_api_key_here
```

## Project Structure

```
FootyFinder-2.0/
├── index.html              # HTML entry point
├── index.tsx               # React app entry point
├── App.tsx                 # Main app component with all state and routing
├── types.ts                # TypeScript type definitions and enums
├── constants.ts            # App-level constants (APP_LOGO_URL only)
├── vite.config.ts          # Vite configuration (also proxies /api → Express)
├── tsconfig.json           # TypeScript configuration
├── package.json            # Dependencies and scripts
├── .env.local              # Environment variables (not in repo)
│
├── services/               # Legacy in-memory data layer (superseded by server)
│   ├── index.ts
│   ├── database.ts         # In-memory data store (DataStore interfaces)
│   ├── seed.ts             # seedDatabase() — still used for field/lobby seed shapes
│   ├── walletService.ts    # Wallet operations (legacy, now backend handles this)
│   └── lobbyService.ts     # Lobby operations (legacy)
│
├── features/               # Feature-based modules (pages + feature components)
│   ├── auth/               # Authentication (Login, CreateProfile)
│   │   ├── index.ts
│   │   └── pages/
│   │       ├── Login.tsx
│   │       └── CreateProfile.tsx      # Registration: face photo required, sends base64 avatar
│   │
│   ├── home/               # Home/landing page
│   │   ├── index.ts
│   │   └── pages/
│   │       └── Home.tsx
│   │
│   ├── profile/            # User profile, wallet, live stats, ID verification
│   │   ├── index.ts
│   │   └── pages/
│   │       └── Profile.tsx            # Live stats via getMyStats(), age calc, verify ID card
│   │
│   ├── dashboard/          # Captain & Player dashboards
│   │   ├── index.ts
│   │   ├── pages/
│   │   │   ├── CaptainsDashboard.tsx
│   │   │   └── PlayerDashboard.tsx
│   │   └── components/
│   │       ├── CaptainsDashboardUI.tsx
│   │       └── PlayerDashboardUI.tsx
│   │
│   ├── matchmaking/        # Match lobbies & post-match reports
│   │   ├── index.ts
│   │   ├── pages/
│   │   │   ├── Matchmaking.tsx        # Lobby fetch, competing lobbies mapped
│   │   │   └── PostMatchReport.tsx
│   │   └── components/
│   │       └── MatchmakingUI.tsx      # CONTESTED badge for competing lobbies
│   │
│   ├── training/           # Training sessions
│   │   ├── index.ts
│   │   ├── pages/
│   │   │   └── Training.tsx
│   │   └── components/
│   │       └── TrainingUI.tsx
│   │
│   ├── team/               # Team creation & profile
│   │   ├── index.ts
│   │   ├── pages/
│   │   │   ├── CreateTeam.tsx
│   │   │   └── TeamProfile.tsx
│   │   └── components/
│   │       ├── CreateTeamUI.tsx
│   │       └── TeamProfileUI.tsx
│   │
│   ├── social/             # Social/friends, DMs, player profiles
│   │   ├── index.ts
│   │   ├── pages/
│   │   │   ├── Social.tsx             # Friends, Discover, Messages tabs + onViewProfile
│   │   │   └── PlayerProfilePage.tsx  # Read-only public profile (stats, bio, W/D/L)
│   │   └── components/
│   │       └── SocialUI.tsx           # Clickable avatars/names, DM button, conversations list
│   │
│   └── notifications/      # In-app notification center
│       ├── index.ts
│       └── pages/
│           └── NotificationsPage.tsx  # Bell-driven page, grouped Today/Yesterday/Earlier
│
├── components/             # Shared & reusable components
│   ├── shared/
│   │   ├── index.ts
│   │   ├── ui/
│   │   │   ├── index.ts
│   │   │   ├── Navigation.tsx         # Bell icon with unread badge, notificationCount prop
│   │   │   ├── Logo.tsx
│   │   │   ├── TabPanel.tsx
│   │   │   ├── SearchInput.tsx
│   │   │   ├── StatCard.tsx
│   │   │   └── EmptyState.tsx
│   │   ├── modals/
│   │   │   ├── index.ts
│   │   │   ├── Modal.tsx
│   │   │   ├── PaymentModal.tsx
│   │   │   └── FundingModal.tsx
│   │   └── forms/
│   │       ├── index.ts
│   │       └── NumberCounter.tsx
│   │
│   └── domain/
│       ├── index.ts
│       ├── TacticalPitch.tsx
│       ├── LobbyChat.tsx
│       └── FieldCard.tsx
│
├── server/                 # Fully operational Express + SQLite backend
│   ├── index.ts            # Express server — registers all routers under /api
│   ├── db/
│   │   ├── schema.sql      # SQLite table definitions (authoritative schema)
│   │   ├── seed.sql        # Initial field/timetable data inserts
│   │   ├── database.ts     # sql.js wrapper + migrations array (run on startup)
│   │   └── footy.db        # SQLite database file (gitignored)
│   ├── routes/
│   │   ├── auth.ts         # POST /register (avatarBase64, dateOfBirth, yearsPlaying), POST /login
│   │   ├── users.ts        # GET+PUT /me, POST /me/verify-id, GET /:id, GET /:id/match-stats,
│   │   │                   # GET /:id/training-stats, GET /:id/reviews
│   │   ├── teams.ts        # Team CRUD, membership, DELETE /:id (captain), notification triggers
│   │   ├── lobbies.ts      # Lobby CRUD, competing lobbies (awardLobby), formation endpoints
│   │   ├── matches.ts      # Match history, POST /report, GET /stats/me (with cleanSheets)
│   │   ├── fields.ts       # Field listings & timetables
│   │   ├── payments.ts     # Wallet load, escrow, transactions
│   │   ├── social.ts       # Friends, discover profiles, notification triggers
│   │   ├── messages.ts     # DM conversations, send/accept/decline message requests
│   │   └── notifications.ts # GET /notifications, mark read, createNotification() helper
│   ├── middleware/
│   │   └── auth.ts         # JWT auth middleware (authenticate, AuthRequest)
│   └── utils/
│       ├── paystack.ts     # Paystack payment gateway integration
│       └── splits.ts       # Payment split logic
│
├── shared/
│   └── types.ts            # Shared types (future)
│
└── frontend/               # Frontend API client layer
    └── api/
        ├── index.ts        # Barrel export for all API functions
        ├── client.ts       # Base HTTP client (fetch wrapper with JWT header)
        ├── auth.ts         # register(), login(), logout(), getToken(), isLoggedIn()
        ├── teams.ts        # getTeams(), createTeam(), deleteTeam(), saveTeamLayout(), etc.
        ├── lobbies.ts      # getLobbies(), createLobby(), joinLobby(), payLobby(), etc.
        ├── payments.ts     # loadWallet(), getWallet(), etc.
        ├── messages.ts     # getConversations(), getDMs(), sendDM(), accept/declineRequest()
        └── notifications.ts # getNotifications(), markNotificationRead(), markAllRead()
```

## Architecture Overview

### Application Structure

- **App.tsx**: Central orchestrator — all React state, routing logic, and callback handlers
  - `currentPage` union type drives `renderPage()` switch
  - `navigate(page, params?)` is the custom router (no React Router)
  - State: `userProfile`, `userTeam`, `userTeams[]`, `userRole`, `activeLobbies`, `notifications`, `conversations`, etc.
  - `applyAuthUser()` maps auth response → userProfile (sets id, fullName, position, fitnessLevel, dateOfBirth, yearsPlaying, avatarUrl, isVerified)
  - Session restore on startup via `GET /api/users/me`

- **server/**: Fully operational Express server (NOT scaffolds)
  - Entry: `server/index.ts` — mounts all routers, serves static build in production
  - Database: `server/db/database.ts` — sql.js wrapper; migrations array runs on every startup (idempotent)
  - Auth: JWT tokens stored in `localStorage` as `footyfinder_token`

- **frontend/api/**: HTTP client layer
  - `client.ts` base: attaches `Authorization: Bearer <token>` to every request
  - Each file exports typed async functions matching the server route shape

### State Management

- All state in App.tsx (no external library)
- Props drill down, callbacks drill up
- Key state:
  - `userProfile`: id, fullName, position, fitnessLevel, dateOfBirth, yearsPlaying, avatarUrl, isVerified, wallet, stats, friends
  - `userTeam` / `userTeams[]`: active team + all teams user belongs to
  - `userRole`: `'PLAYER'` | `'CAPTAIN'`
  - `activeLobbies`: match lobbies from API
  - `notifications`: `AppNotification[]` — fetched after login
  - `conversations`: `DMConversation[]`

### Database Schema (key tables)

All defined in `server/db/schema.sql`. Migrations for existing DBs in `server/db/database.ts` migrations array.

| Table | Purpose |
|-------|---------|
| `users` | id, email, password_hash, full_name, username, avatar_url, position, fitness_level, bio, city, is_verified, id_document_url, date_of_birth, years_playing |
| `wallets` | balance, escrow per user |
| `transactions` | DEPOSIT, ESCROW_HOLD, ESCROW_RELEASE, ESCROW_REFUND, etc. |
| `teams` | name, captain_id, colors, team_layout JSON, motto, is_recruiting |
| `team_members` | team_id, user_id, role (CAPTAIN/PLAYER), position_in_formation |
| `team_join_requests` | JOIN_REQUEST / CAPTAIN_INVITE flow |
| `team_wallets` | shared team balance |
| `fields` | name, location, city, price_per_slot |
| `field_timetable` | field_id, date, time_slot, status (AVAILABLE/RESERVED/BOOKED/LOCKED), lobby_id |
| `lobbies` | field_id, timetable_id, created_by, team_id, intensity, max_players, fee_per_player, status |
| `lobby_participants` | lobby_id, user_id, has_paid, payment_reference |
| `lobby_positions` | lobby_id, user_id, team_side (HOME/AWAY), position_on_field, position_index |
| `matches` | lobby_id, field_id, date, score_home, score_away, status |
| `match_players` | match_id, user_id, team_side, goals, assists, rating |
| `messages` | sender_id, receiver_id, content, is_request (for DM gating) |
| `notifications` | user_id, type, title, body, is_read, related_entity_id |
| `friendships` | requester_id, addressee_id, status (PENDING/ACCEPTED/DECLINED) |
| `practice_sessions` | training sessions with escrow pattern |
| `practice_participants` | session_id, user_id, has_paid |
| `chat_messages` | context_type (lobby/training), context_id, sender_id, content |
| `player_reviews` | session reviews 1-5 stars |

---

## Key Features

### Authentication
- Registration: `POST /api/auth/register` — accepts email, password, fullName, username, position, fitnessLevel, avatarBase64 (face photo, required), dateOfBirth, yearsPlaying
- Face photo at registration is stored as `avatar_url` (base64 data URL)
- Login: `POST /api/auth/login` — returns JWT + user object
- Token stored in `localStorage` as `footyfinder_token`
- Session restore: `GET /api/users/me` on app load

### Identity Verification
- Face photo (selfie) is **required** during registration — becomes the player's avatar
- Gov ID / Passport upload on Profile page → `POST /api/users/me/verify-id` → sets `is_verified = 1`
- Verified players show `CheckCheck` (double tick) badge in: profile header, social player cards, team member lists, DM conversations
- Unverified players show greyed-out `ShieldCheck` icon

### Player Profile & Stats
- `GET /api/users/me` returns full profile including `isVerified`, `dateOfBirth`, `yearsPlaying`
- `GET /api/matches/stats/me` returns: totalMatches, goals, assists, wins, losses, draws, cleanSheets, averageRating
  - Clean sheets: matches where the opponent scored 0
- Profile page fetches live stats via `getMyStats()` on mount (not stale props)
- Bio sidebar shows: position, fitness level, city, age (calculated from dateOfBirth), years playing experience
- `GET /api/users/:id/match-stats` — same stats for any player (used by PlayerProfilePage)
- `GET /api/users/:id/training-stats` — count of confirmed/completed practice sessions

### Clickable Player Profiles
- In Social → Discover and Friends tabs, clicking any player avatar/name navigates to `'player-profile'` page
- `PlayerProfilePage.tsx` is a read-only public profile showing: avatar, name, verified badge, city/age, 5 stat cards (Matches, Goals, Assists, Clean Sheets, Training), W/D/L row, bio

### Dual Role System
- **Player Mode**: View team formation (locked), contribute to wallet, chat
- **Captain Mode**: Edit formation, manage squad, organize matches, delete team
- Role switcher visible on dashboard and matchmaking pages

### Team System
- Multiple teams supported (user can be in multiple teams)
- `userTeams[]` state tracks all memberships; tab strip switches between them
- **Delete Team** (captain only): `DELETE /api/teams/:id` — cascades removes all members, wallets, requests
- **Leave Team** (player only): `POST /api/teams/:id/leave` — removes from team
- Team tab strip in App.tsx uses IIFE pattern (rendered outside `overflow-x: auto` container) to show dropdown without CSS clipping
- Teams have shared wallets, invite/join request flow, mottos

### Match Lobbies & Competing Lobbies
- Players race to fill lobbies and pay entry fees (held in escrow)
- **Competing lobbies**: Multiple lobbies can exist for the same `field_timetable` slot simultaneously
  - First lobby to fill `max_players` paid slots wins — calls `awardLobby()` in `server/routes/lobbies.ts`
  - `awardLobby()`: confirms winner, releases escrow for winners, cancels all competing lobbies, issues `ESCROW_REFUND` to all paid players in losing lobbies, sets timetable to BOOKED
  - `POST /lobbies`: accepts RESERVED slots (second+ competing lobby); only first lobby sets slot to RESERVED
  - `POST /lobbies/:id/cancel`: only frees timetable to AVAILABLE if no other active lobbies remain for that slot
- Lobby cards show orange "X competing" badge + orange top stripe when `competingLobbiesCount > 1`
- `GET /api/lobbies` includes `competingLobbiesCount` (correlated subquery counting active lobbies per timetable_id)

### Formation System (Team vs Team)
- `DEFAULT_POINTS` slot IDs: `gk`, `lb`, `cb1`, `cb2`, `rb`, `lm`, `cm1`, `cm2`, `rm`, `st1`, `st2` (4-2-3-1)
- `HOME_SLOT_TO_INDEX`: `gk→0, lb→1, cb1→2, cb2→3, rb→4, lm→5, cm1→6, cm2→7, rm→8, st1→9, st2→10`
- `AWAY_SLOT_TO_INDEX`: mirrored (st1→0 … gk→10)
- Captain saves layout → `POST /api/teams/:id/save-layout` → `teams.team_layout` JSON
- `GET /api/lobbies/:id/formation` merges real DB users + saved layout name entries
- Host sees "Waiting for Challenger…"; challenger captains see "Accept Challenge" button (checked via `createdBy === currentUserId`)

### Wallet & Escrow Flow
1. **Load Funds**: `POST /api/payments/load` → balance increases, DEPOSIT transaction
2. **Pay Lobby**: `POST /api/lobbies/:id/pay` → escrow increases, ESCROW_HOLD transaction
3. **Lobby Wins** (fills first): `awardLobby()` → ESCROW_RELEASE for winner, ESCROW_REFUND for all competing lobby players
4. **Cancel Lobby**: `POST /api/lobbies/:id/cancel` → ESCROW_REFUND for all paid participants
5. **Leave Lobby**: `POST /api/lobbies/:id/leave` → ESCROW_REFUND if paid

### Direct Messages (DMs)
- `messages` table: `sender_id`, `receiver_id`, `is_request` (0 = normal, 1 = pending request)
- `GET /api/messages/conversations` — distinct conversation partners with last message + unread count
- `GET /api/messages/dm/:userId` — full message history
- `POST /api/messages/dm/:userId` — sends message; if not friends AND no prior DM, sets `is_request = 1`
- `PUT /api/messages/dm/:userId/accept` — clears `is_request` flag on pending messages
- `PUT /api/messages/dm/:userId/decline` — deletes pending messages
- Social page has "Messages" 4th tab showing conversations list + DM chat view
- Pending requests show Accept/Decline buttons in a separate section

### Notifications
- `notifications` table: user_id, type, title, body, is_read, related_entity_id
- Types: `FRIEND_REQUEST`, `FRIEND_ACCEPTED`, `TEAM_INVITE`, `TEAM_JOIN_ACCEPTED`, `TEAM_JOIN_DECLINED`, `TEAM_JOIN_REQUEST`, `MATCH_TODAY`, `TEAM_MESSAGE`, `TEAM_BIO_UPDATE`, `DM_REQUEST`
- `createNotification(db, {...})` helper exported from `server/routes/notifications.ts` — imported by social.ts, teams.ts, messages.ts to trigger notifications
- `GET /api/notifications` — last 50, newest first
- `PUT /api/notifications/:id/read` and `PUT /api/notifications/read-all`
- Navigation.tsx has `Bell` icon with red badge showing `notificationCount`
- `NotificationsPage.tsx` groups notifications Today/Yesterday/Earlier, marks all read after 2s

### Social / Friends
- Discover: browse all non-friend players, send friend request
- Friends: accepted friend list, clickable profiles, DM button
- `GET /api/social/discover` — paginated player search
- `POST /api/social/friends/:id` — send request
- `PUT /api/social/friends/:id/respond` — accept/decline
- `DELETE /api/social/friends/:id` — unfriend

---

## Styling

- Tailwind CSS utility classes throughout
- Heavy use of `rounded-2xl`, `rounded-3xl`, `rounded-[40px]`, `rounded-[48px]`
- Color scheme: blue-600 primary, slate-900 for dark elements, emerald for positive stats, amber/orange for competing/contested states
- Responsive: mobile bottom nav + desktop top nav
- Custom animations: `animate-fade-in`, `animate-spin` (loading spinner)

## Path Alias

TypeScript path alias `@/*` maps to root directory (configured in tsconfig.json and vite.config.ts).

---

## Important Patterns

### Adding New Pages
1. Create page component in `features/<feature>/pages/`
2. Export from the feature's `index.ts` barrel file
3. Import in App.tsx from the feature barrel: `import { MyPage } from './features/<feature>'`
4. Add to `currentPage` type union in App.tsx
5. Add case to `renderPage()` switch in App.tsx
6. Update Navigation.tsx if the page needs a nav button

### Adding New API Routes
1. Add route handler in appropriate `server/routes/*.ts`
2. Register in `server/index.ts` if it's a new router file
3. Add typed client function in `frontend/api/*.ts`
4. Export from `frontend/api/index.ts`

### Adding DB Columns / Tables (Migrations)
- Add `CREATE TABLE IF NOT EXISTS ...` or `ALTER TABLE ... ADD COLUMN ...` to the migrations array in `server/db/database.ts`
- Migrations run at startup wrapped in try/catch (ignores "column already exists" errors)
- Also update `server/db/schema.sql` for fresh DB installs

### CSS Dropdown / Overflow Clipping Pattern
- `overflow-x: auto` clips `position: absolute` children
- Pattern: render dropdowns as siblings OUTSIDE the overflow container, inside a `relative` positioned wrapper
- Used in App.tsx `teamTabStrip` (IIFE pattern): tab pills inside `overflow-x-auto`, dropdown rendered after it in the `relative` sticky wrapper at `absolute top-full`

### applyAuthUser Pattern
- Called after login, register, and session restore
- Maps raw API response → `userProfile` React state
- Must include ALL fields returned by auth endpoints to avoid stale state (id, fullName, position, fitnessLevel, dateOfBirth, yearsPlaying, avatarUrl, isVerified)

### Wallet Operations (Backend)
- All wallet mutations live in `server/routes/` (payments.ts, lobbies.ts)
- Pattern: UPDATE wallets → INSERT transaction → db.save()
- Frontend syncs via `getMyWallet()` after any wallet-affecting action

---

## Version History

### v2.0 — Initial full-stack implementation
- Express + SQLite backend wired to React frontend
- Auth (register/login/JWT), teams, lobbies, matches, fields, social

### v2.1 — Formation System Fixes
- `DEFAULT_POINTS` slot IDs aligned with `HOME_SLOT_TO_INDEX`
- Host no longer sees "Accept Challenge" on own lobby (`createdBy` check)
- Challenger team auto-fills AWAY positions on accept

### v2.2 — Social Features + Verification
- **Delete/Leave Team**: `DELETE /api/teams/:id` for captains, leave endpoint for players
- **Individual DMs**: message request gating, conversations list, accept/decline
- **Notifications**: in-app bell, 10 notification types, `createNotification()` helper
- **Photo Upload + ID Verification**: face photo required at registration → avatar; Gov ID → verified badge; `CheckCheck` badge throughout; removed all `picsum.photos` fallbacks

### v2.3 — Player Stats + Profiles + Competing Lobbies
- **Live Player Stats**: `GET /matches/stats/me` with cleanSheets; Profile fetches live via `getMyStats()`
- **Clickable Player Profiles**: `PlayerProfilePage.tsx` — read-only profile from Social page
- **Age + Experience in Bio**: dateOfBirth → calculated age; yearsPlaying stored at registration, shown in bio
- **Competing Lobbies**: multiple lobbies for same field slot; `awardLobby()` confirms winner + refunds losers; CONTESTED badge on lobby cards
