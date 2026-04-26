"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCategory, updateCategory } from "@/lib/actions/categories";
import type { CategoryRow } from "@/lib/queries/categories";
import {
  CATEGORY_COLORS,
  categoryFormSchema,
  type CategoryFormInput,
} from "@/lib/validation/category";

const COLOR_LABEL: Record<(typeof CATEGORY_COLORS)[number], string> = {
  red: "Vermelho",
  orange: "Laranja",
  yellow: "Amarelo",
  green: "Verde",
  blue: "Azul",
  purple: "Roxo",
  pink: "Rosa",
  brown: "Marrom",
  gray: "Cinza",
};

const COLOR_DOT_CLASS: Record<(typeof CATEGORY_COLORS)[number], string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-400",
  green: "bg-green-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
  brown: "bg-amber-700",
  gray: "bg-gray-400",
};

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
      : { name: "", color: "gray", icon: "" },
  });

  function onSubmit(values: CategoryFormInput) {
    startTransition(async () => {
      const result = category
        ? await updateCategory(category.id, values)
        : await createCategory(values);

      if (result.ok) {
        toast.success(category ? "Categoria atualizada." : "Categoria criada.");
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
          <FieldLabel htmlFor="cat-name">Nome</FieldLabel>
          <Input
            id="cat-name"
            placeholder="Ex: Alimentação"
            disabled={isPending}
            {...form.register("name")}
          />
          {form.formState.errors.name ? (
            <FieldError>{form.formState.errors.name.message}</FieldError>
          ) : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="cat-icon">Ícone</FieldLabel>
          <Input
            id="cat-icon"
            placeholder="Ex: 🍕"
            disabled={isPending}
            {...form.register("icon")}
          />
          <FieldDescription>Emoji opcional para identificar visualmente.</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="cat-color">Cor</FieldLabel>
          <Controller
            control={form.control}
            name="color"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isPending}
                items={COLOR_LABEL}
              >
                <SelectTrigger id="cat-color" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_COLORS.map((color) => (
                    <SelectItem key={color} value={color}>
                      <span className="flex items-center gap-2">
                        <span
                          className={`size-3 shrink-0 rounded-full ring-1 ring-black/10 ${COLOR_DOT_CLASS[color]}`}
                          aria-hidden
                        />
                        {COLOR_LABEL[color]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </FieldGroup>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onSuccess} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : category ? "Salvar" : "Criar"}
        </Button>
      </div>
    </form>
  );
}
