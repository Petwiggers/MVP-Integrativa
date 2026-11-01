# Espaço de Escuta — Totem de bem-estar (MVP)

Totem touch (tablet ~10") onde colaboradores — inclusive quem não tem computador ou celular corporativo — podem relatar problemas pessoais ou de trabalho com segurança, e um **Painel de Acolhimento** para o RH ler, responder e acompanhar.

Privacidade e sensação de segurança são os requisitos principais: relato anônimo por padrão, nada guardado no navegador, conteúdo cifrado em repouso, data sem horário e dashboards que nunca mostram grupos com menos de 5 relatos.

- **Totem (`/totem`)** — PWA em tela cheia; fluxo de uma decisão por tela; teclado virtual próprio; botão **Sair** e timeout que apagam tudo; consulta anônima por protocolo.
- **Painel (`/admin`)** — login com senha forte, bloqueio após falhas, papéis *admin* e *atendente*, lista priorizada por urgência, respostas, dashboard agregado, configurações, totens e auditoria.

> Os marcadores **[NOME DA EMPRESA]**, **[CONTATOS]** e **[PRAZO]** do briefing são configurações editáveis em **Painel → Configurações** (o seed cria valores de exemplo).

---

## Sumário

1. [Arquitetura](#arquitetura)
2. [Rodar localmente (Docker)](#rodar-localmente-docker)
3. [Variáveis de ambiente](#variáveis-de-ambiente)
4. [Testes](#testes)
5. [Deploy: Vercel (gru1) + Supabase (sa-east-1)](#deploy-vercel-gru1--supabase-sa-east-1)
6. [Configurar o tablet em modo kiosk](#configurar-o-tablet-em-modo-kiosk)
7. [Segurança](#segurança)
8. [Checklist LGPD](#checklist-lgpd)
9. [Riscos residuais conhecidos](#riscos-residuais-conhecidos)
10. [Fora do escopo / próximos passos](#fora-do-escopo--próximos-passos)

---

## Arquitetura

```
 Tablet (PWA /totem, tela cheia)                  Navegador do RH (/admin)
   estado só em memória (React)                     sessão httpOnly, SameSite=Strict, path=/admin
   cookie httpOnly "totem_device" (só o aparelho)           │
        │ fetch /api/totem/*                                │ Server Components + Server Actions
        ▼                                                   ▼
 ┌──────────────────── Next.js 16 (App Router) — Vercel gru1 ─────────────────────┐
 │ src/proxy.ts: CSP com nonce por requisição, no-store, redireciona /admin       │
 │ src/server/*: crypto (AES-256-GCM) · protocolo · rate limit (Postgres) ·       │
 │   auth (argon2id, sessão, bloqueio) · relatos · auditoria · dashboard (k≥5) ·  │
 │   retenção · notificações (interface isolada) · logger sem conteúdo            │
 └──────────────────────────────────┬─────────────────────────────────────────────┘
                                    ▼ Prisma 7 + @prisma/adapter-pg
                    Supabase Postgres sa-east-1  (dev: Postgres 16 no Docker)
 Vercel Cron diário → GET /api/cron/retention (Authorization: Bearer CRON_SECRET)
```

### Estrutura de pastas

```
├─ docker-compose.yml          # Postgres (e app opcional) para desenvolvimento
├─ Dockerfile                  # imagem de desenvolvimento local
├─ vercel.json                 # região gru1, build com migrations, cron de retenção
├─ prisma.config.ts            # config do CLI do Prisma (usa DIRECT_URL)
├─ prisma/ schema.prisma · migrations/ · seed.ts
├─ public/totem/sw.js          # service worker do PWA (sem cache de dados)
├─ scripts/ gen-keys.mjs · retention.ts
├─ src/
│  ├─ proxy.ts                 # CSP/nonce e proteção de rota do /admin
│  ├─ app/
│  │  ├─ totem/                # page (fluxo), parear/, manifest.webmanifest/, icons/[size]/
│  │  ├─ admin/                # login/, (painel)/ relatos, dashboard, configuracoes, usuarios, totens, auditoria, conta
│  │  └─ api/ totem/{config,reports,protocol,pair} · cron/retention
│  ├─ components/
│  │  ├─ totem/                # TotemApp, telas, VirtualKeyboard, IdleGuard, useKioskHardening
│  │  └─ admin/                # ui, charts, ActionForm
│  ├─ lib/                     # compartilhado: constants, dates, protocol-format, validation, k-anonymity
│  ├─ server/                  # somente servidor: db, crypto, protocol, auth/*, reports, audit, ...
│  └─ generated/prisma/        # cliente Prisma gerado (não versionado)
└─ tests/ unit/ · integration/ · e2e/
```

### Decisões de privacidade no modelo de dados

| Regra | Como foi implementado |
|---|---|
| Sem IP, user-agent ou ID do aparelho pessoal | `createReport()` não recebe a requisição; o relato guarda só `deviceId` do totem (nome genérico, ex. "Totem Refeitório"). |
| Sem horário (evita identificação por turno) | `Report.createdOn` é `@db.Date`; não há `createdAt`/`updatedAt` no relato. IDs são UUID aleatórios (nada de autoincremento). O rate limit de envio usa janela diária com término fixo, para não revelar o horário pelo bucket. |
| Conteúdo cifrado | Relato, nome, setor, contato, respostas e protocolo: AES-256-GCM com AAD por registro/campo. |
| Protocolo não fica em claro | Busca por HMAC-SHA256 (`PROTOCOL_PEPPER`); consulta sempre via POST (código nunca em URL/log de acesso). |
| Nada no navegador do totem | Estado só em memória React; "Sair"/timeout desmontam toda a árvore. O único cookie é o do aparelho (httpOnly), conforme decidido. |

---

## Rodar localmente (Docker)

Pré-requisitos: Node 22+, Docker Desktop.

```bash
npm install                      # .npmrc já ativa legacy-peer-deps
cp .env.example .env
npm run gen:keys                 # cole a saída no .env (ENCRYPTION_KEY, PROTOCOL_PEPPER, ...)

docker compose up -d db          # Postgres 16 em localhost:5432 (UTC, sem log de SQL)
npx prisma migrate deploy        # cria as tabelas
npm run db:seed                  # admin/atendente de teste, 2 totens e 12 relatos fictícios
npm run dev                      # http://localhost:3000
```

Alternativa com o app também no Docker: `docker compose --profile app up --build`.

**Acessos criados pelo seed (apenas desenvolvimento):**

| | |
|---|---|
| Admin | `admin@exemplo.com` / valor de `SEED_ADMIN_PASSWORD` (padrão `Acolher-Totem-2026!`) |
| Atendente | `atendente@exemplo.com` / mesma senha |
| Totem já pareado | cookie `totem_device` = `SEED_DEVICE_TOKEN` (usado pelos testes) |
| Totem para parear | abra `http://localhost:3000/totem/parear` e digite **`PAREAR`** (válido por 24h após o seed) |

Para emular o tablet: DevTools → *Toggle device toolbar* → 800×1280 (retrato) ou 1280×800 (paisagem).

---

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | sim | Conexão usada pelo app. No Supabase: **pooler em modo transação (porta 6543)**. |
| `DIRECT_URL` | sim (migrations) | Conexão direta/sessão (porta 5432) usada por `prisma migrate`. |
| `ENCRYPTION_KEY` | sim | 32 bytes em base64. Cifra relatos, identificação, respostas e protocolos. **Perder a chave = perder os dados.** |
| `ENCRYPTION_KEY_PREVIOUS` | não | Chave anterior, aceita só para leitura durante rotação. |
| `PROTOCOL_PEPPER` | sim | Segredo do HMAC dos protocolos. Trocar invalida as consultas por protocolo existentes. |
| `IP_HASH_SECRET` | sim | Segredo do HMAC do IP usado **apenas** no rate limit do login do `/admin`. |
| `CRON_SECRET` | sim | Protege `/api/cron/retention`. A Vercel envia automaticamente `Authorization: Bearer <CRON_SECRET>`. |
| `SEED_DEVICE_TOKEN`, `SEED_ADMIN_PASSWORD` | só dev | Usadas pelo seed e pelos testes. **Não defina em produção.** |

Gere segredos com `npm run gen:keys`. Use valores diferentes por ambiente (dev, preview, produção).

Configurações de negócio (contatos, prazo, timeout, orientação do PWA, retenção, termo LGPD) ficam no banco e são editadas em **Painel → Configurações** — não precisam de redeploy.

### Rotação da chave de criptografia

1. Mova a chave atual para `ENCRYPTION_KEY_PREVIOUS` e gere uma nova `ENCRYPTION_KEY`.
2. Faça o deploy: novas gravações usam a nova chave; leituras aceitam as duas (o `kid` no texto cifrado indica qual).
3. (Opcional) Recifre os registros antigos com um script e remova `ENCRYPTION_KEY_PREVIOUS`.

---

## Testes

```bash
npm test                 # unitários (Vitest): criptografia, protocolo, k-anonimato, bloqueio, política de senha, logger
npm run test:integration # integração com o Postgres do Docker: rate limit e job de retenção
npm run test:e2e         # Playwright (sobe `next dev` se não houver servidor; roda seed antes)
npm run test:all         # tudo acima
npm run typecheck && npm run lint
```

Primeira vez com Playwright: `npx playwright install chromium`.

Cobertura e2e (projetos `tablet-retrato` 800×1280, `tablet-paisagem` 1280×800 e `painel-rh`):

- fluxo anônimo completo → protocolo → encerramento automático → consulta do protocolo; verifica que nada ficou em `localStorage`/`sessionStorage`/cookies e que o banco não tem texto em claro nem colunas de horário/IP;
- urgência → tela de apoio com CVV 188 e relato marcado como urgente;
- botão **Sair** presente em todas as telas e limpando o estado;
- **timeout**: nada antes de 90 s, aviso com contagem de 10 s, toque cancela, sem toque volta ao início e apaga tudo (relógio simulado com `page.clock`);
- painel: redirecionamento sem sessão, resposta do RH visível no totem, identificação oculta até revelar (auditado), filtros, dashboard com supressão < 5, bloqueio após 5 falhas, permissões do atendente, flags do cookie de sessão;
- segurança: CSP/cabeçalhos, cron protegido, rate limit anti-enumeração de protocolos, validação estrita da API.

Para rodar o e2e contra o build de produção: `npm run build && npx next start --port 3100` e, em outro terminal, `E2E_PORT=3100 npm run test:e2e`.

---

## Deploy: Vercel (gru1) + Supabase (sa-east-1)

### 1. Supabase

1. Crie um projeto em **South America (São Paulo) — `sa-east-1`**. Guarde a senha do banco.
2. Em **Project Settings → Database → Connection string**, copie:
   - **Transaction pooler** (porta **6543**) → será o `DATABASE_URL`;
   - **Session pooler** ou **Direct connection** (porta **5432**) → será o `DIRECT_URL`.
3. Recomendado:
   - **Database → Settings → SSL enforcement**: ligado.
   - **API → Data API**: desative a API REST/GraphQL automática (o app acessa só via Prisma). Se mantiver, deixe o RLS ligado em todas as tabelas sem policies.
   - Ative backups (PITR no plano pago) — lembrando que backups também contêm dados (cifrados) e seguem a retenção do Supabase.

### 2. Vercel

1. Importe o repositório na Vercel (framework: Next.js). O `vercel.json` já define:
   - `regions: ["gru1"]` (São Paulo, perto do banco);
   - `buildCommand`: `prisma generate && prisma migrate deploy && next build` (aplica migrations a cada deploy);
   - cron diário `0 6 * * *` (03:00 em Brasília) → `/api/cron/retention`.
2. Em **Settings → Environment Variables**, cadastre para *Production* (e valores diferentes para *Preview*, de preferência apontando para outro banco):
   `DATABASE_URL`, `DIRECT_URL`, `ENCRYPTION_KEY`, `PROTOCOL_PEPPER`, `IP_HASH_SECRET`, `CRON_SECRET`.
   Marque-as como **Sensitive**.
3. Confirme em **Settings → Functions** que a região é `gru1`.
4. Faça o deploy. Depois, crie o primeiro admin real (o seed é só para dev), a partir da sua máquina,
   com as variáveis de **produção** no ambiente do terminal (não grave em arquivo versionado):
   ```bash
   DATABASE_URL='<DIRECT_URL do Supabase>' ENCRYPTION_KEY='...' PROTOCOL_PEPPER='...'    ADMIN_PASSWORD='uma senha longa e forte'    npm run admin:create -- voce@empresa.com.br "Seu Nome"
   ```
   O script aplica a mesma política de senha do painel. Os demais usuários são criados em **Painel → Usuários**.
5. No painel: **Configurações** (nome da empresa, contatos do RH/psicologia, prazo, retenção, termo), **Totens** → *Novo totem* para gerar o código de pareamento.
6. Recomendações da plataforma:
   - **não** habilite Log Drains nem integrações de observabilidade que capturem corpo de requisição;
   - mantenha a retenção de logs da Vercel no mínimo do plano;
   - proteja os deploys de *Preview* (Vercel Authentication) — eles também expõem `/admin`;
   - domínio próprio com HTTPS (automático na Vercel). HSTS já é enviado pelo app.

---

## Configurar o tablet em modo kiosk

### Antes de tudo (qualquer tablet)

- Atualize o sistema e o navegador; conecte à rede corporativa (de preferência uma rede/VLAN só para totens).
- Desative notificações, assistente de voz, captura de tela por gesto e contas pessoais.
- Brilho fixo, tela sempre ligada enquanto carrega (Opções do desenvolvedor → *Permanecer ativo*) ou proteção de tela longa.
- Posicione o totem num local com **privacidade visual** (sem câmeras ou circulação atrás de quem digita).

### Pareamento (uma vez por tablet)

1. No painel, **Totens → Novo totem** (nome genérico, ex. "Totem Refeitório") → anote o código (10 min, uso único).
2. No tablet, abra `https://SEU-DOMINIO/totem/parear`, digite o código. O tablet recebe um cookie httpOnly que identifica **só o aparelho**.
3. Para trocar o tablet: **Totens → Trocar o tablet** (gera novo código e desconecta o anterior). Se um tablet for perdido: **Revogar acesso**.

### Android (recomendado)

1. No **Chrome**, abra `https://SEU-DOMINIO/totem` → menu ⋮ → **Instalar app** / *Adicionar à tela inicial*. O PWA abre em **tela cheia** (`display: fullscreen`), com orientação conforme **Configurações → Orientação do PWA** (livre, retrato ou paisagem).
2. Trave o tablet no app — escolha uma opção:
   - **Fixação de tela** (nativo): Configurações → Segurança → *Fixar app* (exigir PIN para soltar). Abra o PWA → Recentes → ícone do app → *Fixar*.
   - **Lock Task / MDM** (frota): Android Enterprise com o PWA como app único (Google Workspace/Intune/etc.).
   - **Fully Kiosk Browser** (alternativa): URL inicial `https://SEU-DOMINIO/totem`, ativar *Kiosk Mode*, desativar barra de endereço, *Clear Cache/Cookies on reload* **desligado** (senão perde o pareamento), *Disable pull to refresh*, *Disable zoom*, *Autostart on boot*.
3. Teclado: o totem usa **teclado virtual próprio** e nunca abre o teclado do sistema — assim o Gboard não aprende nem sugere palavras de relatos anteriores. Mesmo assim, desative *Sugestões/aprendizado* do teclado do sistema por precaução.

### iPad

1. No **Safari**, abra `https://SEU-DOMINIO/totem` → Compartilhar → **Adicionar à Tela de Início**.
2. Ajustes → Acessibilidade → **Acesso Guiado**: ligue, defina código. Abra o app e clique 3× no botão lateral → *Iniciar*. Desative toques em áreas fora do app e o botão de bloqueio, se desejar.
3. Rotação: trave pela Central de Controle conforme a orientação configurada.

### Computador/totem com Chrome desktop (alternativa)

```bash
# Windows (atalho de inicialização)
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk https://SEU-DOMINIO/totem ^
  --no-first-run --disable-pinch --overscroll-history-navigation=0 --disable-translate ^
  --disable-features=TranslateUI,AutofillServerCommunication --password-store=basic ^
  --user-data-dir=C:\totem-chrome

# Linux
google-chrome --kiosk https://SEU-DOMINIO/totem --no-first-run --disable-pinch \
  --overscroll-history-navigation=0 --disable-translate --user-data-dir=/var/lib/totem-chrome
```

Use um perfil dedicado (`--user-data-dir`) e uma conta do sistema sem privilégios, com login automático.

### O que o próprio app já faz no totem

- sem zoom (viewport fixo, pinça e Ctrl+roda bloqueados), sem seleção de texto, sem menu de contexto, sem arrastar;
- botão voltar do Android neutralizado e links para fora de `/totem` bloqueados;
- timeout de inatividade (padrão 90 s + aviso de 10 s, configurável) e botão **Sair** em todas as telas;
- service worker que **não guarda cache** de páginas nem da API; sem rede, mostra uma tela neutra com o CVV.

---

## Segurança

- **Criptografia em repouso**: AES-256-GCM (`src/server/crypto.ts`), IV aleatório, tag de autenticação, AAD por registro e campo, identificador de chave para rotação.
- **Senhas**: argon2id (m=19 MiB, t=2, p=1). Política: ≥ 12 caracteres, zxcvbn com dicionário pt-BR (score ≥ 3), sem montar a senha com nome/e-mail.
- **Login**: mensagens genéricas, tempo constante para usuário inexistente, rate limit por e-mail (10/15 min) e por IP em HMAC (20/15 min), **bloqueio da conta após 5 falhas** (15 min, dobrando até 24 h), desbloqueio por admin.
- **Sessão**: token aleatório (só o SHA-256 no banco), cookie `httpOnly`, `Secure`, `SameSite=Strict`, `path=/admin`; expira em 8 h ou 30 min sem uso; trocar senha/desativar usuário encerra as sessões.
- **Totem ↔ API**: cookie de dispositivo (hash no banco, revogável), rate limit por totem; consulta de protocolo com limite por totem (15/10 min) e global (anti-enumeração; 31⁶ ≈ 887 milhões de códigos).
- **Cabeçalhos**: CSP com nonce por requisição e `strict-dynamic`, `frame-ancestors 'none'`, HSTS, `nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy` restritiva, `Cache-Control: no-store`.
- **CSRF**: Server Actions do Next validam `Origin`; cookie `SameSite=Strict`.
- **Logs**: `src/server/logger.ts` só aceita campos de uma lista permitida e registra apenas o tipo do erro; o Prisma não loga queries; o Postgres local roda com `log_statement=none`.
- **Auditoria** append-only: visualização de relato, revelação da identificação, mudança de status, resposta, logins, alterações de usuários/totens/configurações e exclusões por retenção.

---

## Checklist LGPD

**Base legal e transparência**
- [ ] Definir a base legal com o jurídico/DPO (ex.: legítimo interesse/cumprimento de obrigação de saúde e segurança do trabalho; dados de saúde mental são **sensíveis** — art. 11).
- [ ] Revisar e publicar o texto do **termo** (Painel → Configurações). Cada relato registra a versão aceita.
- [ ] Incluir o canal no Aviso de Privacidade dos colaboradores (finalidade, quem acessa, retenção, direitos).
- [ ] Registrar o tratamento no ROPA e elaborar o **RIPD/DPIA** (dados sensíveis + possível vulnerabilidade do titular).

**Minimização (já implementado)**
- [x] Anônimo como padrão; identificação opcional e só os campos necessários.
- [x] Sem IP, user-agent, ID do aparelho pessoal ou horário no relato (só a data).
- [x] Nada persistido no navegador do totem; teclado próprio sem aprendizado.
- [x] Dashboard só com agregados e supressão de grupos < 5 (com supressão complementar).

**Segurança (art. 46)**
- [x] Criptografia em repouso (AES-256-GCM) e em trânsito (HTTPS/HSTS).
- [x] Controle de acesso por papéis, senha forte, bloqueio, sessões curtas.
- [x] Auditoria de quem visualizou/alterou cada relato e de quem revelou a identificação.
- [x] Logs de aplicação sem conteúdo.
- [ ] Guardar `ENCRYPTION_KEY`/`PROTOCOL_PEPPER` em cofre de segredos com acesso restrito; plano de rotação.
- [ ] Revisar periodicamente usuários ativos e a trilha de auditoria.

**Retenção e eliminação (art. 15/16)**
- [x] Job diário remove relatos **encerrados** há mais de *X* dias (configurável) junto com as respostas.
- [ ] Definir *X* com o jurídico; lembrar que backups do Supabase seguem a própria janela de retenção.
- [ ] Política para relatos que nunca são encerrados (revisão periódica pela equipe).

**Direitos dos titulares e incidentes**
- [ ] Procedimento para pedidos de acesso/eliminação de relatos **identificados** (relatos anônimos não são vinculáveis ao titular — explicar isso no aviso).
- [ ] Plano de resposta a incidentes (comunicação à ANPD e aos titulares quando aplicável).
- [ ] Contrato/DPA com operadores (Vercel, Supabase) e avaliação de transferência internacional, se houver.

**Uso responsável**
- [ ] Treinar a equipe de acolhimento: não tentar identificar autores anônimos; não escrever dados pessoais nas respostas (qualquer pessoa com o protocolo as lê no totem).
- [ ] Fluxo de urgência combinado com psicologia/medicina do trabalho; manter CVV (188) e SAMU (192) visíveis.

---

## Riscos residuais conhecidos

- **Logs da plataforma**: a Vercel registra IP e horário de cada requisição (`POST /api/totem/reports`). Isso foge do controle do app; mitigação: retenção mínima de logs, sem Log Drains, acesso restrito ao painel da Vercel. O IP registrado é o do tablet, não o de uma pessoa.
- **Volume baixo**: num totem pouco usado, "data + totem + tema" pode sugerir quem escreveu. Por isso o dashboard suprime grupos pequenos; a equipe deve ser orientada a não fazer inferências.
- **Ordem física no banco**: o Postgres não guarda horário do relato, mas um DBA com acesso de baixo nível poderia inferir ordem de inserção (ex.: WAL). Restrinja o acesso ao banco de produção.
- **Privacidade visual**: alguém olhando por cima do ombro — resolvido pelo posicionamento físico do totem.

---

## Fora do escopo / próximos passos

- Áudio, integração com canal de denúncias terceirizado, notificações por e-mail/WhatsApp e app mobile **não foram implementados**.
- Notificações estão prontas para plugar: implemente `Notifier` (`src/server/notifications/types.ts`) e registre com `setNotifier()`. Os eventos (`reportCreated`, `reportReplied`) carregam **apenas o id e a urgência**, nunca conteúdo.
- Sugestões: 2FA (TOTP) para o painel, recifragem automática após rotação de chave, modo escuro no painel.
