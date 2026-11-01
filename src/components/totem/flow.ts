import type { ThemeValue } from "@/lib/constants";

// Máquina de telas do totem. Todo o estado vive só em memória (nunca em storage).

export type Step =
  | "rest"
  | "identify"
  | "identifyDetails"
  | "mood"
  | "theme"
  | "story"
  | "urgency"
  | "support"
  | "consent"
  | "confirm"
  | "goodbye"
  | "track";

export type Identification = "ANONIMO" | "IDENTIFICADO" | "CONTATO";

export type Draft = {
  identification: Identification;
  name: string;
  sector: string;
  contact: string;
  mood: number | null;
  theme: ThemeValue | null;
  story: string;
  urgent: boolean;
};

export type FlowState = { step: Step; history: Step[]; draft: Draft; protocol: string | null };

export type FlowAction =
  | { type: "go"; step: Step }
  | { type: "back" }
  | { type: "update"; patch: Partial<Draft> }
  | { type: "submitted"; protocol: string };

export const emptyDraft = (): Draft => ({
  identification: "ANONIMO",
  name: "",
  sector: "",
  contact: "",
  mood: null,
  theme: null,
  story: "",
  urgent: false,
});

export const initialFlow = (): FlowState => ({ step: "rest", history: [], draft: emptyDraft(), protocol: null });

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "go":
      return { ...state, step: action.step, history: [...state.history, state.step] };
    case "back": {
      const history = [...state.history];
      const prev = history.pop() ?? "rest";
      return { ...state, step: prev, history };
    }
    case "update":
      return { ...state, draft: { ...state.draft, ...action.patch } };
    case "submitted":
      // Depois do envio o rascunho é descartado; só o protocolo fica até o encerramento.
      return { step: "confirm", history: [], draft: emptyDraft(), protocol: action.protocol };
  }
}
