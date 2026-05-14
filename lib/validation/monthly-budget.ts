import { z } from "zod";

const optionalAmount = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v === "" || /^\d+(\.\d{1,2})?$/.test(v), {
    message: "use 1234.56 format",
  });

export const monthlyBudgetFormSchema = z.object({
  maxTotal: optionalAmount,
  maxCredit: optionalAmount,
  maxCash: optionalAmount,
  /** Per-category entries — only rows with a non-empty maxAmount are saved. */
  categories: z.array(
    z.object({
      categoryId: z.string().uuid(),
      maxAmount: optionalAmount,
    }),
  ),
});

export type MonthlyBudgetFormInput = z.infer<typeof monthlyBudgetFormSchema>;
