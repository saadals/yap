import type { DemoState } from "@/lib/store";
import type { Product } from "@/lib/types";

import type { FieldKey, Market, WizardForm } from "./shared";

export type FormPatch = Partial<WizardForm> | ((form: WizardForm) => Partial<WizardForm>);

/** Everything a wizard step needs. */
export type StepProps = {
  s: DemoState;
  form: WizardForm;
  set: (patch: FormPatch) => void;
  product?: Product;
  products: Product[];
  market: Market;
  /** Visible error for a field (after blur or a Continue attempt). */
  error: (field: FieldKey) => string | undefined;
  touch: (field: FieldKey) => void;
  goTo: (step: number) => void;
};
