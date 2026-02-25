# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FootyFinder 2.0 is a React/TypeScript web application for football (soccer) matchmaking. Players can find matches, create teams, join lobbies, and manage their football activities. The app supports both individual players and team captains with different dashboards and capabilities.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (http://localhost:3000)
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
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
├── package.json            # Dependencies and scripts
├── .env.local              # Environment variables (not in repo)
│
├── services/               # Data & business logic layer
│   ├── index.ts            # Barrel export for all services
│   ├── database.ts         # In-memory data store (SQLite-compatible schema)
│   ├── seed.ts             # Seed data (replaces old mock constants)
│   ├── walletService.ts    # Wallet operations (load, escrow, debit, contribute)
│   └── lobbyService.ts     # Lobby/booking operations
│
├── features/               # Feature-based modules (pages + feature components)
│   ├── auth/               # Authentication (Login, CreateProfile)
│   │   ├── index.ts
│   │   └── pages/
│   │       ├── Login.tsx
│   │       └── CreateProfile.tsx
│   │
│   ├── home/               # Home/landing page
│   │   ├── index.ts
│   │   └── pages/
│   │       └── Home.tsx
│   │
│   ├── profile/            # User profile, wallet, transaction history
│   │   ├── index.ts
│   │   └── pages/
│   │       └── Profile.tsx
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
│   │   │   ├── Matchmaking.tsx
│   │   │   └── PostMatchReport.tsx
│   │   └── components/
│   │       └── MatchmakingUI.tsx
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
│   └── social/             # Social/friends network
│       ├── index.ts
│       ├── pages/
│       │   └── Social.tsx
│       └── components/
│           └── SocialUI.tsx
│
├── components/             # Shared & reusable components
│   ├── shared/             # Generic reusable UI
│   │   ├── index.ts        # Barrel export for all shared
│   │   ├── ui/
│   │   │   ├── index.ts
│   │   │   ├── Navigation.tsx
│   │   │   ├── Logo.tsx
│   │   │   ├── TabPanel.tsx        # Reusable tab navigation
│   │   │   ├── SearchInput.tsx     # Reusable search input
│   │   │   ├── StatCard.tsx        # Reusable stat display card
│   │   │   └── EmptyState.tsx      # Reusable empty state placeholder
│   │   ├── modals/
│   │   │   ├── index.ts
│   │   │   ├── Modal.tsx           # Base modal wrapper
│   │   │   ├── PaymentModal.tsx    # Payment processing modal
│   │   │   └── FundingModal.tsx    # Team wallet funding modal
│   │   └── forms/
│   │       ├── index.ts
│   │       └── NumberCounter.tsx   # +/- counter input
│   │
│   └── domain/             # Football-specific reusable components
│       ├── index.ts
│       ├── TacticalPitch.tsx       # Interactive pitch/formation display
│       ├── LobbyChat.tsx           # Chat for match/team lobbies
│       └── FieldCard.tsx           # Football field listing card
│
├── server/                 # Backend (future — files are empty scaffolds)
│   ├── index.ts            # Express server entry point
│   ├── db/
│   │   ├── schema.sql      # SQLite table definitions
│   │   ├── seed.sql        # Initial data inserts
│   │   ├── database.ts     # SQLite connection & query helpers
│   │   └── footy.db        # SQLite database file (gitignored)
│   ├── routes/
│   │   ├── auth.ts         # Auth endpoints (register, login, logout)
│   │   ├── users.ts        # User profile CRUD
│   │   ├── teams.ts        # Team CRUD & membership
│   │   ├── lobbies.ts      # Lobby creation, join, confirm
│   │   ├── matches.ts      # Match history & post-match reports
│   │   ├── fields.ts       # Field listings & timetables
│   │   ├── payments.ts     # Wallet load, escrow, transactions
│   │   └── social.ts       # Friends, discover profiles
│   ├── middleware/
│   │   └── auth.ts         # JWT/session auth middleware
│   └── utils/
│       ├── paystack.ts     # Paystack payment gateway integration
│       └── splits.ts       # Payment split logic (field owners, platform fee)
│
├── shared/                 # Shared types between frontend & server
│   └── types.ts            # Canonical type definitions (future)
│
└── frontend/               # Frontend API client layer (future)
    └── api/
        ├── index.ts        # Barrel export
        ├── client.ts       # Base HTTP client (fetch wrapper)
        ├── auth.ts         # Auth API calls
        ├── teams.ts        # Teams API calls
        ├── lobbies.ts      # Lobbies API calls
        └── payments.ts     # Payments API calls
