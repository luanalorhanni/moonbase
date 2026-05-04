import { z } from "zod";

const amountPattern = /^\d+(\.\d{1,2})?$/;

export const creditExpenseFormSchema = z.object({
  description: z.string().trim().min(1, "description is required"),
  cardId: z.string().uuid("select a credit card"),
  subcategoryId: z.string().uuid("select a subcategory"),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "invalid date"),
  totalParcels: z
    .string()
    .regex(/^[1-9]\d*$/, "min 1 installment")
    .refine((v) => parseInt(v, 10) <= 360, "max 360 installments"),
  parcelValue: z.string().refine((v) => amountPattern.test(v.trim()), {
    message: "use 1234.56 format (period as decimal)",
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

export function normaliseCreditExpenseForm(input: CreditExpenseFormInput): CreditExpenseActionData {
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
