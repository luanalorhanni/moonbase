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
import { createCashReceivable, updateCashReceivable } from "@/lib/actions/cash-receivables";
import { todayBrazil } from "@/lib/utils";
import type { CashReceivableRow } from "@/lib/queries/receivables";
import {
  cashReceivableFormSchema,
  LOAN_TYPE_LABEL,
  LOAN_TYPES,
  type CashReceivableFormInput,
} from "@/lib/validation/cash-receivable";

type Props = {
  receivable?: CashReceivableRow;
  onSuccess: () => void;
};

const today = todayBrazil;

function currentMonth(): string {
  return todayBrazil().slice(0, 7);
}

export function CashReceivableForm({ receivable, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<CashReceivableFormInput>({
    resolver: zodResolver(cashReceivableFormSchema),
    defaultValues: receivable
      ? {
          description: receivable.description,
          loanType: receivable.loanType,
          amount: receivable.amount,
          loanDate: receivable.loanDate,
          expectedPaymentMonth: receivable.expectedPaymentMonth.slice(0, 7),
          isPaid: receivable.isPaid,
          actualPaymentDate: receivable.actualPaymentDate ?? "",
        }
      : {
          description: "",
          loanType: "pix",
          amount: "",
          loanDate: today(),
          expectedPaymentMonth: currentMonth(),
          isPaid: false,
          actualPaymentDate: "",
        },
  });

  function onSubmit(values: CashReceivableFormInput) {
    startTransition(async () => {
      const result = receivable
        ? await updateCashReceivable(receivable.id, values)
        : await createCashReceivable(values);

      if (result.ok) {
        toast.success(receivable ? "receivable updated." : "receivable logged.");
        onSuccess();
        return;
      }

      if (result.fieldErrors) {
        for (const [path, messages] of Object.entries(result.fieldErrors)) {
          form.setError(path as keyof CashReceivableFormInput, {
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
          <FieldLabel htmlFor="cr-description">description</FieldLabel>
          <Input
            id="cr-description"
            placeholder="e.g. loan to John"
            disabled={isPending}
            {...form.register("description")}
          />
          {form.formState.errors.description ? (
            <FieldError>{form.formState.errors.description.message}</FieldError>
          ) : null}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="cr-loan-type">method</FieldLabel>
            <Controller
              control={form.control}
              name="loanType"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isPending}
                  items={LOAN_TYPE_LABEL}
                >
                  <SelectTrigger id="cr-loan-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOAN_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {LOAN_TYPE_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="cr-amount">amount</FieldLabel>
            <Input
              id="cr-amount"
              inputMode="decimal"
              placeholder="e.g. 250.00"
              disabled={isPending}
              {...form.register("amount")}
            />
            {form.formState.errors.amount ? (
              <FieldError>{form.formState.errors.amount.message}</FieldError>
            ) : null}
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="cr-loan-date">loan date</FieldLabel>
            <Input
              id="cr-loan-date"
              type="date"
              disabled={isPending}
              {...form.register("loanDate")}
            />
            {form.formState.errors.loanDate ? (
              <FieldError>{form.formState.errors.loanDate.message}</FieldError>
            ) : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="cr-expected-month">expected month</FieldLabel>
            <Input
              id="cr-expected-month"
              type="month"
              disabled={isPending}
              {...form.register("expectedPaymentMonth")}
            />
            {form.formState.errors.expectedPaymentMonth ? (
              <FieldError>{form.formState.errors.expectedPaymentMonth.message}</FieldError>
            ) : null}
          </Field>
        </div>

        <div className="flex items-start gap-3 rounded-md border px-3 py-3">
          <input
            id="cr-is-paid"
            type="checkbox"
            className="accent-primary mt-0.5 size-4 cursor-pointer"
            disabled={isPending}
            {...form.register("isPaid")}
          />
          <div className="flex flex-col gap-0.5">
            <label htmlFor="cr-is-paid" className="cursor-pointer text-sm leading-snug font-medium">
              Recebido
            </label>
            <p className="text-muted-foreground text-sm">
              check this when the amount has been paid back.
            </p>
          </div>
        </div>

        <Field>
          <FieldLabel htmlFor="cr-actual-date">payment date</FieldLabel>
          <Input
            id="cr-actual-date"
            type="date"
            disabled={isPending}
            {...form.register("actualPaymentDate")}
          />
          <FieldDescription>fill in only when the amount is received.</FieldDescription>
          {form.formState.errors.actualPaymentDate ? (
            <FieldError>{form.formState.errors.actualPaymentDate.message}</FieldError>
          ) : null}
        </Field>
      </FieldGroup>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onSuccess} disabled={isPending}>
          cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "saving..." : receivable ? "save" : "log"}
        </Button>
      </div>
    </form>
  );
}
