import type { DemoState } from "@/lib/store";

import type { Derived, FieldKey, FormPatch, NewOrderForm } from "./model";

/** What every step gets from the wizard. */
export type StepProps = {
  s: DemoState;
  form: NewOrderForm;
  d: Derived;
  set: (patch: FormPatch) => void;
  /** The field's error, once Continue has been tried on its step (then live as the brand types). */
  err: (key: FieldKey) => string | undefined;
  goTo: (step: number) => void;
  headingRef: React.Ref<HTMLHeadingElement>;
};
