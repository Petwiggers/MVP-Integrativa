// Cria (ou redefine) um usuário ADMIN. Uso:
//   ADMIN_PASSWORD='...' npm run admin:create -- voce@empresa.com.br "Seu Nome"
// Lê DATABASE_URL do ambiente (ou do .env). A senha passa pela mesma política do painel.
import "dotenv/config";
import { prisma } from "../src/server/db";
import { hashPassword } from "../src/server/auth/password";
import { checkPasswordStrength } from "../src/server/auth/password-policy";

async function main() {
  const [emailArg, name = "Administrador"] = process.argv.slice(2);
  const email = emailArg?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!email || !email.includes("@")) throw new Error("Informe o e-mail: npm run admin:create -- email \"Nome\"");

  const problems = checkPasswordStrength(password, [name, email]);
  if (problems.length) throw new Error(`Senha recusada (defina ADMIN_PASSWORD): ${problems.join(" ")}`);

  const passwordHash = await hashPassword(password);
  await prisma.user.upsert({
    where: { email },
    create: { email, name, role: "ADMIN", passwordHash },
    update: { role: "ADMIN", passwordHash, active: true, failedAttempts: 0, lockoutCount: 0, lockedUntil: null },
  });
  console.log(`Admin ${email} pronto.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : "Erro");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
