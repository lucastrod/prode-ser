-- =========================================================================
-- PRODE SER 2026 - SCHEMA INITIALIZATION SCRIPT FOR NEON POSTGRESQL
-- =========================================================================

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "Stage" AS ENUM ('GROUP', 'ROUND_32', 'ROUND_16', 'QUARTER', 'SEMI', 'THIRD_PLACE', 'FINAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'LIVE', 'FINISHED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable (users)
CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_token" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable (matches)
CREATE TABLE IF NOT EXISTS "matches" (
    "id" SERIAL NOT NULL,
    "external_match_id" TEXT,
    "home_team" TEXT NOT NULL,
    "away_team" TEXT NOT NULL,
    "match_date" TIMESTAMP(3) NOT NULL,
    "group_name" TEXT NOT NULL,
    "stage" "Stage" NOT NULL DEFAULT 'GROUP',
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "home_score" INTEGER,
    "away_score" INTEGER,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable (predictions)
CREATE TABLE IF NOT EXISTS "predictions" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "match_id" INTEGER NOT NULL,
    "predicted_home_score" INTEGER NOT NULL,
    "predicted_away_score" INTEGER NOT NULL,
    "points" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable (standings)
CREATE TABLE IF NOT EXISTS "standings" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "exact_scores" INTEGER NOT NULL DEFAULT 0,
    "correct_outcomes" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "standings_pkey" PRIMARY KEY ("id")
);

-- CreateTable (prizes)
CREATE TABLE IF NOT EXISTS "prizes" (
    "id" SERIAL NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "prizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable (health_checks)
CREATE TABLE IF NOT EXISTS "health_checks" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "last_ping" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "matches_external_match_id_key" ON "matches"("external_match_id");
CREATE UNIQUE INDEX IF NOT EXISTS "predictions_user_id_match_id_key" ON "predictions"("user_id", "match_id");
CREATE UNIQUE INDEX IF NOT EXISTS "standings_user_id_key" ON "standings"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "prizes_position_key" ON "prizes"("position");

-- AddForeignKey (Foreign Keys)
ALTER TABLE "predictions" DROP CONSTRAINT IF EXISTS "predictions_user_id_fkey";
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "predictions" DROP CONSTRAINT IF EXISTS "predictions_match_id_fkey";
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "standings" DROP CONSTRAINT IF EXISTS "standings_user_id_fkey";
ALTER TABLE "standings" ADD CONSTRAINT "standings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- =========================================================================
-- SEED INITIAL DATA (ADMINS, PRIZES & HEALTH CHECK)
-- =========================================================================

-- Clean previous seeds to prevent duplicate keys if re-running
DELETE FROM "standings";
DELETE FROM "users";
DELETE FROM "prizes";
DELETE FROM "health_checks";

-- Default Admin Password is 'admin123'
-- Hash generated using bcrypt: $2a$10$dJ/zC9v9D.M9z.Gv9Z6dOuxV.E7u4PZt9.2847.6749.123456789
INSERT INTO "users" ("id", "name", "email", "password_hash", "role", "active", "email_verified")
VALUES 
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Lucas Admin', 'lucas.admin@prodeser.com', '$2a$10$vDpx1ZlH76V.VfB1o274ue5m74b7HhZ7W06wZ1N1.G/eH3P.4D/S6', 'ADMIN', true, true),
    ('b1ffcd88-8d1a-5fe9-ac7e-7cc0ce491b22', 'Gonzalo Admin', 'gonzalo.admin@prodeser.com', '$2a$10$vDpx1ZlH76V.VfB1o274ue5m74b7HhZ7W06wZ1N1.G/eH3P.4D/S6', 'ADMIN', true, true);

INSERT INTO "standings" ("user_id", "total_points", "exact_scores", "correct_outcomes", "updated_at")
VALUES 
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 0, 0, 0, NOW()),
    ('b1ffcd88-8d1a-5fe9-ac7e-7cc0ce491b22', 0, 0, 0, NOW());

INSERT INTO "prizes" ("position", "title", "description", "enabled")
VALUES
    (1, '🥇 Primer Puesto', 'Cena para dos personas en restaurant premium.', true),
    (2, '🥈 Segundo Puesto', 'Gift Card SER de $50,000.', true),
    (3, '🥉 Tercer Puesto', 'Kit Mundialista SER (Remera, Gorra, Termo).', true);

INSERT INTO "health_checks" ("id", "last_ping")
VALUES (1, NOW());
