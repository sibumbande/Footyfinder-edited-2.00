-- ============================================================================
-- FootyFinder 2.0 — SQLite Schema
-- ============================================================================
-- Maps to: types.ts (UserProfileData, PlayerPosition, FitnessLevel, etc.)
--          services/database.ts (DataStore, DbLobbyParticipant, DbMessage, etc.)
-- ============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. users
-- Maps to: UserProfileData, SoccerProfile
-- position values:  'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward'
-- fitness_level:    'Beginner (Casual)' | 'Intermediate (Regular)'
--                   | 'Advanced (Competitive)' | 'Pro (Elite)'
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name     TEXT NOT NULL,
    username      TEXT UNIQUE,
    phone         TEXT,
    avatar_url    TEXT,
    position      TEXT CHECK (position IN ('Goalkeeper', 'Defender', 'Midfielder', 'Forward')),
    fitness_level TEXT CHECK (fitness_level IN (
                      'Beginner (Casual)',
                      'Intermediate (Regular)',
                      'Advanced (Competitive)',
                      'Pro (Elite)'
                  )),
    bio           TEXT,
    city          TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. wallets
-- Maps to: UserWallet  { balance, escrow, transactions[] }
-- One wallet per user. Transactions live in the transactions table.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
    id      TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    balance REAL NOT NULL DEFAULT 0,
    escrow  REAL NOT NULL DEFAULT 0,

    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. transactions
-- Maps to: WalletTransaction { id, type, amount, description, date,
--          isPending?, relatedEntityId? }
-- type mirrors the WalletTransaction.type union plus server-side types.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
    id          TEXT PRIMARY KEY,
    wallet_id   TEXT NOT NULL,
    type        TEXT NOT NULL CHECK (type IN (
                    'DEPOSIT',
                    'WITHDRAWAL',
                    'MATCH_FEE',
                    'TEAM_CONTRIBUTION',
                    'ESCROW_HOLD',
                    'ESCROW_RELEASE',
                    'ESCROW_REFUND',
                    'REFUND',
                    'PAYOUT'
                )),
    amount      REAL NOT NULL,
    description TEXT,
    reference   TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (wallet_id) REFERENCES wallets (id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. teams
-- Maps to: Team { id, name, homeColor, awayColor, members[], wallet }
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,
    captain_id      TEXT NOT NULL,
    primary_color   TEXT,
    secondary_color TEXT,
    logo_url        TEXT,
    is_recruiting   INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (captain_id) REFERENCES users (id) ON DELETE RESTRICT
);

-- ────────────────────────────────────────────────────────────────────────────
-- 4b. team_join_requests
-- Players request to join a team; captain accepts or declines.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_join_requests (
    id         TEXT PRIMARY KEY,
    team_id    TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    type       TEXT NOT NULL DEFAULT 'JOIN_REQUEST' CHECK (type IN ('JOIN_REQUEST', 'CAPTAIN_INVITE')),
    status     TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),

    UNIQUE (team_id, user_id),
    FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────────────────────
-- 5. team_members
-- Maps to: Team.members (SoccerProfile[]) and DataStore.squadPool
-- role: the member's organisational role within the team
-- position_in_formation: tactical slot id (e.g. 'st', 'cb1', 'gk')
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
    id                    TEXT PRIMARY KEY,
    team_id               TEXT NOT NULL,
    user_id               TEXT NOT NULL,
    role                  TEXT NOT NULL DEFAULT 'PLAYER' CHECK (role IN ('CAPTAIN', 'PLAYER')),
    position_in_formation TEXT,
    joined_at             TEXT NOT NULL DEFAULT (datetime('now')),

    UNIQUE (team_id, user_id),
    FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────────────────────
