// Gera segredos aleatórios para o .env (ou para as variáveis da Vercel).
import { randomBytes } from "node:crypto";

const b64 = (n) => randomBytes(n).toString("base64");

console.log(`ENCRYPTION_KEY="${b64(32)}"`);
console.log(`PROTOCOL_PEPPER="${b64(32)}"`);
console.log(`IP_HASH_SECRET="${b64(32)}"`);
console.log(`CRON_SECRET="${randomBytes(32).toString("hex")}"`);
