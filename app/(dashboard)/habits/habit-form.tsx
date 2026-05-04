"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { IconPicker } from "@/components/ui/icon-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createHabit, updateHabit } from "@/lib/actions/habits";
import type { HabitCategoryRow, HabitWithCategory } from "@/lib/queries/habits";
import {
  HABIT_POLARITIES,
  HABIT_POLARITY_LABEL,
  HABIT_SCHEDULE_LABEL,
  HABIT_SCHEDULES,
  habitFormSchema,
  type HabitFormInput,
} from "@/lib/validation/habit";

type Props = {
  habit?: HabitWithCategory;
  categories: HabitCategoryRow[];
  onSuccess: () => void;
};

const NO_CATEGORY = "__none__";

export function HabitForm({ habit, categories, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<HabitFormInput>({
    resolver: zodResolver(habitFormSchema),
    defaultValues: habit
      ? {
          name: habit.name,
          description: habit.description ?? "",
          categoryId: habit.categoryId ?? "",
          polarity: habit.polarity,
          schedule: habit.schedule,
          targetPerWeek: habit.targetPerWeek != null ? String(habit.targetPerWeek) : "",
          color: habit.color,
          icon: habit.icon ?? "",
          isActive: habit.isActive,
        }
      : {
          name: "",
          description: "",
          categoryId: "",
          polarity: "do",
          schedule: "daily",
          targetPerWeek: "",
          color: "#7e82aa",
          icon: "",
          isActive: true,
        },
  });

  const schedule = form.watch("schedule");
  const polarity = form.watch("polarity");

  const polarityLabels: Record<string, string> = {
    do: "do — log when I do it",
    avoid: "avoid — log when I stay clean",
  };
  const scheduleLabels: Record<string, string> = {
    daily: HABIT_SCHEDULE_LABEL.daily,
    weekly_target: HABIT_SCHEDULE_LABEL.weekly_target,
  };

  const categoryLabels: Record<string, string> = Object.fromEntries([
    [NO_CATEGORY, "no category"] as const,
    ...categories.map((c) => [c.id, c.name] as const),
  ]);

  function onSubmit(values: HabitFormInput) {
    startTransition(async () => {
      const result = habit ? await updateHabit(habit.id, values) : await createHabit(values);
      if (result.ok) {
        toast.success(habit ? "habit updated." : "habit created.");
        onSuccess();
        return;
      }
      if (result.fieldErrors) {
        for (const [path, messages] of Object.entries(result.fieldErrors)) {
          form.setError(path as keyof HabitFormInput, {
            type: "server",
            message: messages.join(", "),
          });
        }
      }
      toast.error(result.error);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="h-name">name</FieldLabel>
          <Input
            id="h-name"
            placeholder="ex: read 30 minutes"
            disabled={isPending}
            {...form.register("name")}
          />
          {form.formState.errors.name && (
            <FieldError>{form.formState.errors.name.message}</FieldError>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="h-description">description</FieldLabel>
          <Input
            id="h-description"
            placeholder="optional — what does success look like?"
            disabled={isPending}
            {...form.register("description")}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="h-polarity">polarity</FieldLabel>
            <Controller
              control={form.control}
              name="polarity"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isPending}
                  items={polarityLabels}
                >
                  <SelectTrigger id="h-polarity" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HABIT_POLARITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {polarityLabels[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldDescription>
              {polarity === "do"
                ? "checks count when you do it."
                : "checks count when you successfully avoid it."}
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="h-schedule">schedule</FieldLabel>
            <Controller
              control={form.control}
              name="schedule"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isPending}
                  items={scheduleLabels}
                >
                  <SelectTrigger id="h-schedule" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HABIT_SCHEDULES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {scheduleLabels[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>

        {schedule === "weekly_target" && (
          <Field>
            <FieldLabel htmlFor="h-target">times per week</FieldLabel>
            <Input
              id="h-target"
              type="number"
              min={1}
              max={7}
              disabled={isPending}
              {...form.register("targetPerWeek")}
            />
            <FieldDescription>1 to 7 — no fixed days, just a weekly count.</FieldDescription>
            {form.formState.errors.targetPerWeek && (
              <FieldError>{form.formState.errors.targetPerWeek.message}</FieldError>
            )}
          </Field>
        )}

        <Field>
          <FieldLabel htmlFor="h-category">category</FieldLabel>
          <Controller
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <Select
                value={field.value === "" ? NO_CATEGORY : field.value}
                onValueChange={(v) => field.onChange(v === NO_CATEGORY ? "" : v)}
                disabled={isPending}
                items={categoryLabels}
              >
                <SelectTrigger id="h-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY}>no category</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {categories.length === 0 && (
            <FieldDescription>
              create a category first in the categories page if you want to group habits.
            </FieldDescription>
          )}
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="h-icon">icon</FieldLabel>
            <Controller
              control={form.control}
              name="icon"
              render={({ field }) => (
                <IconPicker
                  id="h-icon"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isPending}
                />
              )}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="h-color">color</FieldLabel>
            <Controller
              control={form.control}
              name="color"
              render={({ field }) => (
                <ColorPicker
                  id="h-color"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isPending}
                />
              )}
            />
            {form.formState.errors.color && (
              <FieldError>{form.formState.errors.color.message}</FieldError>
            )}
          </Field>
        </div>

        <Field>
          <label className="border-border bg-muted/20 flex cursor-pointer items-start gap-3 rounded-md border p-3">
            <input
              type="checkbox"
              checked={form.watch("isActive")}
              disabled={isPending}
              onChange={(e) => form.setValue("isActive", e.target.checked, { shouldDirty: true })}
              className="border-input mt-0.5 size-4 rounded border accent-current"
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-foreground text-[13px] font-medium">active</span>
              <span className="text-muted-foreground text-[11.5px]">
                inactive habits stop showing in the today view but keep their history.
              </span>
            </span>
          </label>
        </Field>
      </FieldGroup>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onSuccess} disabled={isPending}>
          cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "saving..." : habit ? "save" : "create"}
        </Button>
      </div>
    </form>
  );
}
