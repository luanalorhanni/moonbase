import { z } from "zod";

export const PAYMENT_METHODS = ["cash", "credit"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "À vista",
  credit: "Crédito",
};

const amountPattern = /^\d+(\.\d{1,2})?$/;

export const fixedExpenseFormSchema = z.object({
  description: z.string().trim().min(1, "Informe a descrição"),
  cardId: z.string().uuid("Selecione um cartão"),
  subcategoryId: z.string().uuid("Selecione uma subcategoria"),
  paymentMethod: z.enum(PAYMENT_METHODS),
  monthlyAmount: z.string().refine((v) => amountPattern.test(v.trim()), {
    message: "Use o formato 1234.56 (ponto como separador decimal)",
  }),
  dueDay: z
    .string()
    .refine(
      (v) =>
        v.trim() === "" ||
        (/^[1-9]\d*$/.test(v.trim()) &&
          parseInt(v.trim(), 10) >= 1 &&
          parseInt(v.trim(), 10) <= 31),
      { message: "Dia inválido (1–31)" },
    ),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  endDate: z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), {
    message: "Data inválida",
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
