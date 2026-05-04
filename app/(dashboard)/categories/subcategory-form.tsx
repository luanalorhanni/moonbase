"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createSubcategory, updateSubcategory } from "@/lib/actions/categories";
import type { SubcategoryRow } from "@/lib/queries/categories";
import { subcategoryFormSchema, type SubcategoryFormInput } from "@/lib/validation/category";

type Props = {
  subcategory?: SubcategoryRow;
  categoryId: string;
  onSuccess: () => void;
};

export function SubcategoryForm({ subcategory, categoryId, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<SubcategoryFormInput>({
    resolver: zodResolver(subcategoryFormSchema),
    defaultValues: subcategory
      ? { name: subcategory.name, categoryId: subcategory.categoryId }
      : { name: "", categoryId },
  });

  function onSubmit(values: SubcategoryFormInput) {
    startTransition(async () => {
      const result = subcategory
        ? await updateSubcategory(subcategory.id, values)
        : await createSubcategory(values);

      if (result.ok) {
        toast.success(subcategory ? "subcategory updated." : "subcategory created.");
        onSuccess();
        return;
      }

      if (result.fieldErrors) {
        for (const [path, messages] of Object.entries(result.fieldErrors)) {
          form.setError(path as keyof SubcategoryFormInput, {
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
          <FieldLabel htmlFor="sub-name">name</FieldLabel>
          <Input
            id="sub-name"
            placeholder="e.g. pharmacy"
            disabled={isPending}
            {...form.register("name")}
          />
          {form.formState.errors.name ? (
            <FieldError>{form.formState.errors.name.message}</FieldError>
          ) : null}
        </Field>
        <input type="hidden" {...form.register("categoryId")} />
      </FieldGroup>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onSuccess} disabled={isPending}>
          cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "saving..." : subcategory ? "save" : "create"}
        </Button>
      </div>
    </form>
  );
}
