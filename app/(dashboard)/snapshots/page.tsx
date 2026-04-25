import { listSnapshots } from "@/lib/queries/snapshots";

import { SnapshotsView } from "./snapshots-view";

export default async function SnapshotsPage() {
  const snapshots = await listSnapshots();
  return <SnapshotsView snapshots={snapshots} />;
}
