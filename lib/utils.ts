import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Étage 0 = rez-de-chaussée (aligné avec le layout des maisons/immeubles). */
export function floorDisplayLabel(floor: number): string {
  return floor === 0 ? "Rez-de-chaussée" : `Niveau ${floor}`;
}
