import { z } from "zod";

export const CASH_METHODS = ["pix", "debit", "cash"] as const;
export type CashMethod = (typeof CASH_METHODS)[number];

export const CASH_METHOD_LABEL: Record<CashMethod, string> = {
  pix: "Pix",
  debit: "Débito",
  cash: "Dinheiro",
};

const amountPattern = /^\d+(\.\d{1,2})?$/;

export const cashExpenseFormSchema = z.object({
  description: z.string().trim().min(1, "Informe a descrição"),
  cardId: z.string().uuid("Selecione um cartão"),
  method: z.enum(CASH_METHODS),
  subcategoryId: z.string().uuid("Selecione uma subcategoria"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  amount: z.string().refine((v) => amountPattern.test(v.trim()), {
    message: "Use o formato 1234.56 (ponto como separador decimal)",
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
