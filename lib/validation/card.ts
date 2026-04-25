import { z } from "zod";

/**
 * Zod schemas for the card form.
 *
 * Two schemas: cardFormSchema is what the React Hook Form sees — pure
 * strings/booleans, no transforms — so RHF's type inference stays clean.
 * cardActionSchema is what Server Actions parse on save; it normalises the
 * empty strings into nulls and coerces the day fields into integers,
 * matching the Drizzle schema (lib/db/schema.ts) for the cards table.
 *
 * The invariant from arch section 5.2.1 is enforced in both: credit cards
 * must have a closing day, due day, and limit; accounts may leave them
 * empty.
 */

export const CARD_TYPES = ["credit", "account"] as const;

export const CARD_COLORS = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "brown",
  "gray",
] as const;

export type CardType = (typeof CARD_TYPES)[number];
export type CardColor = (typeof CARD_COLORS)[number];

const dayPattern = /^([1-9]|[12]\d|3[01])$/;
const amountPattern = /^\d+(\.\d{1,2})?$/;

// ---------------------------------------------------------------------------
// Form schema — used by React Hook Form. All fields are strings or booleans.
// ---------------------------------------------------------------------------

export const cardFormSchema = z
  .object({
    name: z.string().trim().min(1, "Informe o nome do cartão"),
    type: z.enum(CARD_TYPES),
    bank: z.string(),
    defaultClosingDay: z.string().refine((v) => v === "" || dayPattern.test(v), {
      message: "Entre 1 e 31",
    }),
    dueDay: z.string().refine((v) => v === "" || dayPattern.test(v), {
      message: "Entre 1 e 31",
    }),
    limitAmount: z.string().refine((v) => v === "" || amountPattern.test(v.trim()), {
      message: "Use o formato 1234.56 (ponto como separador decimal)",
    }),
    color: z.enum(CARD_COLORS),
    isActive: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.type !== "credit") return;
    if (data.defaultClosingDay === "") {
      ctx.addIssue({
        code: "custom",
        path: ["defaultClosingDay"],
        message: "Obrigatório para crédito",
      });
    }
    if (data.dueDay === "") {
      ctx.addIssue({ code: "custom", path: ["dueDay"], message: "Obrigatório para crédito" });
    }
    if (data.limitAmount.trim() === "") {
      ctx.addIssue({
        code: "custom",
        path: ["limitAmount"],
        message: "Obrigatório para crédito",
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
  color: CardColor;
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
    color: input.color,
    isActive: input.isActive,
  };
}