-- 6. team_wallets
-- Maps to: TeamWallet { balance, contributions[] }
-- Contributions tracked via transactions + DbTeamWalletContribution pattern.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_wallets (
    id      TEXT PRIMARY KEY,
    team_id TEXT NOT NULL UNIQUE,
    balance REAL NOT NULL DEFAULT 0,

    FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────────────────────
-- 7. fields
-- Maps to: FieldListing { id, name, location, pricePerPlayer, imageUrl,
--          rating, amenities[], timetable[] }
-- amenities stored as JSON text array, e.g. '["Floodlights","Showers"]'
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fields (
    id                       TEXT PRIMARY KEY,
    name                     TEXT NOT NULL,
    location                 TEXT NOT NULL,
    city                     TEXT,
    image_url                TEXT,
    price_per_slot           REAL NOT NULL DEFAULT 50.00,
    surface_type             TEXT,
    capacity                 INTEGER,
    owner_name               TEXT,
    owner_email              TEXT,
    owner_bank_account       TEXT,
    owner_bank_name          TEXT,
    owner_paystack_subaccount TEXT,
    is_active                INTEGER NOT NULL DEFAULT 1
);

-- ────────────────────────────────────────────────────────────────────────────
-- 8. field_timetable
-- Maps to: TimeSlot { time, status, pendingLobbiesCount, type? }
-- status mirrors BookingStatus enum values plus server-side states.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS field_timetable (
    id        TEXT PRIMARY KEY,
    field_id  TEXT NOT NULL,
    date      TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    status    TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN (
                  'AVAILABLE',
                  'RESERVED',
                  'BOOKED',
                  'LOCKED'
              )),
    lobby_id  TEXT,

    FOREIGN KEY (field_id) REFERENCES fields (id) ON DELETE CASCADE,
    FOREIGN KEY (lobby_id) REFERENCES lobbies (id) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────────────────────────────────
-- 9. lobbies
-- Maps to: MatchLobby { id, fieldName, fieldId, location, startTime, date,
--          intensity, joinedCount, paidCount, totalSlots, price, duration,
--          isConfirmed, isTeamMatch?, teamAFunded?, teamBFunded? }
-- intensity mirrors MatchIntensity enum: 'Casual' | 'Balanced' | 'Competitive'
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lobbies (
    id             TEXT PRIMARY KEY,
    field_id       TEXT NOT NULL,
    timetable_id   TEXT,
    created_by     TEXT NOT NULL,
    team_id        TEXT,
    intensity      TEXT NOT NULL DEFAULT 'Casual' CHECK (intensity IN (
                       'Casual',
                       'Balanced',
                       'Competitive'
                   )),
    max_players    INTEGER NOT NULL DEFAULT 10,
    fee_per_player REAL NOT NULL DEFAULT 50.00,
    status         TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN (
                       'OPEN',
                       'FILLING',
                       'FULL',
                       'CONFIRMED',
                       'CANCELLED',
                       'COMPLETED'
                   )),
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (field_id)     REFERENCES fields (id)          ON DELETE RESTRICT,
    FOREIGN KEY (timetable_id) REFERENCES field_timetable (id) ON DELETE SET NULL,
    FOREIGN KEY (created_by)   REFERENCES users (id)           ON DELETE RESTRICT,
    FOREIGN KEY (team_id)      REFERENCES teams (id)           ON DELETE SET NULL
);

-- ────────────────────────────────────────────────────────────────────────────
-- 10. lobby_participants
-- Maps to: DbLobbyParticipant { id, lobbyId, userId, positionSlot,
--          hasPaid, escrowTransactionId, joinedAt }
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lobby_participants (
    id                TEXT PRIMARY KEY,
    lobby_id          TEXT NOT NULL,
    user_id           TEXT NOT NULL,
    has_paid          INTEGER NOT NULL DEFAULT 0,
    payment_reference TEXT,
    joined_at         TEXT NOT NULL DEFAULT (datetime('now')),

    UNIQUE (lobby_id, user_id),
    FOREIGN KEY (lobby_id) REFERENCES lobbies (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)  REFERENCES users (id)   ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────────────────────
-- 11. matches
-- Maps to: MatchRecord { id, lobbyId, date, fieldName, scoreA, scoreB,
--          teamA[], teamB[], scorers[], assisters[] }
-- Revenue split: field_owner_payout = 80%, platform_fee = 20%
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
    id                   TEXT PRIMARY KEY,
    lobby_id             TEXT NOT NULL,
    field_id             TEXT NOT NULL,
    date                 TEXT NOT NULL,
    score_home           INTEGER DEFAULT 0,
    score_away           INTEGER DEFAULT 0,
    status               TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN (
                             'SCHEDULED',
                             'IN_PROGRESS',
                             'COMPLETED',
                             'CANCELLED'
                         )),
    total_fees_collected REAL DEFAULT 0,
    field_owner_payout   REAL DEFAULT 0,
    platform_fee         REAL DEFAULT 0,
    payout_status        TEXT DEFAULT 'PENDING' CHECK (payout_status IN (
                             'PENDING',
                             'PROCESSING',
                             'PAID',
                             'FAILED'
                         )),

    FOREIGN KEY (lobby_id) REFERENCES lobbies (id) ON DELETE RESTRICT,
    FOREIGN KEY (field_id) REFERENCES fields (id)  ON DELETE RESTRICT
);

