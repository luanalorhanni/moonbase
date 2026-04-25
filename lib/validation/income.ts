import { z } from "zod";

export const INCOME_TYPES = ["salary", "research_grant", "refund", "fee", "sale", "other"] as const;
export type IncomeType = (typeof INCOME_TYPES)[number];

export const INCOME_TYPE_LABEL: Record<IncomeType, string> = {
  salary: "Salário",
  research_grant: "Bolsa de pesquisa",
  refund: "Reembolso",
  fee: "Honorário",
  sale: "Venda",
  other: "Outro",
};

const amountPattern = /^\d+(\.\d{1,2})?$/;

export const incomeFormSchema = z.object({
  description: z.string().trim().min(1, "Informe a descrição"),
  type: z.enum(INCOME_TYPES),
  amount: z.string().refine((v) => amountPattern.test(v.trim()), {
    message: "Use o formato 1234.56 (ponto como separador decimal)",
  }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
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
