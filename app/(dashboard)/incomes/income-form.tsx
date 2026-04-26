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
import { createIncome, updateIncome } from "@/lib/actions/incomes";
import type { IncomeRow } from "@/lib/queries/incomes";
import {
  INCOME_TYPE_LABEL,
  INCOME_TYPES,
  incomeFormSchema,
  type IncomeFormInput,
} from "@/lib/validation/income";

type Props = {
  income?: IncomeRow;
  onSuccess: () => void;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function IncomeForm({ income, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<IncomeFormInput>({
    resolver: zodResolver(incomeFormSchema),
    defaultValues: income
      ? {
          description: income.description,
          type: income.type,
          amount: income.amount,
          date: income.date,
        }
      : {
          description: "",
          type: "salary",
          amount: "",
          date: today(),
        },
  });

  function onSubmit(values: IncomeFormInput) {
    startTransition(async () => {
      const result = income ? await updateIncome(income.id, values) : await createIncome(values);

      if (result.ok) {
        toast.success(income ? "Receita atualizada." : "Receita registrada.");
        onSuccess();
        return;
      }

      if (result.fieldErrors) {
        for (const [path, messages] of Object.entries(result.fieldErrors)) {
          form.setError(path as keyof IncomeFormInput, {
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
          <FieldLabel htmlFor="inc-description">Descrição</FieldLabel>
          <Input
            id="inc-description"
            placeholder="Ex: Salário maio"
            disabled={isPending}
            {...form.register("description")}
          />
          {form.formState.errors.description ? (
            <FieldError>{form.formState.errors.description.message}</FieldError>
          ) : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="inc-type">Tipo</FieldLabel>
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isPending}
                items={INCOME_TYPE_LABEL}
              >
                <SelectTrigger id="inc-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INCOME_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {INCOME_TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="inc-amount">Valor</FieldLabel>
          <Input
            id="inc-amount"
            inputMode="decimal"
            placeholder="Ex: 3500.00"
            disabled={isPending}
            {...form.register("amount")}
          />
          <FieldDescription>Use ponto como separador decimal (ex: 3500.00).</FieldDescription>
          {form.formState.errors.amount ? (
            <FieldError>{form.formState.errors.amount.message}</FieldError>
          ) : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="inc-date">Data</FieldLabel>
          <Input id="inc-date" type="date" disabled={isPending} {...form.register("date")} />
          {form.formState.errors.date ? (
            <FieldError>{form.formState.errors.date.message}</FieldError>
          ) : null}
        </Field>
      </FieldGroup>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onSuccess} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : income ? "Salvar" : "Registrar"}
        </Button>
      </div>
    </form>
  );
}
