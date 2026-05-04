import { z } from "zod";

export const HABIT_POLARITIES = ["do", "avoid"] as const;
export type HabitPolarity = (typeof HABIT_POLARITIES)[number];

export const HABIT_POLARITY_LABEL: Record<HabitPolarity, string> = {
  do: "do",
  avoid: "avoid",
};

export const HABIT_SCHEDULES = ["daily", "weekly_target"] as const;
export type HabitSchedule = (typeof HABIT_SCHEDULES)[number];

export const HABIT_SCHEDULE_LABEL: Record<HabitSchedule, string> = {
  daily: "every day",
  weekly_target: "n times per week",
};

const hexPattern = /^#[0-9a-fA-F]{6}$/;

export const habitFormSchema = z
  .object({
    name: z.string().trim().min(1, "name is required"),
    description: z.string().max(280),
    categoryId: z.string().refine((v) => v === "" || /^[0-9a-fA-F-]{36}$/.test(v), {
      message: "invalid category",
    }),
    polarity: z.enum(HABIT_POLARITIES),
    schedule: z.enum(HABIT_SCHEDULES),
    targetPerWeek: z.string().refine((v) => v === "" || /^[1-7]$/.test(v), {
      message: "target per week must be 1-7",
    }),
    color: z
      .string()
      .refine((v) => hexPattern.test(v), { message: "use a hex color like #7e82aa" }),
    icon: z.string(),
    isActive: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.schedule === "weekly_target" && data.targetPerWeek === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetPerWeek"],
        message: "target is required for weekly schedule",
      });
    }
  });

export type HabitFormInput = z.infer<typeof habitFormSchema>;

export type HabitActionData = {
  name: string;
  description: string | null;
  categoryId: string | null;
  polarity: HabitPolarity;
  schedule: HabitSchedule;
  targetPerWeek: number | null;
  color: string;
  icon: string | null;
  isActive: boolean;
};

export function normaliseHabitForm(input: HabitFormInput): HabitActionData {
  return {
    name: input.name.trim(),
    description: input.description.trim() === "" ? null : input.description.trim(),
    categoryId: input.categoryId === "" ? null : input.categoryId,
    polarity: input.polarity,
    schedule: input.schedule,
    targetPerWeek:
      input.schedule === "weekly_target" && input.targetPerWeek !== ""
        ? Number(input.targetPerWeek)
        : null,
    color: input.color.toLowerCase(),
    icon: input.icon.trim() === "" ? null : input.icon.trim(),
    isActive: input.isActive,
  };
}

/* ─── habit category ─── */

export const habitCategoryFormSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  color: z.string().refine((v) => hexPattern.test(v), { message: "use a hex color like #7e82aa" }),
  icon: z.string(),
});

export type HabitCategoryFormInput = z.infer<typeof habitCategoryFormSchema>;
