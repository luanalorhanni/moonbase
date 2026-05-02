import { z } from "zod";

export const PAYMENT_METHODS = ["cash", "credit"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "cash",
  credit: "credit",
};

const amountPattern = /^\d+(\.\d{1,2})?$/;

export const fixedExpenseFormSchema = z.object({
  description: z.string().trim().min(1, "description is required"),
  cardId: z.string().uuid("select a card"),
  subcategoryId: z.string().uuid("select a subcategory"),
  paymentMethod: z.enum(PAYMENT_METHODS),
  monthlyAmount: z.string().refine((v) => amountPattern.test(v.trim()), {
    message: "use 1234.56 format (period as decimal)",
  }),
  dueDay: z
    .string()
    .refine(
      (v) =>
        v.trim() === "" ||
        (/^[1-9]\d*$/.test(v.trim()) &&
          parseInt(v.trim(), 10) >= 1 &&
          parseInt(v.trim(), 10) <= 31),
      { message: "invalid day (1–31)" },
    ),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "invalid date"),
  endDate: z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), {
    message: "invalid date",
  }),
  isActive: z.boolean(),
});

export type FixedExpenseFormInput = z.infer<typeof fixedExpenseFormSchema>;

export type FixedExpenseActionData = {
  description: string;
  cardId: string;
  subcategoryId: string;
  paymentMethod: PaymentMethod;
  monthlyAmount: string;
  dueDay: number | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
};

export function normaliseFixedExpenseForm(input: FixedExpenseFormInput): FixedExpenseActionData {
  return {
    description: input.description.trim(),
    cardId: input.cardId,
    subcategoryId: input.subcategoryId,
    paymentMethod: input.paymentMethod,
    monthlyAmount: input.monthlyAmount.trim(),
    dueDay: input.dueDay.trim() === "" ? null : parseInt(input.dueDay.trim(), 10),
    startDate: input.startDate,
    endDate: input.endDate === "" ? null : input.endDate,
    isActive: input.isActive,
  };
}
