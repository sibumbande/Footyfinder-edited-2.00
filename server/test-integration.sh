#!/usr/bin/env bash
set -euo pipefail

BASE="http://localhost:3001/api"
PASS=0
FAIL=0

# Helper: pretty-print step result
step() {
  echo ""
  echo "═══════════════════════════════════════════════════════"
  echo "  STEP $1: $2"
  echo "═══════════════════════════════════════════════════════"
}

check() {
  local label="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  ✅ $label — PASS (got: $actual)"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $label — FAIL (expected: $expected, got: $actual)"
    FAIL=$((FAIL + 1))
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
step 1 "Register two users (Player A and Player B)"
# ─────────────────────────────────────────────────────────────────────────────

RESP_A=$(curl -s -w "\n%{http_code}" "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"playerA@test.com","password":"pass123","fullName":"Thabo Mokoena","username":"thabo_m","city":"Johannesburg","position":"Forward","fitnessLevel":"Advanced (Competitive)"}')

HTTP_A=$(echo "$RESP_A" | tail -1)
BODY_A=$(echo "$RESP_A" | sed '$d')
TOKEN_A=$(echo "$BODY_A" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).token)}catch{console.log('NONE')}})")
USER_A_ID=$(echo "$BODY_A" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).user.id)}catch{console.log('NONE')}})")

check "Register Player A status" "201" "$HTTP_A"
echo "  Token A: ${TOKEN_A:0:20}..."
echo "  User A ID: $USER_A_ID"

RESP_B=$(curl -s -w "\n%{http_code}" "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"playerB@test.com","password":"pass123","fullName":"Sipho Ndlovu","username":"sipho_n","city":"Johannesburg","position":"Midfielder","fitnessLevel":"Intermediate (Regular)"}')

HTTP_B=$(echo "$RESP_B" | tail -1)
BODY_B=$(echo "$RESP_B" | sed '$d')
TOKEN_B=$(echo "$BODY_B" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).token)}catch{console.log('NONE')}})")
USER_B_ID=$(echo "$BODY_B" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).user.id)}catch{console.log('NONE')}})")

check "Register Player B status" "201" "$HTTP_B"
echo "  Token B: ${TOKEN_B:0:20}..."
echo "  User B ID: $USER_B_ID"

# ─────────────────────────────────────────────────────────────────────────────
step 2 "Player A loads R500 into wallet"
# ─────────────────────────────────────────────────────────────────────────────

RESP=$(curl -s -w "\n%{http_code}" "$BASE/payments/load" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d '{"amount":500}')

HTTP=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
BAL_A=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).wallet.balance)}catch{console.log('ERR')}})")

check "Player A load status" "200" "$HTTP"
check "Player A balance" "500" "$BAL_A"

# ─────────────────────────────────────────────────────────────────────────────
step 3 "Player B loads R500 into wallet"
# ─────────────────────────────────────────────────────────────────────────────

RESP=$(curl -s -w "\n%{http_code}" "$BASE/payments/load" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_B" \
  -d '{"amount":500}')

HTTP=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
BAL_B=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).wallet.balance)}catch{console.log('ERR')}})")

check "Player B load status" "200" "$HTTP"
check "Player B balance" "500" "$BAL_B"

# ─────────────────────────────────────────────────────────────────────────────
step 4 "Player A creates team 'Soweto Stars'"
# ─────────────────────────────────────────────────────────────────────────────

RESP=$(curl -s -w "\n%{http_code}" "$BASE/teams" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d '{"name":"Soweto Stars","primaryColor":"#FFD700","secondaryColor":"#000000"}')

HTTP=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
TEAM_ID=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).team.id)}catch{console.log('NONE')}})")
TEAM_NAME=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).team.name)}catch{console.log('NONE')}})")

check "Create team status" "201" "$HTTP"
check "Team name" "Soweto Stars" "$TEAM_NAME"
echo "  Team ID: $TEAM_ID"

# ─────────────────────────────────────────────────────────────────────────────
step 5 "Player B joins the team"
# ─────────────────────────────────────────────────────────────────────────────

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/teams/$TEAM_ID/join" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_B")

HTTP=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
JOIN_MSG=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).message)}catch{console.log('NONE')}})")

check "Join team status" "200" "$HTTP"
echo "  Message: $JOIN_MSG"

# Verify team has 2 members
RESP=$(curl -s "$BASE/teams/my-team" \
  -H "Authorization: Bearer $TOKEN_A")
MEMBER_COUNT=$(echo "$RESP" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).members.length)}catch{console.log('ERR')}})")
check "Team member count" "2" "$MEMBER_COUNT"

