import { z } from "zod";

export const LOAN_TYPES = ["pix", "debit", "cash"] as const;
export type LoanType = (typeof LOAN_TYPES)[number];

export const LOAN_TYPE_LABEL: Record<LoanType, string> = {
  pix: "Pix",
  debit: "Débito",
  cash: "Dinheiro",
};

const amountPattern = /^\d+(\.\d{1,2})?$/;

export const cashReceivableFormSchema = z.object({
  description: z.string().trim().min(1, "Informe a descrição"),
  loanType: z.enum(LOAN_TYPES),
  amount: z.string().refine((v) => amountPattern.test(v.trim()), {
    message: "Use o formato 1234.56 (ponto como separador decimal)",
  }),
  loanDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  expectedPaymentMonth: z.string().regex(/^\d{4}-\d{2}$/, "Mês inválido (AAAA-MM)"),
  isPaid: z.boolean(),
  actualPaymentDate: z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), {
    message: "Data inválida",
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
