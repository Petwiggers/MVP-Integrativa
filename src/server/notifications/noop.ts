import type { Notifier } from "./types";

/** Implementação padrão: não envia nada. */
export class NoopNotifier implements Notifier {
  async reportCreated() {}
  async reportReplied() {}
}
