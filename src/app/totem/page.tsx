import { redirect } from "next/navigation";
import { TotemApp } from "@/components/totem/TotemApp";
import { authenticateDevice } from "@/server/device-auth";
import { getSettings, toTotemConfig } from "@/server/settings";

export const dynamic = "force-dynamic";

export default async function TotemPage() {
  const device = await authenticateDevice();
  if (!device) redirect("/totem/parear");
  const config = toTotemConfig(await getSettings());
  return <TotemApp initialConfig={config} />;
}
