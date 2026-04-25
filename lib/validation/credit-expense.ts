import { z } from "zod";

const amountPattern = /^\d+(\.\d{1,2})?$/;

export const creditExpenseFormSchema = z.object({
  description: z.string().trim().min(1, "Informe a descrição"),
  cardId: z.string().uuid("Selecione um cartão de crédito"),
  subcategoryId: z.string().uuid("Selecione uma subcategoria"),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  totalParcels: z
    .string()
    .regex(/^[1-9]\d*$/, "Mínimo 1 parcela")
    .refine((v) => parseInt(v, 10) <= 360, "Máximo 360 parcelas"),
  parcelValue: z.string().refine((v) => amountPattern.test(v.trim()), {
    message: "Use o formato 1234.56 (ponto como separador decimal)",
  }),
  manualOverride: z.boolean(),
});

export type CreditExpenseFormInput = z.infer<typeof creditExpenseFormSchema>;

export type CreditExpenseActionData = {
  description: string;
  cardId: string;
  subcategoryId: string;
  purchaseDate: string;
  totalParcels: number;
  parcelValue: string;
  manualOverride: boolean;
};

export function normaliseCreditExpenseForm(
  input: CreditExpenseFormInput,
): CreditExpenseActionData {
  return {
    description: input.description.trim(),
    cardId: input.cardId,
    subcategoryId: input.subcategoryId,
    purchaseDate: input.purchaseDate,
    totalParcels: parseInt(input.totalParcels, 10),
    parcelValue: input.parcelValue.trim(),
    manualOverride: input.manualOverride,
  };
}
