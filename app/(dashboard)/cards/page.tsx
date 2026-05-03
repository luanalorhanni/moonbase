import { listCardClosings, listCards } from "@/lib/queries/cards";

import { CardsList } from "./cards-list";

export const metadata = {
  title: "Cartões — moonbase",
};

export default async function CardsPage() {
  const [cards, closings] = await Promise.all([listCards(), listCardClosings()]);
  return <CardsList initialCards={cards} initialClosings={closings} />;
}
