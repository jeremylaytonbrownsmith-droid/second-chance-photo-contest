-- Sharing is now automatic on approval (see the approve route) instead of
-- a separate manual admin step. Backfill existing APPROVED entries so
-- pets already live in the gallery aren't left behind the new default.
UPDATE "entries" SET "shareApproved" = true WHERE "status" = 'APPROVED';
