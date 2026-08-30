export type UnitCategoryId = 'length' | 'mass' | 'temperature' | 'volume' | 'area'

export interface UnitOption {
  id: string
  /** Shown in the unit dropdowns, e.g. "Metros (m)". */
  label: string
  /** Short form shown next to the converted result, e.g. "m". */
  symbol: string
}

export interface UnitCategoryDefinition {
  id: UnitCategoryId
  label: string
  units: UnitOption[]
}

/** Multiplier to convert 1 of the unit into the category's base unit. */
type LinearUnitTable = Record<string, number>

const LENGTH_UNITS: UnitOption[] = [
  { id: 'mm', label: 'Milímetros (mm)', symbol: 'mm' },
  { id: 'cm', label: 'Centímetros (cm)', symbol: 'cm' },
  { id: 'm', label: 'Metros (m)', symbol: 'm' },
  { id: 'km', label: 'Quilómetros (km)', symbol: 'km' },
  { id: 'in', label: 'Polegadas (in)', symbol: 'in' },
  { id: 'ft', label: 'Pés (ft)', symbol: 'ft' },
  { id: 'yd', label: 'Jardas (yd)', symbol: 'yd' },
  { id: 'mi', label: 'Milhas (mi)', symbol: 'mi' },
]

// Base unit: metre.
const LENGTH_FACTORS: LinearUnitTable = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  km: 1000,
  in: 0.0254,
  ft: 0.3048,
  yd: 0.9144,
  mi: 1609.344,
}

const MASS_UNITS: UnitOption[] = [
  { id: 'mg', label: 'Miligramas (mg)', symbol: 'mg' },
  { id: 'g', label: 'Gramas (g)', symbol: 'g' },
  { id: 'kg', label: 'Quilogramas (kg)', symbol: 'kg' },
  { id: 't', label: 'Toneladas (t)', symbol: 't' },
  { id: 'oz', label: 'Onças (oz)', symbol: 'oz' },
  { id: 'lb', label: 'Libras (lb)', symbol: 'lb' },
]

// Base unit: kilogram.
const MASS_FACTORS: LinearUnitTable = {
  mg: 0.000001,
  g: 0.001,
  kg: 1,
  t: 1000,
  oz: 0.028349523125,
  lb: 0.45359237,
}

const VOLUME_UNITS: UnitOption[] = [
  { id: 'ml', label: 'Mililitros (ml)', symbol: 'ml' },
  { id: 'l', label: 'Litros (l)', symbol: 'l' },
  { id: 'm3', label: 'Metros cúbicos (m³)', symbol: 'm³' },
  { id: 'tsp', label: 'Colheres de chá', symbol: 'colh. chá' },
  { id: 'tbsp', label: 'Colheres de sopa', symbol: 'colh. sopa' },
  { id: 'cup', label: 'Chávenas', symbol: 'chávenas' },
  { id: 'pt', label: 'Pints', symbol: 'pints' },
  { id: 'gal', label: 'Galões', symbol: 'galões' },
]

// Base unit: litre. Culinary units (colher de chá/sopa, chávena, pint, galão) follow the
// US customary system, the most common convention in digital unit converters.
const VOLUME_FACTORS: LinearUnitTable = {
  ml: 0.001,
  l: 1,
  m3: 1000,
  tsp: 0.00492892159375,
  tbsp: 0.0147867647813,
  cup: 0.2365882365,
  pt: 0.473176473,
  gal: 3.785411784,
}

const AREA_UNITS: UnitOption[] = [
  { id: 'mm2', label: 'Milímetros quadrados (mm²)', symbol: 'mm²' },
  { id: 'cm2', label: 'Centímetros quadrados (cm²)', symbol: 'cm²' },
  { id: 'm2', label: 'Metros quadrados (m²)', symbol: 'm²' },
  { id: 'km2', label: 'Quilómetros quadrados (km²)', symbol: 'km²' },
  { id: 'ha', label: 'Hectares (ha)', symbol: 'ha' },
  { id: 'acre', label: 'Acres', symbol: 'acres' },
]

// Base unit: square metre.
const AREA_FACTORS: LinearUnitTable = {
  mm2: 0.000001,
  cm2: 0.0001,
  m2: 1,
  km2: 1_000_000,
  ha: 10_000,
  acre: 4046.8564224,
}

const TEMPERATURE_UNITS: UnitOption[] = [
  { id: 'c', label: 'Celsius (°C)', symbol: '°C' },
  { id: 'f', label: 'Fahrenheit (°F)', symbol: '°F' },
  { id: 'k', label: 'Kelvin (K)', symbol: 'K' },
]

