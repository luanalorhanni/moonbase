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
import { createHabitCategory, updateHabitCategory } from "@/lib/actions/habits";
import type { HabitCategoryRow } from "@/lib/queries/habits";
import { habitCategoryFormSchema, type HabitCategoryFormInput } from "@/lib/validation/habit";

type Props = {
  category?: HabitCategoryRow;
  onSuccess: () => void;
};

export function HabitCategoryForm({ category, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<HabitCategoryFormInput>({
    resolver: zodResolver(habitCategoryFormSchema),
    defaultValues: category
      ? { name: category.name, color: category.color, icon: category.icon ?? "" }
      : { name: "", color: "#7e82aa", icon: "" },
  });

  function onSubmit(values: HabitCategoryFormInput) {
    startTransition(async () => {
      const result = category
        ? await updateHabitCategory(category.id, values)
        : await createHabitCategory(values);
      if (result.ok) {
        toast.success(category ? "category updated." : "category created.");
        onSuccess();
        return;
      }
      if (result.fieldErrors) {
        for (const [path, messages] of Object.entries(result.fieldErrors)) {
          form.setError(path as keyof HabitCategoryFormInput, {
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
          <FieldLabel htmlFor="hc-name">name</FieldLabel>
          <Input
            id="hc-name"
            placeholder="ex: health"
            disabled={isPending}
            {...form.register("name")}
          />
          {form.formState.errors.name && (
            <FieldError>{form.formState.errors.name.message}</FieldError>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="hc-icon">icon</FieldLabel>
          <Controller
            control={form.control}
            name="icon"
            render={({ field }) => (
              <IconPicker
                id="hc-icon"
                value={field.value ?? ""}
                onChange={field.onChange}
                disabled={isPending}
              />
            )}
          />
          <FieldDescription>optional icon shown next to habits.</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="hc-color">color</FieldLabel>
          <Controller
            control={form.control}
            name="color"
            render={({ field }) => (
              <ColorPicker
                id="hc-color"
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
      </FieldGroup>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onSuccess} disabled={isPending}>
          cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "saving..." : category ? "save" : "create"}
        </Button>
      </div>
    </form>
  );
}
