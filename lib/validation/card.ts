import { z } from "zod";

/**
 * Zod schemas for the card form.
 *
 * Color is a 6-digit hex string (e.g. "#a855f7") — free-form, not from a
 * fixed palette. Migration 0002_hex_colors.sql converted previous enum
 * values to canonical hex.
 */

export const CARD_TYPES = ["credit", "account"] as const;
export type CardType = (typeof CARD_TYPES)[number];

const dayPattern = /^([1-9]|[12]\d|3[01])$/;
const amountPattern = /^\d+(\.\d{1,2})?$/;
const hexPattern = /^#[0-9a-fA-F]{6}$/;

// ---------------------------------------------------------------------------
// Form schema — used by React Hook Form. All fields are strings or booleans.
// ---------------------------------------------------------------------------

export const cardFormSchema = z
  .object({
    name: z.string().trim().min(1, "name is required"),
    type: z.enum(CARD_TYPES),
    bank: z.string(),
    defaultClosingDay: z.string().refine((v) => v === "" || dayPattern.test(v), {
      message: "between 1 and 31",
    }),
    dueDay: z.string().refine((v) => v === "" || dayPattern.test(v), {
      message: "between 1 and 31",
    }),
    limitAmount: z.string().refine((v) => v === "" || amountPattern.test(v.trim()), {
      message: "use 1234.56 format (period as decimal)",
    }),
    color: z.string().refine((v) => hexPattern.test(v), {
      message: "use a hex color like #a855f7",
    }),
    isActive: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.type !== "credit") return;
    if (data.defaultClosingDay === "") {
      ctx.addIssue({
        code: "custom",
        path: ["defaultClosingDay"],
        message: "required for credit cards",
      });
    }
    if (data.dueDay === "") {
      ctx.addIssue({ code: "custom", path: ["dueDay"], message: "required for credit cards" });
    }
    if (data.limitAmount.trim() === "") {
      ctx.addIssue({
        code: "custom",
        path: ["limitAmount"],
        message: "required for credit cards",
      });
    }
  });

export type CardFormInput = z.infer<typeof cardFormSchema>;

// ---------------------------------------------------------------------------
// Action schema — applied on the server side; normalises into DB-shaped data.
// ---------------------------------------------------------------------------

export type CardActionData = {
  name: string;
  type: CardType;
  bank: string | null;
  defaultClosingDay: number | null;
  dueDay: number | null;
  limitAmount: string | null;
  color: string;
  isActive: boolean;
};

export function normaliseCardForm(input: CardFormInput): CardActionData {
  return {
    name: input.name.trim(),
    type: input.type,
    bank: input.bank.trim() === "" ? null : input.bank.trim(),
    defaultClosingDay: input.defaultClosingDay === "" ? null : Number(input.defaultClosingDay),
    dueDay: input.dueDay === "" ? null : Number(input.dueDay),
    limitAmount: input.limitAmount.trim() === "" ? null : input.limitAmount.trim(),
    color: input.color.toLowerCase(),
    isActive: input.isActive,
  };
}