# ─────────────────────────────────────────────────────────────────────────────
step 6 "Player B contributes R100 to team wallet"
# ─────────────────────────────────────────────────────────────────────────────

RESP=$(curl -s -w "\n%{http_code}" "$BASE/teams/$TEAM_ID/contribute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_B" \
  -d '{"amount":100}')

HTTP=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
B_BAL=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).userWallet.balance)}catch{console.log('ERR')}})")
TEAM_BAL=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).teamWallet.balance)}catch{console.log('ERR')}})")

check "Contribute status" "200" "$HTTP"
check "Player B balance after contribute" "400" "$B_BAL"
check "Team wallet balance" "100" "$TEAM_BAL"

# ─────────────────────────────────────────────────────────────────────────────
step 7 "Get list of fields"
# ─────────────────────────────────────────────────────────────────────────────

RESP=$(curl -s -w "\n%{http_code}" "$BASE/fields")

HTTP=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
FIELD_COUNT=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).fields.length)}catch{console.log('ERR')}})")
FIRST_FIELD_ID=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).fields[0].id)}catch{console.log('NONE')}})")
FIRST_FIELD_NAME=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).fields[0].name)}catch{console.log('NONE')}})")

check "Fields list status" "200" "$HTTP"
check "Number of fields" "4" "$FIELD_COUNT"
echo "  First field: $FIRST_FIELD_NAME ($FIRST_FIELD_ID)"

# Get first available timetable slot
RESP=$(curl -s "$BASE/fields/$FIRST_FIELD_ID/timetable")
FIRST_SLOT_ID=$(echo "$RESP" | node -e "process.stdin.on('data',d=>{try{const t=JSON.parse(d).timetable.find(s=>s.status==='AVAILABLE');console.log(t?t.id:'NONE')}catch{console.log('ERR')}})")
FIRST_SLOT_DATE=$(echo "$RESP" | node -e "process.stdin.on('data',d=>{try{const t=JSON.parse(d).timetable.find(s=>s.status==='AVAILABLE');console.log(t?t.date:'NONE')}catch{console.log('ERR')}})")
FIRST_SLOT_TIME=$(echo "$RESP" | node -e "process.stdin.on('data',d=>{try{const t=JSON.parse(d).timetable.find(s=>s.status==='AVAILABLE');console.log(t?t.timeSlot:'NONE')}catch{console.log('ERR')}})")

echo "  First available slot: $FIRST_SLOT_ID ($FIRST_SLOT_DATE @ $FIRST_SLOT_TIME)"

# ─────────────────────────────────────────────────────────────────────────────
step 8 "Player A creates a lobby (maxPlayers=2 for quick test)"
# ─────────────────────────────────────────────────────────────────────────────

RESP=$(curl -s -w "\n%{http_code}" "$BASE/lobbies" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d "{\"fieldId\":\"$FIRST_FIELD_ID\",\"timetableId\":\"$FIRST_SLOT_ID\",\"intensity\":\"Casual\",\"maxPlayers\":2,\"feePerPlayer\":50}")

HTTP=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
LOBBY_ID=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).lobby.id)}catch{console.log('NONE')}})")
LOBBY_STATUS=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).lobby.status)}catch{console.log('NONE')}})")
FEE=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).lobby.feePerPlayer)}catch{console.log('ERR')}})")

check "Create lobby status" "201" "$HTTP"
check "Lobby initial status" "FILLING" "$LOBBY_STATUS"
echo "  Lobby ID: $LOBBY_ID"
echo "  Fee per player: R$FEE"

# ─────────────────────────────────────────────────────────────────────────────
step 9 "Player B joins the lobby"
# ─────────────────────────────────────────────────────────────────────────────

RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/lobbies/$LOBBY_ID/join" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_B")

HTTP=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
L_STATUS=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).lobby.status)}catch{console.log('NONE')}})")
L_COUNT=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).lobby.participantCount)}catch{console.log('ERR')}})")

check "Join lobby status" "200" "$HTTP"
check "Lobby status after join" "FULL" "$L_STATUS"
check "Participant count" "2" "$L_COUNT"

# ─────────────────────────────────────────────────────────────────────────────
step 10 "Both players pay the lobby fee"
# ─────────────────────────────────────────────────────────────────────────────

echo "  --- Player A pays ---"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/lobbies/$LOBBY_ID/pay" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A")

HTTP=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
A_BAL_AFTER=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).wallet.balance)}catch{console.log('ERR')}})")
A_ESC_AFTER=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).wallet.escrow)}catch{console.log('ERR')}})")
A_LOBBY_STATUS=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).lobbyStatus)}catch{console.log('NONE')}})")

