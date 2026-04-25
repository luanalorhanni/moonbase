import { z } from "zod";

const amountPattern = /^\d+(\.\d{1,2})?$/;

export const liquidSavingsFormSchema = z.object({
  title: z.string().trim().min(1, "Informe o nome"),
  bank: z.string().trim().min(1, "Informe o banco"),
  applicationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  appliedAmount: z.string().refine((v) => amountPattern.test(v.trim()), {
    message: "Use o formato 1234.56 (ponto como separador decimal)",
  }),
  latestYield: z.string().refine((v) => v.trim() === "" || amountPattern.test(v.trim()), {
    message: "Use o formato 1234.56",
  }),
  lastUpdateDate: z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), {
    message: "Data inválida",
  }),
  isActive: z.boolean(),
});

export type LiquidSavingsFormInput = z.infer<typeof liquidSavingsFormSchema>;

export type LiquidSavingsActionData = {
  title: string;
  bank: string;
  applicationDate: string;
  appliedAmount: string;
  latestYield: string;
  lastUpdateDate: string | null;
  isActive: boolean;
};

export function normaliseLiquidSavingsForm(input: LiquidSavingsFormInput): LiquidSavingsActionData {
  return {
    title: input.title.trim(),
    bank: input.bank.trim(),
    applicationDate: input.applicationDate,
    appliedAmount: input.appliedAmount.trim(),
    latestYield: input.latestYield.trim() === "" ? "0" : input.latestYield.trim(),
    lastUpdateDate: input.lastUpdateDate === "" ? null : input.lastUpdateDate,
    isActive: input.isActive,
  };
}

export const fixedIncomeFormSchema = z.object({
  title: z.string().trim().min(1, "Informe o nome"),
  bank: z.string().trim().min(1, "Informe o banco"),
  applicationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  maturityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  appliedAmount: z.string().refine((v) => amountPattern.test(v.trim()), {
    message: "Use o formato 1234.56 (ponto como separador decimal)",
  }),
  latestYield: z.string().refine((v) => v.trim() === "" || amountPattern.test(v.trim()), {
    message: "Use o formato 1234.56",
  }),
  lastUpdateDate: z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), {
    message: "Data inválida",
  }),
  isActive: z.boolean(),
});

export type FixedIncomeFormInput = z.infer<typeof fixedIncomeFormSchema>;

export type FixedIncomeActionData = {
  title: string;
  bank: string;
  applicationDate: string;
  maturityDate: string;
  appliedAmount: string;
  latestYield: string;
  lastUpdateDate: string | null;
  isActive: boolean;
};

export function normaliseFixedIncomeForm(input: FixedIncomeFormInput): FixedIncomeActionData {
  return {
    title: input.title.trim(),
    bank: input.bank.trim(),
    applicationDate: input.applicationDate,
    maturityDate: input.maturityDate,
    appliedAmount: input.appliedAmount.trim(),
    latestYield: input.latestYield.trim() === "" ? "0" : input.latestYield.trim(),
    lastUpdateDate: input.lastUpdateDate === "" ? null : input.lastUpdateDate,
    isActive: input.isActive,
  };
}
