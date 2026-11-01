/** Universal gameplay scale: 1.00 mass unit is exactly 50 kg. */
export const MASS_UNIT_KG = 50;
export const massUnits = (massKg: number): number => massKg / MASS_UNIT_KG;
