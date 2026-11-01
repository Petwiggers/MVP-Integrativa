import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, goToStory, openTotem, pairContext, withDb } from "./helpers";

test.use({ viewport: { width: 1280, height: 900 } });

async function login(page: Page, email = ADMIN_EMAIL, password = ADMIN_PASSWORD, expectSuccess = true) {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  if (expectSuccess) await expect(page.getByRole("heading", { name: "Relatos" })).toBeVisible();
}

const loginError = (page: Page) => page.locator("form [role=alert]");

test("sem sessão, o painel redireciona para o login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin/usuarios");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("relato enviado no totem → RH responde → resposta aparece na consulta do protocolo", async ({ browser, baseURL }) => {
  // 1. Totem: relato anônimo urgente.
  const totemCtx = await browser.newContext({ baseURL, viewport: { width: 800, height: 1280 }, hasTouch: true });
  await pairContext(totemCtx, baseURL!);
  const totem = await totemCtx.newPage();
  const marker = `preciso de ajuda e2e ${Date.now()}`;
  await openTotem(totem);
  await goToStory(totem);
  await totem.keyboard.type(marker);
  await totem.getByTestId("btn-continuar").click();
  await totem.getByTestId("urgencia-sim").click();
  await totem.getByTestId("btn-continuar").click();
  await totem.getByTestId("btn-enviar").click();
  const protocol = (await totem.getByTestId("protocolo").textContent())!;
  await totem.getByTestId("btn-sair").click();

  // 2. Painel: login, abre pelo protocolo, lê e responde.
  const adminCtx = await browser.newContext({ baseURL });
  const admin = await adminCtx.newPage();
  await login(admin);
  // Lista ordenada por urgência: o primeiro item é urgente.
  await expect(admin.getByTestId("tabela-relatos").locator("tbody tr").first()).toContainText("Urgente");
  // O conteúdo não aparece na lista.
  await expect(admin.getByText(marker)).toHaveCount(0);

  await admin.getByPlaceholder("ABC-DEF").fill(protocol.toLowerCase());
  await admin.getByRole("button", { name: "Buscar" }).click();
  await expect(admin.getByTestId("texto-relato")).toHaveText(marker);
  expect(admin.url()).not.toContain(protocol.replace("-", ""));

  const reply = "Olá! Recebemos sua mensagem e vamos conversar. Procure o RH no térreo quando puder.";
  await admin.getByTestId("campo-resposta").fill(reply);
  await admin.getByTestId("btn-responder").click();
  await expect(admin.getByText("Resposta enviada.")).toBeVisible();
  await expect(admin.getByTestId("auditoria-relato")).toContainText("Visualizou relato");
  await expect(admin.getByTestId("auditoria-relato")).toContainText("Respondeu relato");

  // Status → Em atendimento é auditado.
  await admin.getByTestId("select-status").selectOption("EM_ATENDIMENTO");
  await admin.getByTestId("btn-status").click();
  await expect(admin.getByText("Status atualizado.")).toBeVisible();
  await expect(admin.getByTestId("auditoria-relato")).toContainText("Alterou status");

  // 3. Totem: consulta anônima mostra status e resposta (sem o nome de quem respondeu).
  await openTotem(totem);
  await totem.getByTestId("btn-acompanhar").click();
  for (const ch of protocol.replace("-", "")) await totem.getByTestId(`kb-${ch}`).click();
  await totem.getByTestId("btn-consultar").click();
  await expect(totem.getByTestId("status-protocolo")).toHaveText("Em atendimento");
  await expect(totem.getByTestId("resposta-rh")).toContainText(reply);
  await expect(totem.getByText("Admin de Teste")).toHaveCount(0);

  // Resposta cifrada no banco.
  await withDb(async (db) => {
    const r = await db.query(`SELECT count(*)::int AS n FROM "ReportReply" WHERE "bodyEnc" LIKE '%Recebemos%'`);
    expect(r.rows[0].n).toBe(0);
  });

  await totemCtx.close();
  await adminCtx.close();
});

test("identificação fica oculta até ser revelada, e a revelação é auditada", async ({ page }) => {
  await login(page);
  await page.goto("/admin?status=EM_ATENDIMENTO&tema=COLEGAS");
  await page.getByTestId("abrir-relato").first().click();
  await expect(page.getByText("Maria (fictícia)")).toHaveCount(0);
  await page.getByTestId("btn-identidade").click();
  await expect(page.getByTestId("dados-identidade")).toContainText("Maria (fictícia)");
  await expect(page.getByTestId("auditoria-relato")).toContainText("Visualizou identificação");
});

test("filtros por status, tema e urgência", async ({ page }) => {
  await login(page);
  await page.goto("/admin?urgencia=sim");
  const rows = page.getByTestId("tabela-relatos").locator("tbody tr");
  await expect(rows.first()).toContainText("Urgente");
  for (const row of await rows.all()) await expect(row).toContainText("Urgente");

  await page.goto("/admin?status=ENCERRADO");
  for (const row of await rows.all()) await expect(row).toContainText("Encerrado");

  await page.goto("/admin?tema=FINANCAS");
  for (const row of await rows.all()) await expect(row).toContainText("Finanças");
});

test("dashboard oculta agregados com menos de 5 relatos", async ({ page }) => {
  await login(page);
  await page.goto("/admin/dashboard?periodo=30");
  await expect(page.getByTestId("grafico-temas")).toBeVisible();
  // O seed tem no máximo 3 relatos por tema: todos aparecem como "menos de 5".
  await expect(page.getByTestId("grafico-temas")).toContainText("menos de 5");
  const text = await page.getByTestId("grafico-temas").innerText();
  for (const n of ["1", "2", "3", "4"]) expect(text.split(/\s+/)).not.toContain(n);
});

test("login: bloqueio após 5 tentativas erradas, com mensagem genérica", async ({ page }) => {
  for (let i = 0; i < 5; i++) {
    await login(page, "bloqueio@exemplo.com", `senha-errada-${i}`, false);
    await expect(loginError(page)).toContainText("E-mail ou senha incorretos");
  }
  // Mesmo com a senha certa, a conta está bloqueada (e a mensagem não revela isso).
  await login(page, "bloqueio@exemplo.com", ADMIN_PASSWORD, false);
  await expect(loginError(page)).toContainText("E-mail ou senha incorretos");
  await expect(page).toHaveURL(/\/admin\/login$/);

  await withDb(async (db) => {
    const r = await db.query(`SELECT "lockedUntil" FROM "User" WHERE email = 'bloqueio@exemplo.com'`);
    expect(new Date(r.rows[0].lockedUntil).getTime()).toBeGreaterThan(Date.now());
  });
});

test("atendente não acessa áreas de administração", async ({ page }) => {
  await login(page, "atendente@exemplo.com");
  await expect(page.getByRole("heading", { name: "Relatos" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Usuários" })).toHaveCount(0);
  await page.goto("/admin/usuarios");
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/configuracoes");
  await expect(page).toHaveURL(/\/admin$/);
});

test("cookie de sessão é httpOnly, SameSite=Strict e restrito a /admin", async ({ page, context }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "Relatos" })).toBeVisible();
  const session = (await context.cookies()).find((c) => c.name === "admin_session")!;
  expect(session.httpOnly).toBe(true);
  expect(session.sameSite).toBe("Strict");
  expect(session.path).toBe("/admin");
});
