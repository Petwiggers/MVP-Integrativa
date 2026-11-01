import { expect, test } from "@playwright/test";
import { goToStory, openTotem, pairContext, withDb } from "./helpers";

test.beforeEach(async ({ context, baseURL }) => {
  await pairContext(context, baseURL!);
});

test("fluxo anônimo completo: envio, protocolo, encerramento e consulta", async ({ page }) => {
  const secret = `relato e2e ${Date.now()}`;
  await page.clock.install();
  await openTotem(page);
  await goToStory(page);

  // Digita pelo teclado virtual e pelo teclado físico.
  await page.getByTestId("teclado").getByRole("button", { name: "ã" }).click();
  await page.getByTestId("kb-apagar").click();
  await page.keyboard.type(secret);
  await expect(page.getByTestId("campo-relato")).toContainText(secret);
  await page.getByTestId("btn-continuar").click();

  await page.getByTestId("urgencia-nao").click();
  await expect(page.getByTestId("tela-consentimento")).toBeVisible();
  await expect(page.getByTestId("texto-consentimento")).toContainText("LGPD");
  await expect(page.getByText("Você está enviando de forma anônima.")).toBeVisible();

  const [request] = await Promise.all([
    page.waitForRequest("**/api/totem/reports"),
    page.getByTestId("btn-enviar").click(),
  ]);
  const body = request.postDataJSON();
  expect(body.identification).toBe("ANONIMO");
  expect(body.name).toBeUndefined();
  expect(body.contact).toBeUndefined();

  const protocolEl = page.getByTestId("protocolo");
  await expect(protocolEl).toHaveText(/^[A-HJKMNP-Z2-9]{3}-[A-HJKMNP-Z2-9]{3}$/);
  const protocol = (await protocolEl.textContent())!.replace("-", "");

  // No banco: conteúdo cifrado, só a data (sem horário) e nenhum dado de identificação.
  await withDb(async (db) => {
    const plain = await db.query(`SELECT count(*)::int AS n FROM "Report" WHERE "bodyEnc" LIKE $1`, [`%${secret}%`]);
    expect(plain.rows[0].n).toBe(0);
    const cols = await db.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Report'`,
    );
    const names = cols.rows.map((r) => r.column_name as string);
    for (const forbidden of ["ip", "userAgent", "createdAt", "updatedAt"]) expect(names).not.toContain(forbidden);
    expect(cols.rows.find((r) => r.column_name === "createdOn")?.data_type).toBe("date");
  });

  await page.getByTestId("btn-concluir").click();
  await expect(page.getByTestId("tela-encerramento")).toBeVisible();
  // Volta sozinho à tela de descanso.
  await page.clock.fastForward(9_000);
  await expect(page.getByTestId("tela-descanso")).toBeVisible();

  // Consulta anônima pelo protocolo.
  await page.getByTestId("btn-acompanhar").click();
  for (const ch of protocol) await page.getByTestId(`kb-${ch}`).click();
  await page.getByTestId("btn-consultar").click();
  await expect(page.getByTestId("status-protocolo")).toHaveText(/Recebido/);
  await expect(page.getByText(secret)).toHaveCount(0);

  // Nada persistido no navegador.
  const storage = await page.evaluate(() => ({
    local: localStorage.length,
    session: sessionStorage.length,
    cookies: document.cookie,
  }));
  expect(storage).toEqual({ local: 0, session: 0, cookies: "" });
  const cookies = await page.context().cookies();
  expect(cookies.map((c) => c.name)).toEqual(["totem_device"]);
});

test("urgência mostra contatos de apoio e o CVV imediatamente", async ({ page }) => {
  await openTotem(page);
  await goToStory(page);
  await page.getByTestId("btn-continuar").click();
  await page.getByTestId("urgencia-sim").click();
  const support = page.getByTestId("tela-apoio");
  await expect(support).toBeVisible();
  await expect(support).toContainText("Ligue 188");
  await expect(support).toContainText("24 horas");
  await expect(support).toContainText("RH");

  const [request] = await Promise.all([
    page.waitForRequest("**/api/totem/reports"),
    page.getByTestId("btn-continuar").click().then(() => page.getByTestId("btn-enviar").click()),
  ]);
  expect(request.postDataJSON().urgent).toBe(true);
  await expect(page.getByTestId("protocolo")).toBeVisible();
});

