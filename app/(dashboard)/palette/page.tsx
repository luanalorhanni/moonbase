import { getUserSettings } from "@/lib/queries/user-settings";
import { DEFAULT_PALETTE_ID, PALETTES } from "@/lib/theme/palettes";

import { PalettePicker } from "./palette-picker";

export const metadata = {
  title: "Paleta — moonbase",
};

export default async function PaletteRoute() {
  const settings = await getUserSettings();
  const activeId = settings?.palette ?? DEFAULT_PALETTE_ID;
  return <PalettePicker palettes={PALETTES} activeId={activeId} />;
}
