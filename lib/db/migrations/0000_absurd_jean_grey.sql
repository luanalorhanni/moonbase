CREATE TYPE "public"."card_type" AS ENUM('credit', 'account');--> statement-breakpoint
CREATE TYPE "public"."cash_method" AS ENUM('pix', 'debit', 'cash');--> statement-breakpoint
CREATE TYPE "public"."color" AS ENUM('red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown', 'gray');--> statement-breakpoint
CREATE TYPE "public"."income_type" AS ENUM('salary', 'research_grant', 'refund', 'fee', 'sale', 'other');--> statement-breakpoint
CREATE TYPE "public"."loan_type" AS ENUM('pix', 'debit', 'cash');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'credit');--> statement-breakpoint
CREATE TYPE "public"."snapshot_status" AS ENUM('locked', 'draft');--> statement-breakpoint
CREATE TABLE "card_closings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"reference_month" date NOT NULL,
	"closing_day" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "card_closings_card_month_unique" UNIQUE("card_id","reference_month")
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "card_type" NOT NULL,
	"bank" text,
	"default_closing_day" integer,
	"due_day" integer,
	"limit_amount" numeric(12, 2),
	"color" "color" DEFAULT 'gray' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"description" text NOT NULL,
	"card_id" uuid NOT NULL,
	"method" "cash_method" NOT NULL,
	"subcategory_id" uuid NOT NULL,
	"date" date NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"original_spreadsheet_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_receivables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"description" text NOT NULL,
	"loan_type" "loan_type" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"loan_date" date NOT NULL,
	"expected_payment_month" date NOT NULL,
	"is_paid" boolean DEFAULT false NOT NULL,
	"actual_payment_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" "color" DEFAULT 'gray' NOT NULL,
	"icon" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"description" text NOT NULL,
	"card_id" uuid NOT NULL,
	"subcategory_id" uuid NOT NULL,
	"purchase_date" date NOT NULL,
	"total_parcels" integer NOT NULL,
	"parcel_value" numeric(12, 2) NOT NULL,
	"first_parcel_date" date,
	"last_parcel_date" date,
	"first_parcel_month" date,
	"last_parcel_month" date,
	"manual_override" boolean DEFAULT false NOT NULL,
	"original_spreadsheet_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_receivables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"description" text NOT NULL,
	"card_id" uuid NOT NULL,
	"purchase_date" date NOT NULL,
	"total_parcels" integer NOT NULL,
	"parcel_value" numeric(12, 2) NOT NULL,
	"first_parcel_date" date,
	"last_parcel_date" date,
	"first_parcel_month" date,
	"last_parcel_month" date,
	"manual_override" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fixed_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"description" text NOT NULL,
	"card_id" uuid NOT NULL,
	"subcategory_id" uuid NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"monthly_amount" numeric(12, 2) NOT NULL,
	"due_day" integer,
	"start_date" date NOT NULL,
	"end_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fixed_income" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"bank" text NOT NULL,
	"application_date" date NOT NULL,
	"maturity_date" date NOT NULL,
	"applied_amount" numeric(12, 2) NOT NULL,
	"latest_yield" numeric(12, 2) DEFAULT '0' NOT NULL,
	"last_update_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"description" text NOT NULL,
	"type" "income_type" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"date" date NOT NULL,
	"original_spreadsheet_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "liquid_savings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"bank" text NOT NULL,
	"application_date" date NOT NULL,
	"applied_amount" numeric(12, 2) NOT NULL,
	"latest_yield" numeric(12, 2) DEFAULT '0' NOT NULL,
	"last_update_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"month_label" text NOT NULL,
	"reference_month" date NOT NULL,
	"total_incomes" numeric(12, 2) NOT NULL,
	"total_expenses" numeric(12, 2) NOT NULL,
	"total_save" numeric(12, 2) NOT NULL,
	"total_liquid_savings" numeric(12, 2) NOT NULL,
	"total_fixed_income" numeric(12, 2) NOT NULL,
	"status" "snapshot_status" DEFAULT 'locked' NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "monthly_snapshots_user_month_unique" UNIQUE("user_id","reference_month")
);
--> statement-breakpoint
CREATE TABLE "subcategories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "card_closings" ADD CONSTRAINT "card_closings_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_expenses" ADD CONSTRAINT "cash_expenses_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_expenses" ADD CONSTRAINT "cash_expenses_subcategory_id_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_expenses" ADD CONSTRAINT "credit_expenses_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_expenses" ADD CONSTRAINT "credit_expenses_subcategory_id_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_receivables" ADD CONSTRAINT "credit_receivables_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_expenses" ADD CONSTRAINT "fixed_expenses_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_expenses" ADD CONSTRAINT "fixed_expenses_subcategory_id_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;