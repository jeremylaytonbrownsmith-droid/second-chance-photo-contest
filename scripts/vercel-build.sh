#!/bin/sh
# Vercel's native Neon integration prefixes its auto-generated variables
# with the Neon project's slug (e.g. secondhandphoto_DATABASE_URL) instead
# of populating the plain DATABASE_URL our Prisma schema reads — and marks
# them "Sensitive," so nobody can copy the value out through the dashboard
# to paste into a plain DATABASE_URL var by hand. Falling back to it here
# means the build finds a working connection string either way, without
# needing anyone to touch Vercel's env var UI. Searched dynamically (not a
# hardcoded prefix) so this keeps working if the Neon project is ever
# renamed or reconnected under a different slug.
set -e

if [ -z "$DATABASE_URL" ]; then
  fallback_line=$(env | grep -E '^[A-Za-z_][A-Za-z0-9_]*_DATABASE_URL=' | head -n1 || true)
  if [ -n "$fallback_line" ]; then
    export DATABASE_URL="${fallback_line#*=}"
  fi
fi

# Migrations need the direct (non-pgbouncer) connection string — the pooled
# one times out acquiring the advisory lock `prisma migrate deploy` takes
# (P1002), since transaction-mode pooling doesn't hold a session open. Same
# dynamic-prefix search as above, for the _UNPOOLED variant; falls back to
# the pooled URL itself rather than hard-failing if no unpooled var exists.
if [ -z "$DIRECT_DATABASE_URL" ]; then
  if [ -n "$DATABASE_URL_UNPOOLED" ]; then
    export DIRECT_DATABASE_URL="$DATABASE_URL_UNPOOLED"
  else
    fallback_unpooled=$(env | grep -E '^[A-Za-z_][A-Za-z0-9_]*_DATABASE_URL_UNPOOLED=' | head -n1 || true)
    if [ -n "$fallback_unpooled" ]; then
      export DIRECT_DATABASE_URL="${fallback_unpooled#*=}"
    else
      export DIRECT_DATABASE_URL="$DATABASE_URL"
    fi
  fi
fi

npx prisma migrate deploy

if [ "$RUN_SEED_ON_BUILD" = "true" ]; then
  npm run seed:build
fi

npx next build
