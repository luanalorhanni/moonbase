"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createFixedIncome, updateFixedIncome } from "@/lib/actions/investments";
import type { FixedIncomeRow } from "@/lib/queries/investments";
import { fixedIncomeFormSchema, type FixedIncomeFormInput } from "@/lib/validation/investment";

type Props = {
  item?: FixedIncomeRow;
  onSuccess: () => void;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function FixedIncomeForm({ item, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<FixedIncomeFormInput>({
    resolver: zodResolver(fixedIncomeFormSchema),
    defaultValues: item
      ? {
          title: item.title,
          bank: item.bank,
          applicationDate: item.applicationDate,
          maturityDate: item.maturityDate,
          appliedAmount: item.appliedAmount,
          latestYield: item.latestYield,
          lastUpdateDate: item.lastUpdateDate ?? "",
          isActive: item.isActive,
        }
      : {
          title: "",
          bank: "",
          applicationDate: today(),
          maturityDate: "",
          appliedAmount: "",
          latestYield: "",
          lastUpdateDate: "",
          isActive: true,
        },
  });

  function onSubmit(values: FixedIncomeFormInput) {
    startTransition(async () => {
      const result = item
        ? await updateFixedIncome(item.id, values)
        : await createFixedIncome(values);

      if (result.ok) {
        toast.success(item ? "investment updated." : "investment logged.");
        onSuccess();
        return;
      }

      if (result.fieldErrors) {
        for (const [path, messages] of Object.entries(result.fieldErrors)) {
          form.setError(path as keyof FixedIncomeFormInput, {
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
            <FieldLabel htmlFor="fi-title">name</FieldLabel>
            <Input
              id="fi-title"
              placeholder="e.g. LCI Bradesco"
              disabled={isPending}
              {...form.register("title")}
            />
            {form.formState.errors.title ? (
              <FieldError>{form.formState.errors.title.message}</FieldError>
            ) : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="fi-bank">bank</FieldLabel>
            <Input
              id="fi-bank"
              placeholder="e.g. Bradesco"
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
            <FieldLabel htmlFor="fi-applied">applied amount</FieldLabel>
            <Input
              id="fi-applied"
              inputMode="decimal"
              placeholder="e.g. 10000.00"
              disabled={isPending}
              {...form.register("appliedAmount")}
            />
            {form.formState.errors.appliedAmount ? (
              <FieldError>{form.formState.errors.appliedAmount.message}</FieldError>
            ) : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="fi-yield">current yield</FieldLabel>
            <Input
              id="fi-yield"
              inputMode="decimal"
              placeholder="e.g. 10350.00"
              disabled={isPending}
              {...form.register("latestYield")}
            />
            {form.formState.errors.latestYield ? (
              <FieldError>{form.formState.errors.latestYield.message}</FieldError>
            ) : null}
          </Field>
        </div>
        <FieldDescription className="-mt-3">
          total current value of the investment including yield.
        </FieldDescription>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="fi-app-date">application date</FieldLabel>
            <Input
              id="fi-app-date"
              type="date"
              disabled={isPending}
              {...form.register("applicationDate")}
            />
            {form.formState.errors.applicationDate ? (
              <FieldError>{form.formState.errors.applicationDate.message}</FieldError>
            ) : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="fi-maturity">maturity</FieldLabel>
            <Input
              id="fi-maturity"
              type="date"
              disabled={isPending}
              {...form.register("maturityDate")}
            />
            {form.formState.errors.maturityDate ? (
              <FieldError>{form.formState.errors.maturityDate.message}</FieldError>
            ) : null}
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="fi-update-date">last update</FieldLabel>
          <Input
            id="fi-update-date"
            type="date"
            disabled={isPending}
            {...form.register("lastUpdateDate")}
          />
          {form.formState.errors.lastUpdateDate ? (
            <FieldError>{form.formState.errors.lastUpdateDate.message}</FieldError>
          ) : null}
        </Field>

        <div className="flex items-start gap-3 rounded-md border px-3 py-3">
          <input
            id="fi-is-active"
            type="checkbox"
            className="accent-primary mt-0.5 size-4 cursor-pointer"
            disabled={isPending}
            {...form.register("isActive")}
          />
          <div className="flex flex-col gap-0.5">
            <label
              htmlFor="fi-is-active"
              className="cursor-pointer text-sm leading-snug font-medium"
            >
              Ativo
            </label>
            <p className="text-muted-foreground text-sm">
              inactive investments are not added to the total balance.
            </p>
          </div>
        </div>
      </FieldGroup>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onSuccess} disabled={isPending}>
          cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "saving..." : item ? "save" : "log"}
        </Button>
      </div>
    </form>
  );
}
