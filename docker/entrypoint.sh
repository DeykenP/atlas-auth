#!/bin/sh
set -e

# Apply any pending migrations before starting. This is a no-op when the
# schema is already current, and Prisma takes an advisory lock so concurrent
# replicas booting at once can't race each other.
npx prisma migrate deploy

exec node dist/main.js
