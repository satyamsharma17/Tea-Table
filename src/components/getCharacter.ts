import CoolGuy from "./CoolGuy";
import Wolverine from "./Wolverine";
import Robot from "./Robot";
import Superman from "./Superman";
import Alien from "./Alien";
import Freak from "./Freak";
import type { ComponentType } from "react";

const CHARACTERS: ComponentType<{ size?: number }>[] = [
  CoolGuy,
  Wolverine,
  Robot,
  Superman,
  Alien,
  Freak,
];

/** Deterministic, stable uid → character index via djb2-ish hash. */
function hashUid(uid: string): number {
  let h = 5381;
  for (let i = 0; i < uid.length; i++) {
    h = (Math.imul(h, 33) ^ uid.charCodeAt(i)) >>> 0;
  }
  return h % CHARACTERS.length;
}

/** Returns the character component assigned to this uid. */
export function getCharacter(uid: string): ComponentType<{ size?: number }> {
  return CHARACTERS[hashUid(uid)];
}
