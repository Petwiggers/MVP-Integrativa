import { NoopNotifier } from "./noop";
import type { Notifier } from "./types";

export type { Notifier } from "./types";

let notifier: Notifier = new NoopNotifier();

export function getNotifier(): Notifier {
  return notifier;
}

/** Permite trocar a implementação (ex.: EmailNotifier) na inicialização ou em testes. */
export function setNotifier(next: Notifier) {
  notifier = next;
}

/** Notificar nunca pode impedir o envio de um relato. */
export async function notifySafely(fn: (n: Notifier) => Promise<void>) {
  try {
    await fn(notifier);
  } catch {
    // Silencioso de propósito: falha de notificação não é logada com dados do relato.
  }
}
