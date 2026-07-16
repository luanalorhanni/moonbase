"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createCreditRefund } from "@/lib/actions/credit-refunds";
import { formatMonthShort, isMonthRef, shiftMonth } from "@/lib/finance/month";
import type { CreditExpenseWithDetails } from "@/lib/queries/credit-expenses";
import { formatCurrency, todayBrazil } from "@/lib/utils";
import { isValidAmountInput, toApiAmount } from "@/lib/validation/amount";
import {
  creditRefundFormSchema,
  type CreditRefundFormInput,
} from "@/lib/validation/credit-refund";

type Props = {
  expense: CreditExpenseWithDetails;
  onSuccess: () => void;
};

function currentMonth(): string {
  return todayBrazil().slice(0, 7);
}

export function CreditRefundForm({ expense, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreditRefundFormInput>({
    resolver: zodResolver(creditRefundFormSchema),
    defaultValues: {
      creditExpenseId: expense.id,
      description: "",
      parcelValue: "",
      totalParcels: "1",
      referenceMonth: currentMonth(),
    },
  });

  const parcelValue = form.watch("parcelValue");
  const totalParcels = form.watch("totalParcels");
  const referenceMonth = form.watch("referenceMonth");

  // Live preview of where the credit lands — mirrors the parcel spread.
  const preview = (() => {
    if (!isValidAmountInput(parcelValue || "")) return null;
    if (!isMonthRef(referenceMonth || "")) return null;
    const n = parseInt(totalParcels || "1", 10);
    if (!Number.isInteger(n) || n < 1) return null;
    const value = formatCurrency(toApiAmount(parcelValue));
    if (n === 1) return `credits ${value} in ${formatMonthShort(referenceMonth)}`;
    const last = shiftMonth(referenceMonth, n - 1);
    return `${value}/mo · ${formatMonthShort(referenceMonth)} → ${formatMonthShort(last)}`;
  })();

  function onSubmit(values: CreditRefundFormInput) {
    startTransition(async () => {
      const result = await createCreditRefund(values);
      if (result.ok) {
        toast.success("refund logged.");
        onSuccess();
        return;
      }
      if (result.fieldErrors) {
        for (const [path, messages] of Object.entries(result.fieldErrors)) {
          form.setError(path as keyof CreditRefundFormInput, {
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
      <input type="hidden" {...form.register("creditExpenseId")} />

      {/* Read-only context: which purchase this refund credits. */}
      <div className="border-border bg-muted/40 flex flex-col gap-1 rounded-md border px-3 py-2.5">
        <div className="text-muted-foreground text-[11px] tracking-[0.14em] uppercase">
          refund of
        </div>
        <div className="text-[13px] font-medium">{expense.description}</div>
        <div className="text-muted-foreground flex items-center gap-2 text-[12px]">
          <span className="flex items-center gap-1.5">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: expense.cardColor }}
              aria-hidden
            />
            {expense.cardName}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span>
            {expense.categoryName} / {expense.subcategoryName}
          </span>
        </div>
        <div className="text-muted-foreground text-[12px] tabular-nums">
          {expense.totalParcels}× {formatCurrency(expense.parcelValue)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel htmlFor="rf-parcel-value">refund amount</FieldLabel>
          <Input
            id="rf-parcel-value"
            inputMode="decimal"
            placeholder="e.g. 199,90"
            disabled={isPending}
            {...form.register("parcelValue")}
          />
          {form.formState.errors.parcelValue ? (
            <FieldError>{form.formState.errors.parcelValue.message}</FieldError>
          ) : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="rf-parcels">installments</FieldLabel>
          <Input
            id="rf-parcels"
            inputMode="numeric"
            placeholder="1"
            disabled={isPending}
            {...form.register("totalParcels")}
          />
          {form.formState.errors.totalParcels ? (
            <FieldError>{form.formState.errors.totalParcels.message}</FieldError>
          ) : null}
        </Field>
      </div>
      <FieldDescription className="-mt-3">
        amount credited per invoice. use a comma as the decimal separator (e.g. 199,90). keep
        installments at 1 for a one-off credit; raise it for an estorno parcelado.
      </FieldDescription>

      <Field>
        <FieldLabel htmlFor="rf-month">first invoice month</FieldLabel>
        <Input id="rf-month" type="month" disabled={isPending} {...form.register("referenceMonth")} />
        {form.formState.errors.referenceMonth ? (
          <FieldError>{form.formState.errors.referenceMonth.message}</FieldError>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor="rf-description">description (optional)</FieldLabel>
        <Input
          id="rf-description"
          placeholder={`refund: ${expense.description}`}
          disabled={isPending}
          {...form.register("description")}
        />
        {form.formState.errors.description ? (
          <FieldError>{form.formState.errors.description.message}</FieldError>
        ) : null}
      </Field>

      {preview ? (
        <div className="border-border/60 text-muted-foreground rounded-md border border-dashed px-3 py-2 text-[12px] tabular-nums">
          {preview}
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onSuccess} disabled={isPending}>
          cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "saving..." : "log refund"}
        </Button>
      </div>
    </form>
  );
}
