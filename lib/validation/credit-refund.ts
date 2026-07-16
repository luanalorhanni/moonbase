import { z } from "zod";

import { AMOUNT_ERROR_MESSAGE, isValidAmountInput, toApiAmount } from "./amount";

export const creditRefundFormSchema = z.object({
  creditExpenseId: z.string().uuid("select the refunded expense"),
  description: z.string().trim().max(200, "description too long").optional(),
  parcelValue: z.string().refine((v) => isValidAmountInput(v), {
    message: AMOUNT_ERROR_MESSAGE,
  }),
  totalParcels: z
    .string()
    .regex(/^[1-9]\d*$/, "min 1 installment")
    .refine((v) => parseInt(v, 10) <= 360, "max 360 installments"),
  // First invoice month the credit lands on, as `yyyy-mm` (from a month input).
  referenceMonth: z.string().regex(/^\d{4}-\d{2}$/, "invalid month"),
});

export type CreditRefundFormInput = z.infer<typeof creditRefundFormSchema>;

export type CreditRefundActionData = {
  creditExpenseId: string;
  description: string | null;
  parcelValue: string;
  totalParcels: number;
  /** Normalised to the first day of the month (`yyyy-mm-01`) for storage. */
  referenceMonth: string;
};

export function normaliseCreditRefundForm(input: CreditRefundFormInput): CreditRefundActionData {
  const description = input.description?.trim();
  return {
    creditExpenseId: input.creditExpenseId,
    description: description ? description : null,
    parcelValue: toApiAmount(input.parcelValue),
    totalParcels: parseInt(input.totalParcels, 10),
    referenceMonth: `${input.referenceMonth}-01`,
  };
}
