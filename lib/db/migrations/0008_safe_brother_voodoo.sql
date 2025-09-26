CREATE TABLE IF NOT EXISTS "InviteCodeUsage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"usedBy" varchar(128) NOT NULL,
	"userEmail" varchar(64) NOT NULL,
	"usedAt" timestamp DEFAULT now() NOT NULL,
	"ipAddress" varchar(45),
	"userAgent" text
);
--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "firebaseUid" varchar(128);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "authProvider" varchar(20) DEFAULT 'firebase' NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "displayName" varchar(100);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "avatarUrl" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;