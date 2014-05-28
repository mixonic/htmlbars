import { domHelpers } from "./dom-helpers";
import { Morph } from "./morph";

export function hydrate(spec, options) {
  return spec(domHelpers(), Morph);
}
