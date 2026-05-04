import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "data inválida (esperado yyyy-mm-dd)");

const moneyString = z
  .string()
  .trim()
  .min(1, "valor obrigatório.")
  .refine((v) => /^-?\d+([.,]\d{1,2})?$/.test(v), "valor inválido.")
  .transform((v) => v.replace(",", "."))
  .refine((v) => Number(v) >= 0, "valor não pode ser negativo.");

const trimmedNullable = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined) return null;
    const t = v.trim();
    return t.length === 0 ? null : t;
  });

export const investmentUpdateSchema = z.object({
  investmentKind: z.enum(["liquid_savings", "fixed_income"]),
  investmentId: z.string().uuid("id inválido."),
  recordedOn: isoDate,
  currentValue: moneyString,
  notes: trimmedNullable,
});

export type InvestmentUpdateInput = z.input<typeof investmentUpdateSchema>;
export type InvestmentUpdateParsed = z.output<typeof investmentUpdateSchema>;
