"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
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
import type { CardRow } from "@/lib/queries/cards";
import { createCard, updateCard } from "@/lib/actions/cards";
import { CARD_COLORS, cardFormSchema, type CardFormInput } from "@/lib/validation/card";

const COLOR_LABEL: Record<(typeof CARD_COLORS)[number], string> = {
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

const COLOR_DOT_CLASS: Record<(typeof CARD_COLORS)[number], string> = {
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
  /** When provided, the form runs in edit mode. */
  card?: CardRow;
  onSuccess: () => void;
};

function emptyDefaults(): CardFormInput {
  return {
    name: "",
    type: "credit",
    bank: "",
    defaultClosingDay: "",
    dueDay: "",
    limitAmount: "",
    color: "gray",
    isActive: true,
  };
}

function defaultsFromCard(card: CardRow): CardFormInput {
  return {
    name: card.name,
    type: card.type,
    bank: card.bank ?? "",
    defaultClosingDay: card.defaultClosingDay !== null ? String(card.defaultClosingDay) : "",
    dueDay: card.dueDay !== null ? String(card.dueDay) : "",
    limitAmount: card.limitAmount ?? "",
    color: card.color,
    isActive: card.isActive,
  };
}

export function CardForm({ card, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<CardFormInput>({
    resolver: zodResolver(cardFormSchema),
    defaultValues: card ? defaultsFromCard(card) : emptyDefaults(),
  });

  const type = useWatch({ control: form.control, name: "type" });
  const isCredit = type === "credit";

  function onSubmit(values: CardFormInput) {
    startTransition(async () => {
      const result = card ? await updateCard(card.id, values) : await createCard(values);

      if (result.ok) {
        toast.success(card ? "Cartão atualizado." : "Cartão criado.");
        onSuccess();
        return;
      }

      if (result.fieldErrors) {
        for (const [path, messages] of Object.entries(result.fieldErrors)) {
          form.setError(path as keyof CardFormInput, {
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
          <FieldLabel htmlFor="name">Nome</FieldLabel>
          <Input
            id="name"
            placeholder="Ex: Nubank"
            disabled={isPending}
            {...form.register("name")}
          />
          {form.formState.errors.name ? (
            <FieldError>{form.formState.errors.name.message}</FieldError>
          ) : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="type">Tipo</FieldLabel>
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                <SelectTrigger id="type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Cartão de crédito</SelectItem>
                  <SelectItem value="account">Conta (Pix, débito, dinheiro)</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <FieldDescription>
            Contas representam meios de pagamento à vista (Pix, débito, dinheiro).
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="bank">Banco</FieldLabel>
          <Input
            id="bank"
            placeholder="Ex: Nubank"
            disabled={isPending}
            {...form.register("bank")}
          />
          <FieldDescription>Opcional.</FieldDescription>
        </Field>

        {isCredit ? (
          <>
            <Field>
              <FieldLabel htmlFor="defaultClosingDay">Dia de fechamento padrão</FieldLabel>
              <Input
                id="defaultClosingDay"
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                placeholder="Ex: 25"
                disabled={isPending}
                {...form.register("defaultClosingDay")}
              />
              <FieldDescription>
                Pode ser sobrescrito mês a mês (em &ldquo;card_closings&rdquo;).
              </FieldDescription>
              {form.formState.errors.defaultClosingDay ? (
                <FieldError>{form.formState.errors.defaultClosingDay.message}</FieldError>
              ) : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="dueDay">Dia de vencimento</FieldLabel>
              <Input
                id="dueDay"
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                placeholder="Ex: 5"
                disabled={isPending}
                {...form.register("dueDay")}
              />
              {form.formState.errors.dueDay ? (
                <FieldError>{form.formState.errors.dueDay.message}</FieldError>
              ) : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="limitAmount">Limite</FieldLabel>
              <Input
                id="limitAmount"
                inputMode="decimal"
                placeholder="Ex: 5000.00"
                disabled={isPending}
                {...form.register("limitAmount")}
              />
              <FieldDescription>Use ponto como separador decimal (ex: 1234.56).</FieldDescription>
              {form.formState.errors.limitAmount ? (
                <FieldError>{form.formState.errors.limitAmount.message}</FieldError>
              ) : null}
            </Field>
          </>
        ) : null}

        <Field>
          <FieldLabel htmlFor="color">Cor</FieldLabel>
          <Controller
            control={form.control}
            name="color"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                <SelectTrigger id="color" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARD_COLORS.map((color) => (
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

        <Field orientation="horizontal">
          <input
            id="isActive"
            type="checkbox"
            disabled={isPending}
            className="border-input text-primary focus-visible:ring-ring/50 size-4 rounded-sm border focus-visible:ring-3"
            {...form.register("isActive")}
          />
          <FieldLabel htmlFor="isActive">Ativo</FieldLabel>
        </Field>
      </FieldGroup>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onSuccess} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : card ? "Salvar" : "Criar"}
        </Button>
      </div>
    </form>
  );
}
