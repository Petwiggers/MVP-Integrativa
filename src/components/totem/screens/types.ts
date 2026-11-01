import type { Dispatch } from "react";
import type { TotemConfig } from "@/lib/settings-schema";
import type { FlowAction, FlowState } from "../flow";

export type ScreenProps = {
  state: FlowState;
  dispatch: Dispatch<FlowAction>;
  /** Apaga tudo e volta à tela de descanso. */
  exit: () => void;
  config: TotemConfig;
};
