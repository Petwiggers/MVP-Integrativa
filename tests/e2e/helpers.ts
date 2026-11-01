import { expect, type BrowserContext, type Page } from "@playwright/test";
import { Client } from "pg";

export const DEVICE_TOKEN = process.env.SEED_DEVICE_TOKEN || "dev-totem-token-nao-usar-em-producao";
export const ADMIN_EMAIL = "admin@exemplo.com";
export const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Acolher-Totem-2026!";

/** Simula um tablet já pareado (cookie do dispositivo criado pelo seed). */
export async function pairContext(context: BrowserContext, baseURL: string) {
  await context.addCookies([
    { name: "totem_device", value: DEVICE_TOKEN, url: baseURL, httpOnly: true, sameSite: "Strict" },
  ]);
}

export async function openTotem(page: Page) {
  await page.goto("/totem");
  await expect(page.getByTestId("tela-descanso")).toBeVisible();
}

/** Avança do descanso até a tela de relato como anônimo. */
export async function goToStory(page: Page) {
  await page.getByTestId("btn-comecar").click();
  await page.getByTestId("opcao-anonimo").click();
  await page.getByTestId("humor-2").click();
  await page.getByTestId("tema-TRABALHO").click();
  await expect(page.getByTestId("tela-relato")).toBeVisible();
}

export async function withDb<T>(fn: (db: Client) => Promise<T>): Promise<T> {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}