check "Player A pay status" "200" "$HTTP"
check "Player A balance after pay" "450" "$A_BAL_AFTER"
check "Player A escrow after pay" "50" "$A_ESC_AFTER"
echo "  Lobby status after A pays: $A_LOBBY_STATUS"

echo "  --- Player B pays ---"
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE/lobbies/$LOBBY_ID/pay" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_B")

HTTP=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
B_BAL_AFTER=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).wallet.balance)}catch{console.log('ERR')}})")
B_ESC_AFTER=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).wallet.escrow)}catch{console.log('ERR')}})")
B_LOBBY_STATUS=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).lobbyStatus)}catch{console.log('NONE')}})")

check "Player B pay status" "200" "$HTTP"
check "Player B balance after pay" "350" "$B_BAL_AFTER"
echo "  Player B escrow after pay: $B_ESC_AFTER"

# ─────────────────────────────────────────────────────────────────────────────
step 11 "Verify lobby status is CONFIRMED"
# ─────────────────────────────────────────────────────────────────────────────

check "Lobby CONFIRMED after all paid" "CONFIRMED" "$B_LOBBY_STATUS"

# Also verify via GET
RESP=$(curl -s "$BASE/lobbies/$LOBBY_ID")
FINAL_STATUS=$(echo "$RESP" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).lobby.status)}catch{console.log('NONE')}})")
check "GET lobby status" "CONFIRMED" "$FINAL_STATUS"

# After confirm, escrow should be released (0 for both)
RESP_A_WALLET=$(curl -s "$BASE/users/me/wallet" -H "Authorization: Bearer $TOKEN_A")
A_ESCROW_FINAL=$(echo "$RESP_A_WALLET" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).wallet.escrow)}catch{console.log('ERR')}})")
check "Player A escrow released (0)" "0" "$A_ESCROW_FINAL"

RESP_B_WALLET=$(curl -s "$BASE/users/me/wallet" -H "Authorization: Bearer $TOKEN_B")
B_ESCROW_FINAL=$(echo "$RESP_B_WALLET" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).wallet.escrow)}catch{console.log('ERR')}})")
check "Player B escrow released (0)" "0" "$B_ESCROW_FINAL"

# ─────────────────────────────────────────────────────────────────────────────
step 12 "Complete the match with scores and player stats"
# ─────────────────────────────────────────────────────────────────────────────

RESP=$(curl -s -w "\n%{http_code}" "$BASE/matches/complete" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d "{\"lobbyId\":\"$LOBBY_ID\",\"scoreHome\":3,\"scoreAway\":1,\"players\":[{\"userId\":\"$USER_A_ID\",\"teamSide\":\"HOME\",\"goals\":2,\"assists\":1,\"rating\":8.5},{\"userId\":\"$USER_B_ID\",\"teamSide\":\"AWAY\",\"goals\":1,\"assists\":0,\"rating\":6.0}]}")

HTTP=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
MATCH_ID=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).match.id)}catch{console.log('NONE')}})")
MATCH_STATUS=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).match.status)}catch{console.log('NONE')}})")
SCORE_HOME=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).match.scoreHome)}catch{console.log('ERR')}})")
SCORE_AWAY=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).match.scoreAway)}catch{console.log('ERR')}})")

check "Complete match status" "201" "$HTTP"
check "Match status" "COMPLETED" "$MATCH_STATUS"
check "Score home" "3" "$SCORE_HOME"
check "Score away" "1" "$SCORE_AWAY"
echo "  Match ID: $MATCH_ID"

# ─────────────────────────────────────────────────────────────────────────────
step 13 "Verify the 80/20 split was calculated correctly"
# ─────────────────────────────────────────────────────────────────────────────

# Total fees = 2 players × R50 = R100
# Field owner = 80% of R100 = R80
# Platform = 20% of R100 = R20
TOTAL=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).financials.totalCollected)}catch{console.log('ERR')}})")
FIELD_PAY=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).financials.fieldOwnerPayout)}catch{console.log('ERR')}})")
PLATFORM=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).financials.platformFee)}catch{console.log('ERR')}})")

check "Total fees collected" "100" "$TOTAL"
check "Field owner payout (80%)" "80" "$FIELD_PAY"
check "Platform fee (20%)" "20" "$PLATFORM"

# ─────────────────────────────────────────────────────────────────────────────
step 14 "Check Player A's match history and career stats"
# ─────────────────────────────────────────────────────────────────────────────

# Match history
RESP=$(curl -s "$BASE/matches" -H "Authorization: Bearer $TOKEN_A")
MATCH_COUNT=$(echo "$RESP" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).matches.length)}catch{console.log('ERR')}})")
check "Player A match count" "1" "$MATCH_COUNT"

