import { z } from "zod";

export const CATEGORY_COLORS = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "brown",
  "gray",
] as const;

export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da categoria"),
  color: z.enum(CATEGORY_COLORS),
  icon: z.string(),
});

export type CategoryFormInput = z.infer<typeof categoryFormSchema>;

export type CategoryActionData = {
  name: string;
  color: CategoryColor;
  icon: string | null;
};

export function normaliseCategoryForm(input: CategoryFormInput): CategoryActionData {
  return {
    name: input.name.trim(),
    color: input.color,
    icon: input.icon.trim() === "" ? null : input.icon.trim(),
  };
}

export const subcategoryFormSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da subcategoria"),
  categoryId: z.string().uuid("Selecione uma categoria"),
});

export type SubcategoryFormInput = z.infer<typeof subcategoryFormSchema>;