-- ────────────────────────────────────────────────────────────────────────────
-- 12. match_players
-- Maps to: MatchRecord.scorers[] and MatchRecord.assisters[]
-- team_side distinguishes which squad the player was on.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_players (
    id        TEXT PRIMARY KEY,
    match_id  TEXT NOT NULL,
    user_id   TEXT NOT NULL,
    team_side TEXT NOT NULL CHECK (team_side IN ('HOME', 'AWAY')),
    goals     INTEGER NOT NULL DEFAULT 0,
    assists   INTEGER NOT NULL DEFAULT 0,
    rating    REAL,

    FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)  REFERENCES users (id)   ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────────────────────
-- 13. friendships
-- Maps to: UserProfileData.friends (SoccerProfile[]) and SoccerProfile.isFriend
-- Bidirectional: a row exists for the requester → addressee direction.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS friendships (
    id           TEXT PRIMARY KEY,
    requester_id TEXT NOT NULL,
    addressee_id TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
                     'PENDING',
                     'ACCEPTED',
                     'DECLINED'
                 )),
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),

    UNIQUE (requester_id, addressee_id),
    FOREIGN KEY (requester_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (addressee_id) REFERENCES users (id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────────────────────
-- 14. messages
-- Maps to: DbMessage { id, contextType, contextId, senderId, senderName,
--          text, isSystem, createdAt }
--          and LobbyMessage { id, sender, text, time, isMe }
-- team_id NULL = DM or lobby chat; sender_id + receiver_id for DMs.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id          TEXT PRIMARY KEY,
    team_id     TEXT,
    sender_id   TEXT NOT NULL,
    receiver_id TEXT,
    content     TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (team_id)     REFERENCES teams (id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id)   REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users (id) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────────────────────────────────
-- 15. platform_revenue
-- Tracks the 20% platform cut from each confirmed match.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_revenue (
    id         TEXT PRIMARY KEY,
    match_id   TEXT NOT NULL,
    amount     REAL NOT NULL,
    status     TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
                   'PENDING',
                   'COLLECTED',
                   'DISBURSED'
               )),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE RESTRICT
);

-- ────────────────────────────────────────────────────────────────────────────
-- 16. practice_sessions
-- Individual training/practice sessions — any player can host or join.
-- Cheaper than match lobbies (default R20), uses same escrow pattern.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS practice_sessions (
    id              TEXT PRIMARY KEY,
    created_by      TEXT NOT NULL,
    field_id        TEXT,
    timetable_ids   TEXT,
    title           TEXT NOT NULL,
    description     TEXT,
    date            TEXT NOT NULL,
    time_slot       TEXT NOT NULL,
    location        TEXT,
    slots_count     INTEGER NOT NULL DEFAULT 1,
    fee_per_player  REAL NOT NULL DEFAULT 20.00,
    max_players     INTEGER NOT NULL DEFAULT 20,
    status          TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
                        'DRAFT',
                        'OPEN',
                        'FILLING',
                        'FULL',
                        'CONFIRMED',
                        'CANCELLED',
                        'COMPLETED'
                    )),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (created_by)   REFERENCES users (id)           ON DELETE RESTRICT,
    FOREIGN KEY (field_id)     REFERENCES fields (id)          ON DELETE SET NULL
);