# Career stats
RESP=$(curl -s "$BASE/matches/stats/me" -H "Authorization: Bearer $TOKEN_A")
TOTAL_MATCHES=$(echo "$RESP" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).totalMatches)}catch{console.log('ERR')}})")
TOTAL_GOALS=$(echo "$RESP" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).totalGoals)}catch{console.log('ERR')}})")
TOTAL_ASSISTS=$(echo "$RESP" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).totalAssists)}catch{console.log('ERR')}})")
WINS=$(echo "$RESP" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).wins)}catch{console.log('ERR')}})")
LOSSES=$(echo "$RESP" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).losses)}catch{console.log('ERR')}})")
AVG_RATING=$(echo "$RESP" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).averageRating)}catch{console.log('ERR')}})")

check "Total matches" "1" "$TOTAL_MATCHES"
check "Total goals" "2" "$TOTAL_GOALS"
check "Total assists" "1" "$TOTAL_ASSISTS"
check "Wins (Player A on HOME, 3-1)" "1" "$WINS"
check "Losses" "0" "$LOSSES"
check "Average rating" "8.5" "$AVG_RATING"

# Player B stats (should have a loss)
RESP=$(curl -s "$BASE/matches/stats/me" -H "Authorization: Bearer $TOKEN_B")
B_WINS=$(echo "$RESP" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).wins)}catch{console.log('ERR')}})")
B_LOSSES=$(echo "$RESP" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).losses)}catch{console.log('ERR')}})")
check "Player B wins" "0" "$B_WINS"
check "Player B losses" "1" "$B_LOSSES"

# ─────────────────────────────────────────────────────────────────────────────
step 15 "Player A sends friend request to Player B"
# ─────────────────────────────────────────────────────────────────────────────

RESP=$(curl -s -w "\n%{http_code}" "$BASE/social/friend-request" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d "{\"addresseeId\":\"$USER_B_ID\"}")

HTTP=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
FR_ID=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).requestId)}catch{console.log('NONE')}})")
FR_MSG=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).message)}catch{console.log('NONE')}})")

check "Send friend request status" "201" "$HTTP"
echo "  Request ID: $FR_ID"
echo "  Message: $FR_MSG"

# Verify Player B sees the pending request
RESP=$(curl -s "$BASE/social/friend-requests" -H "Authorization: Bearer $TOKEN_B")
PENDING_COUNT=$(echo "$RESP" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).requests.length)}catch{console.log('ERR')}})")
check "Player B pending requests" "1" "$PENDING_COUNT"

# ─────────────────────────────────────────────────────────────────────────────
step 16 "Player B accepts the friend request"
# ─────────────────────────────────────────────────────────────────────────────

RESP=$(curl -s -w "\n%{http_code}" -X PUT "$BASE/social/friend-request/$FR_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_B" \
  -d '{"status":"ACCEPTED"}')

HTTP=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
ACCEPT_MSG=$(echo "$BODY" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).message)}catch{console.log('NONE')}})")

check "Accept friend request status" "200" "$HTTP"
echo "  Message: $ACCEPT_MSG"

# ─────────────────────────────────────────────────────────────────────────────
step 17 "Verify they appear in each other's friends list"
# ─────────────────────────────────────────────────────────────────────────────

RESP=$(curl -s "$BASE/social/friends" -H "Authorization: Bearer $TOKEN_A")
A_FRIEND_COUNT=$(echo "$RESP" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).friends.length)}catch{console.log('ERR')}})")
A_FRIEND_NAME=$(echo "$RESP" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).friends[0].fullName)}catch{console.log('NONE')}})")

check "Player A friends count" "1" "$A_FRIEND_COUNT"
check "Player A friend is Sipho" "Sipho Ndlovu" "$A_FRIEND_NAME"

RESP=$(curl -s "$BASE/social/friends" -H "Authorization: Bearer $TOKEN_B")
B_FRIEND_COUNT=$(echo "$RESP" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).friends.length)}catch{console.log('ERR')}})")
B_FRIEND_NAME=$(echo "$RESP" | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).friends[0].fullName)}catch{console.log('NONE')}})")

check "Player B friends count" "1" "$B_FRIEND_COUNT"
check "Player B friend is Thabo" "Thabo Mokoena" "$B_FRIEND_NAME"

# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║               INTEGRATION TEST SUMMARY               ║"
echo "╠═══════════════════════════════════════════════════════╣"
printf "║  ✅ PASSED: %-40s ║\n" "$PASS"
printf "║  ❌ FAILED: %-40s ║\n" "$FAIL"
TOTAL=$((PASS + FAIL))
printf "║  TOTAL:    %-40s ║\n" "$TOTAL"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
