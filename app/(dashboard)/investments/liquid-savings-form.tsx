"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createLiquidSavings, updateLiquidSavings } from "@/lib/actions/investments";
import type { LiquidSavingsRow } from "@/lib/queries/investments";
import { liquidSavingsFormSchema, type LiquidSavingsFormInput } from "@/lib/validation/investment";

type Props = {
  item?: LiquidSavingsRow;
  onSuccess: () => void;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function LiquidSavingsForm({ item, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<LiquidSavingsFormInput>({
    resolver: zodResolver(liquidSavingsFormSchema),
    defaultValues: item
      ? {
          title: item.title,
          bank: item.bank,
          applicationDate: item.applicationDate,
          appliedAmount: item.appliedAmount,
          latestYield: item.latestYield,
          lastUpdateDate: item.lastUpdateDate ?? "",
          isActive: item.isActive,
        }
      : {
          title: "",
          bank: "",
          applicationDate: today(),
          appliedAmount: "",
          latestYield: "",
          lastUpdateDate: "",
          isActive: true,
        },
  });

  function onSubmit(values: LiquidSavingsFormInput) {
    startTransition(async () => {
      const result = item
        ? await updateLiquidSavings(item.id, values)
        : await createLiquidSavings(values);

      if (result.ok) {
        toast.success(item ? "Investimento atualizado." : "Investimento registrado.");
        onSuccess();
        return;
      }

      if (result.fieldErrors) {
        for (const [path, messages] of Object.entries(result.fieldErrors)) {
          form.setError(path as keyof LiquidSavingsFormInput, {
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
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="ls-title">Nome</FieldLabel>
            <Input
              id="ls-title"
              placeholder="Ex: Cofrinho"
              disabled={isPending}
              {...form.register("title")}
            />
            {form.formState.errors.title ? (
              <FieldError>{form.formState.errors.title.message}</FieldError>
            ) : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="ls-bank">Banco</FieldLabel>
            <Input
              id="ls-bank"
              placeholder="Ex: Inter"
              disabled={isPending}
              {...form.register("bank")}
            />
            {form.formState.errors.bank ? (
              <FieldError>{form.formState.errors.bank.message}</FieldError>
            ) : null}
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="ls-applied">Valor aplicado</FieldLabel>
            <Input
              id="ls-applied"
              inputMode="decimal"
              placeholder="Ex: 5000.00"
              disabled={isPending}
              {...form.register("appliedAmount")}
            />
            {form.formState.errors.appliedAmount ? (
              <FieldError>{form.formState.errors.appliedAmount.message}</FieldError>
            ) : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="ls-yield">Rendimento atual</FieldLabel>
            <Input
              id="ls-yield"
              inputMode="decimal"
              placeholder="Ex: 5120.35"
              disabled={isPending}
              {...form.register("latestYield")}
            />
            {form.formState.errors.latestYield ? (
              <FieldError>{form.formState.errors.latestYield.message}</FieldError>
            ) : null}
          </Field>
        </div>
        <FieldDescription className="-mt-3">
          Valor total atual do investimento incluindo rendimento.
        </FieldDescription>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="ls-app-date">Data de aplicação</FieldLabel>
            <Input
              id="ls-app-date"
              type="date"
              disabled={isPending}
              {...form.register("applicationDate")}
            />
            {form.formState.errors.applicationDate ? (
              <FieldError>{form.formState.errors.applicationDate.message}</FieldError>
            ) : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="ls-update-date">Última atualização</FieldLabel>
            <Input
              id="ls-update-date"
              type="date"
              disabled={isPending}
              {...form.register("lastUpdateDate")}
            />
            {form.formState.errors.lastUpdateDate ? (
              <FieldError>{form.formState.errors.lastUpdateDate.message}</FieldError>
            ) : null}
          </Field>
        </div>

        <div className="flex items-start gap-3 rounded-md border px-3 py-3">
          <input
            id="ls-is-active"
            type="checkbox"
            className="accent-primary mt-0.5 size-4 cursor-pointer"
            disabled={isPending}
            {...form.register("isActive")}
          />
          <div className="flex flex-col gap-0.5">
            <label
              htmlFor="ls-is-active"
              className="cursor-pointer text-sm leading-snug font-medium"
            >
              Ativo
            </label>
            <p className="text-muted-foreground text-sm">
              Investimentos inativos não são somados ao patrimônio.
            </p>
          </div>
        </div>
      </FieldGroup>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onSuccess} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : item ? "Salvar" : "Registrar"}
        </Button>
      </div>
    </form>
  );
}
