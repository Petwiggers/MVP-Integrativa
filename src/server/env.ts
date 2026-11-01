// Módulo exclusivo do servidor (src/server/* nunca é importado por componentes cliente).
// Leitura preguiçosa das variáveis de ambiente: o build não exige segredos,
// mas qualquer uso em runtime sem a variável falha de forma explícita.
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

export const env = {
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get encryptionKey() {
    return required("ENCRYPTION_KEY");
  },
  get encryptionKeyPrevious() {
    return process.env.ENCRYPTION_KEY_PREVIOUS || undefined;
  },
  get protocolPepper() {
    return required("PROTOCOL_PEPPER");
  },
  get ipHashSecret() {
    return required("IP_HASH_SECRET");
  },
  get cronSecret() {
    return required("CRON_SECRET");
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
};
