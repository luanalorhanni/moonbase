import "server-only";

import { aggregateYear, type MonthAggregate } from "@/lib/finance/aggregate";
import { sumNumeric } from "@/lib/finance/month";

import { loadFullDataset, toAggregateInputs } from "./month";

export type YearSummary = {
  year: number;
  months: MonthAggregate[];
  totalIncomes: string;
  totalExpenses: string;
  balance: string;
};

export async function loadYear(year: number): Promise<YearSummary> {
  const dataset = await loadFullDataset();
  const months = aggregateYear(toAggregateInputs(dataset), year);

  const totalIncomes = sumNumeric(months.map((m) => m.totalIncomes));
  const totalExpenses = sumNumeric(months.map((m) => m.totalExpenses));
  const balance = (Number(totalIncomes) - Number(totalExpenses)).toFixed(2);

  return { year, months, totalIncomes, totalExpenses, balance };
}
