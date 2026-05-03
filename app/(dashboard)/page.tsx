import { getUserSettings } from "@/lib/queries/user-settings";

import { HomePage } from "./home-page";

export const metadata = {
  title: "moonbase",
};

export default async function Home() {
  const settings = await getUserSettings();
  return <HomePage settings={settings} />;
}