export const UNIT_CATEGORIES: UnitCategoryDefinition[] = [
  { id: 'length', label: 'Comprimento', units: LENGTH_UNITS },
  { id: 'mass', label: 'Peso / Massa', units: MASS_UNITS },
  { id: 'temperature', label: 'Temperatura', units: TEMPERATURE_UNITS },
  { id: 'volume', label: 'Volume', units: VOLUME_UNITS },
  { id: 'area', label: 'Área', units: AREA_UNITS },
]

const LINEAR_FACTORS: Partial<Record<UnitCategoryId, LinearUnitTable>> = {
  length: LENGTH_FACTORS,
  mass: MASS_FACTORS,
  volume: VOLUME_FACTORS,
  area: AREA_FACTORS,
}

export function getUnitsForCategory(category: UnitCategoryId): UnitOption[] {
  return UNIT_CATEGORIES.find((c) => c.id === category)?.units ?? []
}

export function getDefaultUnits(category: UnitCategoryId): { from: string; to: string } {
  const units = getUnitsForCategory(category)
  return { from: units[0]?.id ?? '', to: units[1]?.id ?? units[0]?.id ?? '' }
}

// Temperature needs formulas rather than a shared multiplicative base unit, so it's
// handled separately, routed through Celsius as a pivot.
function unitToCelsius(value: number, unit: string): number {
  if (unit === 'c') return value
  if (unit === 'f') return ((value - 32) * 5) / 9
  if (unit === 'k') return value - 273.15
  throw new Error(`Unidade de temperatura desconhecida: ${unit}`)
}

function celsiusToUnit(celsius: number, unit: string): number {
  if (unit === 'c') return celsius
  if (unit === 'f') return (celsius * 9) / 5 + 32
  if (unit === 'k') return celsius + 273.15
  throw new Error(`Unidade de temperatura desconhecida: ${unit}`)
}

/**
 * Throws if `unitId` doesn't belong to `category`. Used to keep the identity
 * short-circuit in `convert()` from silently "succeeding" on a bogus unit id.
 */
function assertUnitBelongsToCategory(category: UnitCategoryId, unitId: string): void {
  if (category === 'temperature') {
    if (unitId !== 'c' && unitId !== 'f' && unitId !== 'k') {
      throw new Error(`Unidade de temperatura desconhecida: ${unitId}`)
    }
    return
  }

  const factors = LINEAR_FACTORS[category]
  if (!factors) {
    throw new Error(`Categoria de unidade desconhecida: ${category}`)
  }
  if (factors[unitId] === undefined) {
    throw new Error(`Unidade não pertence à categoria "${category}".`)
  }
}

export function convert(
  value: number,
  category: UnitCategoryId,
  fromUnit: string,
  toUnit: string,
): number {
  // Converting a unit to itself must return the input unchanged. Without this,
  // linear categories would run value * factor / factor (e.g. 3 * 0.473176473 /
  // 0.473176473 === 2.9999999999999996), and temperature would round-trip through
  // Celsius (e.g. F -> C -> F), either of which can introduce floating-point noise
  // even though the conversion is mathematically a no-op.
  if (fromUnit === toUnit) {
    assertUnitBelongsToCategory(category, fromUnit)
    return value
  }

  if (category === 'temperature') {
    return celsiusToUnit(unitToCelsius(value, fromUnit), toUnit)
  }

  const factors = LINEAR_FACTORS[category]
  if (!factors) {
    throw new Error(`Categoria de unidade desconhecida: ${category}`)
  }

  const fromFactor = factors[fromUnit]
  const toFactor = factors[toUnit]
  if (fromFactor === undefined || toFactor === undefined) {
    throw new Error(`Unidade não pertence à categoria "${category}".`)
  }

  const baseValue = value * fromFactor
  return baseValue / toFactor
}

/**
 * Formats a converted value for display: trims floating-point noise, avoids excessive
 * decimals for large numbers, and keeps enough precision for small ones.
 */
export function formatConvertedValue(value: number): string {
  if (!Number.isFinite(value)) return '—'

  const cleaned = Number(value.toPrecision(12))
  const abs = Math.abs(cleaned)
  const maximumFractionDigits = abs === 0 ? 0 : abs < 1 ? 6 : abs < 100 ? 4 : 2

  return cleaned.toLocaleString('pt-PT', { maximumFractionDigits })
}
