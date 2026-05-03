import {
  getGoogleCalendarConnection,
  listEventsWindow,
} from "@/lib/queries/google-calendar";

import { CalendarPage } from "./calendar-page";

export const metadata = {
  title: "Calendário — moonbase",
};

export default async function CalendarRoute({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; connected?: string }>;
}) {
  const params = await searchParams;
  const connection = await getGoogleCalendarConnection();
  let upcoming: Awaited<ReturnType<typeof listEventsWindow>> = null;
  let fetchError: string | null = null;

  if (connection.connected) {
    try {
      upcoming = await listEventsWindow();
    } catch (e) {
      fetchError = e instanceof Error ? e.message : "erro ao buscar eventos";
    }
  }

  return (
    <CalendarPage
      connection={connection}
      upcoming={upcoming}
      fetchError={fetchError}
      callbackError={params.error ?? null}
      justConnected={params.connected === "1"}
    />
  );
}
