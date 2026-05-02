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
import { createCategory, updateCategory } from "@/lib/actions/categories";
import type { CategoryRow } from "@/lib/queries/categories";
import { categoryFormSchema, type CategoryFormInput } from "@/lib/validation/category";

type Props = {
  category?: CategoryRow;
  onSuccess: () => void;
};

export function CategoryForm({ category, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<CategoryFormInput>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: category
      ? { name: category.name, color: category.color, icon: category.icon ?? "" }
      : { name: "", color: "#7e82aa", icon: "" },
  });

  function onSubmit(values: CategoryFormInput) {
    startTransition(async () => {
      const result = category
        ? await updateCategory(category.id, values)
        : await createCategory(values);

      if (result.ok) {
        toast.success(category ? "category updated." : "category created.");
        onSuccess();
        return;
      }

      if (result.fieldErrors) {
        for (const [path, messages] of Object.entries(result.fieldErrors)) {
          form.setError(path as keyof CategoryFormInput, {
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
          <FieldLabel htmlFor="cat-name">name</FieldLabel>
          <Input
            id="cat-name"
            placeholder="ex: groceries"
            disabled={isPending}
            {...form.register("name")}
          />
          {form.formState.errors.name ? (
            <FieldError>{form.formState.errors.name.message}</FieldError>
          ) : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="cat-icon">icon</FieldLabel>
          <Controller
            control={form.control}
            name="icon"
            render={({ field }) => (
              <IconPicker
                id="cat-icon"
                value={field.value ?? ""}
                onChange={field.onChange}
                disabled={isPending}
              />
            )}
          />
          <FieldDescription>optional icon shown next to expenses.</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="cat-color">color</FieldLabel>
          <Controller
            control={form.control}
            name="color"
            render={({ field }) => (
              <ColorPicker
                id="cat-color"
                value={field.value}
                onChange={field.onChange}
                disabled={isPending}
              />
            )}
          />
          {form.formState.errors.color ? (
            <FieldError>{form.formState.errors.color.message}</FieldError>
          ) : null}
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
