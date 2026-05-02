import { z } from "zod";

const hexPattern = /^#[0-9a-fA-F]{6}$/;

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  color: z.string().refine((v) => hexPattern.test(v), {
    message: "use a hex color like #a855f7",
  }),
  icon: z.string(),
});

export type CategoryFormInput = z.infer<typeof categoryFormSchema>;

export type CategoryActionData = {
  name: string;
  color: string;
  icon: string | null;
};

export function normaliseCategoryForm(input: CategoryFormInput): CategoryActionData {
  return {
    name: input.name.trim(),
    color: input.color.toLowerCase(),
    icon: input.icon.trim() === "" ? null : input.icon.trim(),
  };
}

export const subcategoryFormSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  categoryId: z.string().uuid("select a category"),
});

export type SubcategoryFormInput = z.infer<typeof subcategoryFormSchema>;
