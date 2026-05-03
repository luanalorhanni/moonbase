import { listJournalEntries, listJournalQuotes } from "@/lib/queries/journal";

import { JournalPage } from "./journal-page";

export const metadata = {
  title: "journal · moonbase",
};

export default async function Page() {
  const [entries, quotes] = await Promise.all([
    listJournalEntries(),
    listJournalQuotes(),
  ]);
  return <JournalPage entries={entries} quotes={quotes} />;
}
