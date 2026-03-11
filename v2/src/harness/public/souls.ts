import type {
  AddTraitInput,
  CreateSoulInput,
  ReviseTraitInput,
  Soul,
  SoulTrait,
  UpdateSoulInput,
} from "../../core/souls/api/types.ts";
import {
  addTrait,
  awakenSoul,
  createSoul,
  reactivateTrait,
  retireSoul,
  revertLevelUp,
  revertTrait,
  reviseTrait,
  updateSoul,
} from "../../core/souls/api/write/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

export function createSoulEntry(db: DatabaseHandle, input: CreateSoulInput): Soul {
  return createSoul(db, input);
}

export function updateSoulEntry(db: DatabaseHandle, id: number, input: UpdateSoulInput): Soul {
  return updateSoul(db, id, input);
}

export function retireSoulEntry(db: DatabaseHandle, id: number): void {
  retireSoul(db, id);
}

export function awakenSoulEntry(db: DatabaseHandle, id: number, newName?: string): Soul {
  return awakenSoul(db, id, newName);
}

export function addSoulTrait(db: DatabaseHandle, soulId: number, input: AddTraitInput): SoulTrait {
  return addTrait(db, soulId, input);
}

export function reviseSoulTrait(
  db: DatabaseHandle,
  traitId: number,
  input: ReviseTraitInput,
): SoulTrait {
  return reviseTrait(db, traitId, input);
}

export function revertSoulTrait(db: DatabaseHandle, traitId: number): SoulTrait {
  return revertTrait(db, traitId);
}

export function reactivateSoulTrait(db: DatabaseHandle, traitId: number): SoulTrait {
  return reactivateTrait(db, traitId);
}

export function revertSoulLevel(db: DatabaseHandle, soulId: number): Soul {
  return revertLevelUp(db, soulId);
}
