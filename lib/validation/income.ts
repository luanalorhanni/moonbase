import { z } from "zod";

export const INCOME_TYPES = ["salary", "research_grant", "refund", "fee", "sale", "other"] as const;
export type IncomeType = (typeof INCOME_TYPES)[number];

export const INCOME_TYPE_LABEL: Record<IncomeType, string> = {
  salary: "salary",
  research_grant: "research grant",
  refund: "refund",
  fee: "fee",
  sale: "sale",
  other: "other",
};

const amountPattern = /^\d+(\.\d{1,2})?$/;

export const incomeFormSchema = z.object({
  description: z.string().trim().min(1, "description is required"),
  type: z.enum(INCOME_TYPES),
  amount: z.string().refine((v) => amountPattern.test(v.trim()), {
    message: "use 1234.56 format (period as decimal)",
  }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "invalid date"),
});

export type IncomeFormInput = z.infer<typeof incomeFormSchema>;

export type IncomeActionData = {
  description: string;
  type: IncomeType;
  amount: string;
  date: string;
};

export function normaliseIncomeForm(input: IncomeFormInput): IncomeActionData {
  return {
    description: input.description.trim(),
    type: input.type,
    amount: input.amount.trim(),
    date: input.date,
  };
}
