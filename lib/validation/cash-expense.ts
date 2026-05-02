import { z } from "zod";

export const CASH_METHODS = ["pix", "debit", "cash"] as const;
export type CashMethod = (typeof CASH_METHODS)[number];

export const CASH_METHOD_LABEL: Record<CashMethod, string> = {
  pix: "pix",
  debit: "debit",
  cash: "cash",
};

const amountPattern = /^\d+(\.\d{1,2})?$/;

export const cashExpenseFormSchema = z.object({
  description: z.string().trim().min(1, "description is required"),
  cardId: z.string().uuid("select an account"),
  method: z.enum(CASH_METHODS),
  subcategoryId: z.string().uuid("select a subcategory"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "invalid date"),
  amount: z.string().refine((v) => amountPattern.test(v.trim()), {
    message: "use 1234.56 format (period as decimal)",
  }),
});

export type CashExpenseFormInput = z.infer<typeof cashExpenseFormSchema>;

export type CashExpenseActionData = {
  description: string;
  cardId: string;
  method: CashMethod;
  subcategoryId: string;
  date: string;
  amount: string;
};

export function normaliseCashExpenseForm(input: CashExpenseFormInput): CashExpenseActionData {
  return {
    description: input.description.trim(),
    cardId: input.cardId,
    method: input.method,
    subcategoryId: input.subcategoryId,
    date: input.date,
    amount: input.amount.trim(),
  };
}
