import { listCards } from "@/lib/queries/cards";

import { CardsList } from "./cards-list";

export const metadata = {
  title: "Cartões — moonbase",
};

export default async function CardsPage() {
  const cards = await listCards();
  return <CardsList initialCards={cards} />;
}