```

## Architecture Overview

### Application Structure

- **App.tsx**: Central orchestrator containing all application state and routing logic
  - Manages user profile, team data, match history, lobbies, and messages
  - Initializes data from `seedDatabase()` instead of hardcoded mock constants
  - Implements custom navigation system (not React Router)
  - Handles all state updates and passes data down to pages via props

- **services/**: Business logic and data layer
  - `database.ts`: In-memory data store with SQLite-compatible schema interfaces (`DataStore`, `DbLobbyParticipant`, `DbMessage`, `DbTeamWalletContribution`)
  - `seed.ts`: `seedDatabase()` initializes all data (fields, lobbies, profiles, sessions, squad pool, captain messages) — replaces the old mock constants
  - `walletService.ts`: All wallet operations — `loadFunds`, `escrowHold`, `escrowRelease`, `escrowRefund`, `directDebit`, `contributeToTeam`, `getWallet`, `getBalance`, `getTransactions`
  - `lobbyService.ts`: Lobby operations — `getActiveLobbies`, `getLobby`, `joinSlot`, `confirmLobby`, `cancelLobby`

- **features/**: Feature-based modules, each containing related pages and components
  - Each feature has its own `index.ts` barrel export for clean imports
  - `pages/` subfolder: Full-page views (smart components with routing/state logic)
  - `components/` subfolder: Feature-specific UI components (presentational)
  - Features: auth, home, profile, dashboard, matchmaking, training, team, social

- **components/shared/**: Generic reusable UI components used across features
  - `ui/`: Navigation, Logo, TabPanel, SearchInput, StatCard, EmptyState
  - `modals/`: Modal (base), PaymentModal, FundingModal
  - `forms/`: NumberCounter

- **components/domain/**: Football-specific reusable components
  - TacticalPitch, LobbyChat, FieldCard

- **server/**: Backend scaffold (empty files, ready to implement)
  - Express server with SQLite database
  - RESTful routes for all resources
  - Paystack payment integration utilities
  - Auth middleware for JWT/session-based authentication

- **shared/**: Canonical type definitions shared between frontend and backend (future)

- **frontend/api/**: HTTP client layer to replace direct service calls when backend is ready

### State Management

- All state lives in App.tsx with no external state management library
- Data is initialized via `seedDatabase()` from `services/seed.ts`
- Wallet operations go through `walletService` which manages the in-memory data store
- State is passed down to pages/components as props
- State updates flow back up through callback functions
- Key state includes:
  - `userProfile`: Current user's profile, wallet (synced with walletService), stats, friends
  - `userTeam`: User's team data (null if no team created)
  - `userRole`: 'PLAYER' or 'CAPTAIN'
  - `fields`: Available football fields (from seed data)
  - `activeLobbies`: Available match lobbies
  - `matchHistory`: Past match records
  - `teamWallet`: Team's shared wallet for match fees
  - `teamMessages`: Team chat messages

### Wallet & Escrow Flow

The wallet system uses a proper escrow pattern via `walletService`:
1. **Load Funds**: Player adds money → `walletService.loadFunds()` → balance increases, Credit transaction logged
2. **Join Match (Quick Play)**: Player pays entry → `walletService.escrowHold()` → balance decreases, escrow increases, EscrowHold transaction logged
3. **Match Confirmed**: Escrow released → `walletService.escrowRelease()` → escrow decreases, EscrowRelease transaction logged (money goes to field)
4. **Match Cancelled**: Escrow refunded → `walletService.escrowRefund()` → escrow decreases, balance increases, EscrowRefund transaction logged
5. **Team Contribution**: Player contributes → `walletService.directDebit()` → balance decreases, team wallet increases

### Navigation System

Custom navigation implemented via `navigate(page, params?)` function:
- Takes a page name and optional parameters
- Updates `currentPage` state to render different views
- Passes parameters via `navigationParams` state
- No URL routing - purely state-based

### Data Types

All TypeScript types defined in `types.ts`:
- `UserProfileData`: Player profile with wallet, stats, friends
- `UserWallet`: Balance, escrow amount, transaction history
- `WalletTransaction`: Transaction with type (Credit, Debit, Refund, EscrowHold, EscrowRelease, EscrowRefund, TeamContribution), amount, description, date, isPending, relatedEntityId
- `Team`: Team with members, colors, wallet
- `MatchLobby`: Match lobby with field, time, participants
- `SoccerProfile`: Basic player info for friends/teammates
- Enums: `PlayerPosition`, `FitnessLevel`, `MatchIntensity`, `BookingStatus`

### Seed Data

`services/seed.ts` contains all initial data (replaces old `constants.ts` mock data):
- `seedDatabase()` returns `{ fields, lobbies, profiles, practiceSessions, squadPool, captainMessages }`
- Deterministic timetable generation (no `Math.random()`)
- All data is loaded into the in-memory `DataStore` on initialization

## Key Features

### Dual Role System
- **Player Mode**: View team formation (locked), contribute to wallet, chat
- **Captain Mode**: Edit formation, manage squad, organize matches, handle wallet
- Role switcher visible on dashboard, matchmaking, and team profile pages

### Match Lobbies
- Players race to fill lobbies and pay match fees
- Entry fee held in escrow via `walletService.escrowHold()`
- First full squad to pay secures the time slot
- Lobbies show joined/paid counts and confirmation status
- On confirmation, escrow is released via `walletService.escrowRelease()`
- Team matches require both teams to fund from team wallets

### Team System
- Users must create or join a team to access dashboard
- Teams have shared wallets funded by member contributions (deducted from personal wallet)
- Captains can create lobbies and manage formations using TacticalPitch component
- Team chat for coordination

### Formation System (Team vs Team Matchmaking)

The captain's team formation is displayed on the Teams page and persists to team matchmaking:

**Frontend Flow:**
- `App.tsx` maintains `generalSquadAssigned` (Record<slotId → playerName>) and `generalSquadPoints` (Formation positions)
- `DEFAULT_POINTS` defines 11 slot IDs: `gk`, `lb`, `cb1`, `cb2`, `rb`, `lm`, `cm1`, `cm2`, `rm`, `st1`, `st2` (4-2-3-1 formation)
- Captain clicks "Save Layout" on CaptainsDashboard → calls `handleSaveTeamLayout()` → `POST /api/teams/:teamId/save-layout`

**Backend Persistence:**
- New column: `teams.team_layout TEXT` stores JSON: `{ "st1": "Siya Kolisi", "cm1": "Thabo Mokoena", ... }`
- Migration in `server/db/database.ts` auto-creates column on existing DBs
- `POST /api/teams/:id/save-layout` validates captain, saves layout as JSON, persists to DB

**Matchmaking Display:**
- When captain hosts Teams vs Teams, lobby is created with `teamId` parameter
- `fillTeamPositions()` queries `team_members` DB and fills real users' positions (only the captain is guaranteed to be in DB as a real user)
- `GET /api/lobbies/:id/formation` merges:
  - Real positions from `lobby_positions` table (real user IDs only)
  - Saved formation from `teams.team_layout` JSON (name-only entries, virtual IDs like `layout-st1`)
  - Returns combined result with `user: { fullName: "playerName", ... }` for display
- Frontend `TacticalPitch` renders both real users and layout entries identically (by player name)

**Key Implementation Details:**
- Slot IDs must match between Teams page (`DEFAULT_POINTS`) and lobbies (`HOME_SLOT_TO_INDEX`) for roundtrip to work
- `HOME_SLOT_TO_INDEX` mapping: `gk→0, lb→1, cb1→2, cb2→3, rb→4, lm→5, cm1→6, cm2→7, rm→8, st1→9, st2→10`
- `AWAY_SLOT_TO_INDEX` is mirrored: `st1→0, st2→1, lm→2, cm1→3, cm2→4, rm→5, lb→6, cb1→7, cb2→8, rb→9, gk→10`
- Formation names are virtual (not real user accounts) — only the DB user IDs in `team_members` are enforced by FK constraint

### Wallet System
- **Personal wallet**: Individual player funds, loaded via Profile page modal
- **Escrow**: Funds held for pending matches (visible on Profile wallet tab)
- **Team wallet**: Shared funds from member contributions
- **Transaction history**: Full log with typed transactions (Credit, Debit, EscrowHold, EscrowRelease, EscrowRefund, TeamContribution)
- All operations go through `walletService` for consistent state

### Chat System
- `LobbyChat` component used in Matchmaking and Training
- Chat is locked (disabled) until player has paid entry fee
- Messages use `LobbyMessage` type: `{ id, sender, text, time, isMe }`
- Sender name pulled from `userProfile.fullName` (not hardcoded)

## Styling

- Tailwind CSS utility classes throughout
- Modern, rounded design with heavy use of rounded-2xl, rounded-3xl
- Color scheme: blue-600 primary, slate-900 for dark elements
- Responsive design with mobile bottom nav and desktop top nav
- Custom animations: fade-in, scale-in, etc.

## Path Alias

TypeScript path alias `@/*` maps to root directory (configured in tsconfig.json and vite.config.ts).

## Important Patterns

### Adding New Pages
1. Create a new feature folder under `features/` (or add to existing one)
2. Add page component in `features/<feature>/pages/`
3. Add feature-specific UI component in `features/<feature>/components/` if needed
4. Export from the feature's `index.ts` barrel file
5. Import in App.tsx from the feature barrel: `import { MyPage } from './features/<feature>'`
6. Add case to `renderPage()` switch in App.tsx
7. Update Navigation component if page needs nav button
8. Add to `currentPage` type union

### Modifying State
- Never mutate state directly
- Use setter functions with spread operators
- Example: `setUserProfile(prev => ({ ...prev, wallet: {...prev.wallet, balance: newBalance} }))`
- For wallet changes, prefer going through `walletService` then syncing: `walletService.loadFunds(id, amount); handleUpdateUserWallet(walletService.getWallet(id));`

### Working with Lobbies
- Lobbies stored in `activeLobbies` state (initialized from `seedData.lobbies`)
- Update via `setActiveLobbies()`
- Integration with field timetables in Home page
- Confirmation requires escrow payment through `walletService`

### Working with the Wallet Service
- Import: `import { walletService } from './services'`
- Always sync React state after service calls: call `walletService.*()`, then `onUpdateUserWallet(walletService.getWallet(userId))`
- Service throws errors on insufficient funds — wrap in try/catch

### Team Creation Flow
1. User clicks "Build My Team Identity" on dashboard
2. Navigate to CreateTeam page
3. Select friends as team members
4. Set team name and colors
5. `handleCreateTeam()` in App.tsx creates team and switches role to CAPTAIN

### Teams vs Teams Formation Fixes (v2.1)

Three issues were fixed to enable captain's full team formation display in team matches:

1. **Host's team formation now loads on matchmaking pitch**
   - `DEFAULT_POINTS` slot IDs were misaligned with server `HOME_SLOT_TO_INDEX` mapping
   - Changed Teams page slot IDs from `cdm`, `lw`, `st`, `rw` → `lm`, `cm2`, `st1`, `st2`
   - This aligns with the 11-position 4-2-3-1 formation: GK, LB, CB, CB, RB, LM, CM, CM, RM, ST, ST
   - Formation now persists via "Save Layout" → `POST /api/teams/:id/save-layout` → `teams.team_layout` JSON

2. **Host no longer sees "Accept Challenge" on own match**
   - Added `createdBy: string` to `MatchLobby` type (maps from `lobbies.created_by` column)
   - `MatchmakingUI` checks `selectedLobby.createdBy === currentUserId` to show/hide challenge button
   - Host sees "Waiting for Challenger..." instead, challenger captains see "Accept Challenge — R550"

3. **Challenger's team auto-fills AWAY positions when accepting**
   - Same `fillTeamPositions()` function used for both HOME (host team) and AWAY (challenger team)
   - Uses `position_in_formation` mapping (though currently uses sequential fallback since positions saved to DB)
   - `GET /api/lobbies/:id/formation` merges real DB users + saved layout entries from `teams.team_layout`
   - Both host and challenger formations display even with only captain as real DB user

**Files Modified:**
- `App.tsx`: Updated `DEFAULT_POINTS` slot IDs, added `handleSaveTeamLayout()`, wired `onSave` to CaptainsDashboard
- `types.ts`: Added `createdBy?: string` to `MatchLobby`
- `server/db/database.ts`: Added migration for `teams.team_layout TEXT` column
- `server/routes/teams.ts`: Added `POST /:id/save-layout` endpoint
- `server/routes/lobbies.ts`: Updated `GET /:id/formation` to merge saved layout with DB positions
- `frontend/api/teams.ts`: Added `saveTeamLayout()` function
- `features/dashboard/pages/CaptainsDashboard.tsx`: Added `onSave?: () => void` to props
- `features/matchmaking/pages/Matchmaking.tsx`: Map `createdBy` in lobby list fetch, pass to UI
- `features/matchmaking/components/MatchmakingUI.tsx`: Added `currentUserId` prop, check for host visibility of accept button

### Backend Migration Path
When implementing the server:
1. Write SQLite schema in `server/db/schema.sql` matching `DataStore` interfaces in `services/database.ts`
2. Implement route handlers in `server/routes/` mirroring `walletService` and `lobbyService` methods
3. Build API client in `frontend/api/` to call server endpoints
4. Replace `walletService.*()` calls with `api.payments.*()` calls
5. Replace `seedDatabase()` with server-fetched data
6. Shared types in `shared/types.ts` keep frontend and backend in sync
