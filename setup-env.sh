#!/usr/bin/env bash
# ANTISOCIAL env setup — asks questions, checks answers, writes .env.local
# Safe: never prints your secrets back to the screen.

cd "$(dirname "$0")" || exit 1
echo ""
echo "=== ANTISOCIAL setup — misfit-backend Supabase ==="
echo ""

URL="https://seoguauzvvrefoupxgom.supabase.co"
echo "[1/3] Supabase URL: already known. Nothing to do."
echo ""

# ---- anon key ----
while true; do
  echo "[2/3] In Supabase: misfit-backend -> Settings -> API"
  echo "Copy the 'anon / public' key, paste it here, press enter:"
  read -r ANON
  ANON=$(printf '%s' "$ANON" | tr -d '[:space:]')
  if [ -z "$ANON" ]; then
    echo ">> Got nothing. Try the paste again."
    echo ""
  elif [ ${#ANON} -lt 60 ]; then
    echo ">> That's too short to be the anon key (got ${#ANON} characters). It's a long string starting with 'eyJ' or 'sb_publishable_'. Try again."
    echo ""
  else
    echo ">> Anon key looks good (${#ANON} characters)."
    echo ""
    break
  fi
done

# ---- database url ----
while true; do
  echo "[3/3] In Supabase: green 'Connect' button at the top of the dashboard."
  echo "Pick 'Transaction pooler' (the MIDDLE option, port 6543)."
  echo "Copy the URI, replace [YOUR-PASSWORD] with your database password,"
  echo "then paste the whole thing here and press enter:"
  read -r DBURL
  DBURL=$(printf '%s' "$DBURL" | tr -d '[:space:]')
  if [ -z "$DBURL" ]; then
    echo ">> Got nothing. Try the paste again."
    echo ""
  elif printf '%s' "$DBURL" | grep -q '\[YOUR-PASSWORD\]'; then
    echo ">> You still have [YOUR-PASSWORD] in there — swap it for your real database password first, then paste again."
    echo ""
  elif ! printf '%s' "$DBURL" | grep -q '^postgres'; then
    echo ">> That doesn't start with 'postgresql://'. Make sure you copied the URI, not something else."
    echo ""
  elif printf '%s' "$DBURL" | grep -q 'db\.seoguauzvvrefoupxgom\.supabase\.co'; then
    echo ">> That's the DIRECT connection — it will NOT work from Termux."
    echo ">> Go back and pick 'Transaction pooler' (middle option). Try again."
    echo ""
  elif ! printf '%s' "$DBURL" | grep -q 'pooler\.supabase\.com'; then
    echo ">> That doesn't look like a pooler string (no pooler.supabase.com in it). Try again."
    echo ""
  else
    if printf '%s' "$DBURL" | grep -q ':5432'; then
      echo ">> That's the Session pooler (5432). It works too — keeping it."
    else
      echo ">> Transaction pooler confirmed."
    fi
    echo ""
    break
  fi
done

# ---- write file ----
{
  echo "NEXT_PUBLIC_SUPABASE_URL=$URL"
  echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON"
  echo "DATABASE_URL=$DBURL"
} > .env.local

echo "=== .env.local written clean. ==="
echo ""
echo "Run the database push now? (y/n)"
read -r GO
if [ "$GO" = "y" ] || [ "$GO" = "Y" ]; then
  npm run db:push
else
  echo "Alright. When ready: npm run db:push"
fi
