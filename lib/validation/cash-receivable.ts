import { z } from "zod";

export const LOAN_TYPES = ["pix", "debit", "cash"] as const;
export type LoanType = (typeof LOAN_TYPES)[number];

export const LOAN_TYPE_LABEL: Record<LoanType, string> = {
  pix: "pix",
  debit: "debit",
  cash: "cash",
};

const amountPattern = /^\d+(\.\d{1,2})?$/;

export const cashReceivableFormSchema = z.object({
  description: z.string().trim().min(1, "description is required"),
  loanType: z.enum(LOAN_TYPES),
  amount: z.string().refine((v) => amountPattern.test(v.trim()), {
    message: "use 1234.56 format (period as decimal)",
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
    amount: input.amount.trim(),
    loanDate: input.loanDate,
    expectedPaymentMonth: `${input.expectedPaymentMonth}-01`,
    isPaid: input.isPaid,
    actualPaymentDate: input.actualPaymentDate === "" ? null : input.actualPaymentDate,
  };
}
