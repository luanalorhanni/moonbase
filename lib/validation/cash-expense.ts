import { z } from "zod";

import { AMOUNT_ERROR_MESSAGE, isValidAmountInput, toApiAmount } from "./amount";

export const CASH_METHODS = ["pix", "debit", "cash"] as const;
export type CashMethod = (typeof CASH_METHODS)[number];

export const CASH_METHOD_LABEL: Record<CashMethod, string> = {
  pix: "pix",
  debit: "debit",
  cash: "cash",
};

export const cashExpenseFormSchema = z.object({
  description: z.string().trim().min(1, "description is required"),
  cardId: z.string().uuid("select an account"),
  method: z.enum(CASH_METHODS),
  subcategoryId: z.string().uuid("select a subcategory"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "invalid date"),
  amount: z.string().refine((v) => isValidAmountInput(v), {
    message: AMOUNT_ERROR_MESSAGE,
  }),
  /** Id of the liquid_savings the expense was drawn from. Empty string =
   *  not from cofrinho (mirrors how RHF text inputs handle null). */
  liquidSavingsId: z.string().refine((v) => v === "" || /^[0-9a-fA-F-]{36}$/.test(v), {
    message: "invalid liquid savings reference",
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
  liquidSavingsId: string | null;
};

export function normaliseCashExpenseForm(input: CashExpenseFormInput): CashExpenseActionData {
  return {
    description: input.description.trim(),
    cardId: input.cardId,
    method: input.method,
    subcategoryId: input.subcategoryId,
    date: input.date,
    amount: toApiAmount(input.amount),
    liquidSavingsId: input.liquidSavingsId.trim() !== "" ? input.liquidSavingsId : null,
  };
}
