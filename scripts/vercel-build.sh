#!/bin/sh
# Vercel's native Neon integration prefixes its auto-generated variables
# with the Neon project's slug (e.g. secondhandphoto_DATABASE_URL) instead
# of populating the plain DATABASE_URL our Prisma schema reads — and marks
# them "Sensitive," so nobody can copy the value out through the dashboard
# to paste into a plain DATABASE_URL var by hand. Falling back to it here
# means the build finds a working connection string either way, without
# needing anyone to touch Vercel's env var UI.
set -e

if [ -z "$DATABASE_URL" ] && [ -n "$secondhandphoto_DATABASE_URL" ]; then
  export DATABASE_URL="$secondhandphoto_DATABASE_URL"
fi

npx prisma migrate deploy

if [ "$RUN_SEED_ON_BUILD" = "true" ]; then
  npm run seed:build
fi

npx next build
