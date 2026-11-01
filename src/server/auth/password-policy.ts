import { ZxcvbnFactory } from "@zxcvbn-ts/core";
import * as common from "@zxcvbn-ts/language-common";
import * as ptBr from "@zxcvbn-ts/language-pt-br";

// Política de senha forte para o painel exposto na internet.
export const MIN_PASSWORD_LENGTH = 12;
export const MIN_SCORE = 3; // 0–4 no zxcvbn

let factory: ZxcvbnFactory | undefined;
function getFactory() {
  factory ??= new ZxcvbnFactory({
    dictionary: { ...common.dictionary, ...ptBr.dictionary },
    graphs: common.adjacencyGraphs,
    translations: ptBr.translations,
  });
  return factory;
}

const COMPANY_WORDS = ["totem", "escuta", "acolhimento", "empresa", "admin", "senha", "rh"];

/** Retorna a lista de problemas (vazia = senha aceita). */
export function checkPasswordStrength(password: string, userInputs: string[] = []): string[] {
  const problems: string[] = [];
  if (password.length < MIN_PASSWORD_LENGTH) {
    problems.push(`Use pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }
  if (password.length > 128) problems.push("Use no máximo 128 caracteres.");
  // Sem o nome/e-mail do próprio usuário, a senha ainda precisa ter corpo.
  let rest = password.toLowerCase();
  for (const input of userInputs.flatMap((u) => u.toLowerCase().split(/[\s@._-]+/))) {
    if (input.length >= 3) rest = rest.split(input).join("");
  }
  if (rest.length < 8) problems.push("Não monte a senha com seu nome ou e-mail.");
  const result = getFactory().check(password.slice(0, 128), [...userInputs, ...COMPANY_WORDS]);
  if (result.score < MIN_SCORE) {
    problems.push("Senha fácil de adivinhar. Combine palavras pouco comuns, números e símbolos.");
    if (result.feedback.warning) problems.push(result.feedback.warning);
  }
  return problems;
}