test("botão Sair aparece em todas as telas e apaga tudo na hora", async ({ page }) => {
  await openTotem(page);
  await page.getByTestId("btn-comecar").click();

  // Identificação com dados → Sair → nada sobra.
  await page.getByTestId("opcao-identificar").click();
  await expect(page.getByTestId("btn-sair")).toBeVisible();
  await page.keyboard.type("Fulano");
  await expect(page.getByTestId("campo-name")).toContainText("Fulano");
  await page.getByTestId("btn-sair").click();
  await expect(page.getByTestId("tela-descanso")).toBeVisible();

  await page.getByTestId("btn-comecar").click();
  await page.getByTestId("opcao-identificar").click();
  await expect(page.getByTestId("campo-name")).not.toContainText("Fulano");
  await page.getByTestId("btn-voltar").click();

  // Sair visível em cada etapa do fluxo.
  await page.getByTestId("opcao-anonimo").click();
  for (const [screen, next] of [
    ["tela-humor", "humor-3"],
    ["tela-tema", "btn-pular"],
    ["tela-relato", "btn-continuar"],
    ["tela-urgencia", "urgencia-nao"],
    ["tela-consentimento", null],
  ] as const) {
    await expect(page.getByTestId(screen)).toBeVisible();
    await expect(page.getByTestId("btn-sair")).toBeVisible();
    if (screen === "tela-relato") await page.keyboard.type("texto que deve sumir");
    if (next) await page.getByTestId(next).click();
  }
  await page.getByTestId("btn-sair").click();
  await expect(page.getByTestId("tela-descanso")).toBeVisible();

  await goToStory(page);
  await expect(page.getByTestId("campo-relato")).not.toContainText("texto que deve sumir");
});

test("timeout de inatividade: aviso de 10s e depois limpa todo o estado", async ({ page }) => {
  await page.clock.install();
  await openTotem(page);
  await goToStory(page);
  await page.keyboard.type("rascunho sensivel");

  // Antes de 90s, nada acontece.
  await page.clock.fastForward(85_000);
  await expect(page.getByTestId("aviso-inatividade")).toBeHidden();

  // Aos 90s aparece o aviso com contagem regressiva.
  await page.clock.fastForward(6_000);
  await expect(page.getByTestId("aviso-inatividade")).toBeVisible();
  await expect(page.getByTestId("contagem")).toHaveText(/^(10|9)$/);

  // Um toque cancela o aviso e mantém o rascunho.
  await page.getByTestId("btn-continuar-aqui").click();
  await expect(page.getByTestId("aviso-inatividade")).toBeHidden();
  await expect(page.getByTestId("campo-relato")).toContainText("rascunho sensivel");

  // Sem novo toque: 90s + 10s → volta ao início e apaga tudo.
  await page.clock.fastForward(91_000);
  await expect(page.getByTestId("aviso-inatividade")).toBeVisible();
  await page.clock.fastForward(11_000);
  await expect(page.getByTestId("tela-descanso")).toBeVisible();
  await expect(page.getByTestId("aviso-inatividade")).toBeHidden();

  await goToStory(page);
  await expect(page.getByTestId("campo-relato")).not.toContainText("rascunho sensivel");
});

test("totem sem pareamento é enviado para a tela de pareamento", async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ baseURL });
  const page = await ctx.newPage();
  await page.goto("/totem");
  await expect(page).toHaveURL(/\/totem\/parear$/);
  const res = await page.request.post("/api/totem/reports", { data: {} });
  expect(res.status()).toBe(401);
  await ctx.close();
});

test("PWA: manifest em tela cheia com escopo /totem", async ({ request }) => {
  const res = await request.get("/totem/manifest.webmanifest");
  expect(res.ok()).toBe(true);
  const m = await res.json();
  expect(m.display).toBe("fullscreen");
  expect(m.scope).toBe("/totem");
  expect(m.start_url).toBe("/totem");
  expect(["any", "portrait", "landscape"]).toContain(m.orientation);
  const icon = await request.get(m.icons[0].src);
  expect(icon.headers()["content-type"]).toContain("image/png");
});
