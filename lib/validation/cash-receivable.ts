import { z } from "zod";

import { AMOUNT_ERROR_MESSAGE, isValidAmountInput, toApiAmount } from "./amount";

export const LOAN_TYPES = ["pix", "debit", "cash"] as const;
export type LoanType = (typeof LOAN_TYPES)[number];

export const LOAN_TYPE_LABEL: Record<LoanType, string> = {
  pix: "pix",
  debit: "debit",
  cash: "cash",
};

export const cashReceivableFormSchema = z.object({
  description: z.string().trim().min(1, "description is required"),
  loanType: z.enum(LOAN_TYPES),
  amount: z.string().refine((v) => isValidAmountInput(v), {
    message: AMOUNT_ERROR_MESSAGE,
  }),
  loanDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "invalid date"),
  expectedPaymentMonth: z.string().regex(/^\d{4}-\d{2}$/, "invalid month (yyyy-mm)"),
  isPaid: z.boolean(),
  actualPaymentDate: z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), {
    message: "invalid date",
  }),
});

export type CashReceivableFormInput = z.infer<typeof cashReceivableFormSchema>;

export type CashReceivableActionData = {
  description: string;
  loanType: LoanType;
  amount: string;
  loanDate: string;
  expectedPaymentMonth: string;
  isPaid: boolean;
  actualPaymentDate: string | null;
};

export function normaliseCashReceivableForm(
  input: CashReceivableFormInput,
): CashReceivableActionData {
  return {
    description: input.description.trim(),
    loanType: input.loanType,
    amount: toApiAmount(input.amount),
    loanDate: input.loanDate,
    expectedPaymentMonth: `${input.expectedPaymentMonth}-01`,
    isPaid: input.isPaid,
    actualPaymentDate: input.actualPaymentDate === "" ? null : input.actualPaymentDate,
  };
}