-- ────────────────────────────────────────────────────────────────────────────
-- 17. practice_participants
-- Tracks who joined a practice session and payment status.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS practice_participants (
    id                TEXT PRIMARY KEY,
    session_id        TEXT NOT NULL,
    user_id           TEXT NOT NULL,
    has_paid          INTEGER NOT NULL DEFAULT 0,
    payment_reference TEXT,
    joined_at         TEXT NOT NULL DEFAULT (datetime('now')),

    UNIQUE (session_id, user_id),
    FOREIGN KEY (session_id) REFERENCES practice_sessions (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)    REFERENCES users (id)              ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────────────────────
-- 18. player_reviews
-- Post-session reviews: 1-5 star rating + optional comment.
-- session_type: 'training' or 'match' to distinguish review context.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_reviews (
    id           TEXT PRIMARY KEY,
    session_type TEXT NOT NULL CHECK (session_type IN ('training', 'match')),
    session_id   TEXT NOT NULL,
    reviewer_id  TEXT NOT NULL,
    reviewee_id  TEXT NOT NULL,
    rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment      TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),

    UNIQUE (session_type, session_id, reviewer_id, reviewee_id),
    FOREIGN KEY (reviewer_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (reviewee_id) REFERENCES users (id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────────────────────
-- 19. chat_messages
-- Stores chat messages for lobbies and training sessions.
-- context_type: 'lobby' or 'training'
-- context_id:   the lobby ID or practice_session ID
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
    id           TEXT PRIMARY KEY,
    context_type TEXT NOT NULL CHECK (context_type IN ('lobby', 'training')),
    context_id   TEXT NOT NULL,
    sender_id    TEXT NOT NULL,
    sender_name  TEXT NOT NULL,
    content      TEXT NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────────────────────
-- 20. lobby_positions
-- Tracks which player has claimed each pitch position in a lobby.
-- HOME = Team A (a-* slots), AWAY = Team B (b-* slots)
-- position_index: 0-10 within each side, matches FULL_SQUAD_LAYOUT order
-- position_on_field: label like 'GK', 'CB', 'ST' etc.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lobby_positions (
    id                TEXT PRIMARY KEY,
    lobby_id          TEXT NOT NULL,
    user_id           TEXT NOT NULL,
    team_side         TEXT NOT NULL CHECK (team_side IN ('HOME', 'AWAY')),
    position_on_field TEXT NOT NULL,
    position_index    INTEGER NOT NULL,

    UNIQUE (lobby_id, user_id),
    UNIQUE (lobby_id, team_side, position_index),
    FOREIGN KEY (lobby_id) REFERENCES lobbies (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)  REFERENCES users (id)   ON DELETE CASCADE
);

-- ============================================================================
-- Indexes for common query patterns
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_wallets_user_id            ON wallets (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id     ON transactions (wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type          ON transactions (type);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id       ON team_members (team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id       ON team_members (user_id);
CREATE INDEX IF NOT EXISTS idx_team_wallets_team_id       ON team_wallets (team_id);
CREATE INDEX IF NOT EXISTS idx_field_timetable_field_date ON field_timetable (field_id, date);
CREATE INDEX IF NOT EXISTS idx_lobbies_field_id           ON lobbies (field_id);
CREATE INDEX IF NOT EXISTS idx_lobbies_status             ON lobbies (status);
CREATE INDEX IF NOT EXISTS idx_lobby_participants_lobby   ON lobby_participants (lobby_id);
CREATE INDEX IF NOT EXISTS idx_lobby_participants_user    ON lobby_participants (user_id);
CREATE INDEX IF NOT EXISTS idx_matches_lobby_id           ON matches (lobby_id);
CREATE INDEX IF NOT EXISTS idx_match_players_match_id     ON match_players (match_id);
CREATE INDEX IF NOT EXISTS idx_match_players_user_id      ON match_players (user_id);
CREATE INDEX IF NOT EXISTS idx_lobby_positions_lobby      ON lobby_positions (lobby_id);
CREATE INDEX IF NOT EXISTS idx_lobby_positions_user       ON lobby_positions (user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_requester      ON friendships (requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee      ON friendships (addressee_id);
CREATE INDEX IF NOT EXISTS idx_messages_team_id           ON messages (team_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id         ON messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_match_id  ON platform_revenue (match_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_status   ON practice_sessions (status);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_field    ON practice_sessions (field_id);
CREATE INDEX IF NOT EXISTS idx_practice_participants_sess ON practice_participants (session_id);
CREATE INDEX IF NOT EXISTS idx_practice_participants_user ON practice_participants (user_id);
CREATE INDEX IF NOT EXISTS idx_player_reviews_reviewee    ON player_reviews (reviewee_id);
CREATE INDEX IF NOT EXISTS idx_player_reviews_session     ON player_reviews (session_type, session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_context      ON chat_messages (context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender       ON chat_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_dm                ON messages (sender_id, receiver_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 21. notifications
-- In-app notification feed for each user.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id                 TEXT PRIMARY KEY,
    user_id            TEXT NOT NULL,
    type               TEXT NOT NULL CHECK (type IN (
                           'FRIEND_REQUEST', 'FRIEND_ACCEPTED',
                           'TEAM_INVITE', 'TEAM_JOIN_ACCEPTED', 'TEAM_JOIN_DECLINED',
                           'TEAM_JOIN_REQUEST', 'MATCH_TODAY',
                           'TEAM_MESSAGE', 'TEAM_BIO_UPDATE', 'DM_REQUEST'
                       )),
    title              TEXT NOT NULL,
    body               TEXT NOT NULL,
    is_read            INTEGER NOT NULL DEFAULT 0,
    related_entity_id  TEXT,
    created_at         TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, is_read);
