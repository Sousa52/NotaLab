import { describe, expect, it } from 'vitest'
import { convert, formatConvertedValue, getDefaultUnits, getUnitsForCategory } from './calculate'

/** Parses a pt-PT formatted number (e.g. "1.609,34" or "0,5") back into a JS number. */
function parsePtNumber(formatted: string): number {
  return Number(formatted.replace(/\./g, '').replace(',', '.'))
}

describe('convert — length', () => {
  it('converts between metric length units', () => {
    expect(convert(100, 'length', 'cm', 'm')).toBeCloseTo(1, 10)
    expect(convert(1, 'length', 'km', 'm')).toBeCloseTo(1000, 10)
    expect(convert(2.5, 'length', 'm', 'cm')).toBeCloseTo(250, 10)
  })

  it('converts between imperial length units', () => {
    expect(convert(1, 'length', 'in', 'cm')).toBeCloseTo(2.54, 10)
    expect(convert(1, 'length', 'mi', 'm')).toBeCloseTo(1609.344, 6)
    expect(convert(3, 'length', 'ft', 'yd')).toBeCloseTo(1, 10)
  })

  it('is reversible (round trip returns to the original value)', () => {
    const converted = convert(42, 'length', 'mm', 'mi')
    const roundTrip = convert(converted, 'length', 'mi', 'mm')
    expect(roundTrip).toBeCloseTo(42, 6)
  })
})

describe('convert — mass', () => {
  it('converts between metric mass units', () => {
    expect(convert(1, 'mass', 'kg', 'g')).toBeCloseTo(1000, 10)
    expect(convert(1, 'mass', 't', 'kg')).toBeCloseTo(1000, 10)
    expect(convert(500, 'mass', 'mg', 'g')).toBeCloseTo(0.5, 10)
  })

  it('converts between imperial mass units, including the 16oz = 1lb identity', () => {
    expect(convert(16, 'mass', 'oz', 'lb')).toBeCloseTo(1, 8)
    expect(convert(1, 'mass', 'lb', 'kg')).toBeCloseTo(0.45359237, 8)
  })

  it('handles decimal values', () => {
    expect(convert(2.75, 'mass', 'kg', 'g')).toBeCloseTo(2750, 8)
  })
})

describe('convert — volume', () => {
  it('converts between metric volume units', () => {
    expect(convert(1, 'volume', 'l', 'ml')).toBeCloseTo(1000, 10)
    expect(convert(1, 'volume', 'm3', 'l')).toBeCloseTo(1000, 10)
  })

  it('converts US customary culinary units', () => {
    expect(convert(1, 'volume', 'gal', 'l')).toBeCloseTo(3.785411784, 8)
    expect(convert(16, 'volume', 'tbsp', 'cup')).toBeCloseTo(1, 3)
    expect(convert(1, 'volume', 'cup', 'ml')).toBeCloseTo(236.5882365, 4)
  })
})

describe('convert — area', () => {
  it('converts between metric area units', () => {
    expect(convert(1, 'area', 'km2', 'ha')).toBeCloseTo(100, 10)
    expect(convert(1, 'area', 'ha', 'm2')).toBeCloseTo(10_000, 10)
    expect(convert(10_000, 'area', 'cm2', 'm2')).toBeCloseTo(1, 10)
  })

  it('converts acres', () => {
    expect(convert(1, 'area', 'acre', 'm2')).toBeCloseTo(4046.8564224, 6)
  })
})

describe('convert — temperature', () => {
  it('converts Celsius to Fahrenheit and back', () => {
    expect(convert(0, 'temperature', 'c', 'f')).toBeCloseTo(32, 10)
    expect(convert(100, 'temperature', 'c', 'f')).toBeCloseTo(212, 10)
    expect(convert(212, 'temperature', 'f', 'c')).toBeCloseTo(100, 10)
  })

  it('converts Celsius to Kelvin and back', () => {
    expect(convert(0, 'temperature', 'c', 'k')).toBeCloseTo(273.15, 10)
    expect(convert(0, 'temperature', 'k', 'c')).toBeCloseTo(-273.15, 10)
  })

  it('converts Fahrenheit to Kelvin and back', () => {
    expect(convert(0, 'temperature', 'k', 'f')).toBeCloseTo(-459.67, 6)
    expect(convert(-459.67, 'temperature', 'f', 'k')).toBeCloseTo(0, 4)
  })

  it('handles negative temperatures correctly', () => {
    expect(convert(-10, 'temperature', 'c', 'f')).toBeCloseTo(14, 10)
    expect(convert(-40, 'temperature', 'c', 'f')).toBeCloseTo(-40, 10)
    expect(convert(-40, 'temperature', 'f', 'c')).toBeCloseTo(-40, 10)
  })
})

describe('convert — invalid combinations', () => {
  it('throws when the unit does not belong to the given category', () => {
    expect(() => convert(1, 'length', 'kg', 'm')).toThrow()
    expect(() => convert(1, 'mass', 'm', 'kg')).toThrow()
    expect(() => convert(1, 'temperature', 'm', 'c')).toThrow()
  })

  it('still throws for a bogus unit even when fromUnit equals toUnit', () => {
    expect(() => convert(1, 'length', 'bogus', 'bogus')).toThrow()
    expect(() => convert(1, 'temperature', 'bogus', 'bogus')).toThrow()
  })
})

describe('convert — identity conversions are exact for every category', () => {
  // Regression coverage for the bug where value * factor / factor (or, for
  // temperature, a round trip through Celsius) could introduce floating-point
  // noise even though converting a unit to itself is mathematically a no-op.
  it('length', () => {
    expect(convert(17.5, 'length', 'km', 'km')).toBe(17.5)
  })

  it('mass', () => {
    expect(convert(2.75, 'mass', 'lb', 'lb')).toBe(2.75)
  })

  it('volume', () => {
    expect(convert(3, 'volume', 'pt', 'pt')).toBe(3)
  })

  it('area', () => {
    expect(convert(9.4, 'area', 'acre', 'acre')).toBe(9.4)
  })

  it('temperature — every unit, not just Celsius', () => {
    // Celsius passes straight through even without the short-circuit, but Fahrenheit
    // and Kelvin both go through arithmetic (multiply/divide or subtract/add) that
    // can leave floating-point residue on a round trip, so they're the ones that
    // actually exercise the fix.
    expect(convert(36.6, 'temperature', 'c', 'c')).toBe(36.6)
    expect(convert(98.6, 'temperature', 'f', 'f')).toBe(98.6)
    expect(convert(310.15, 'temperature', 'k', 'k')).toBe(310.15)
    expect(convert(-40, 'temperature', 'f', 'f')).toBe(-40)
  })
})

describe('getUnitsForCategory / getDefaultUnits', () => {
  it('returns the expected number of units per category', () => {
    expect(getUnitsForCategory('length')).toHaveLength(8)
    expect(getUnitsForCategory('mass')).toHaveLength(6)
    expect(getUnitsForCategory('temperature')).toHaveLength(3)
    expect(getUnitsForCategory('volume')).toHaveLength(8)
    expect(getUnitsForCategory('area')).toHaveLength(6)
  })

  it('picks two distinct default units for a category with more than one unit', () => {
    const defaults = getDefaultUnits('length')
    expect(defaults.from).not.toBe(defaults.to)
  })
})

describe('formatConvertedValue', () => {
  it('formats zero plainly', () => {
    expect(formatConvertedValue(0)).toBe('0')
  })

  it('trims trailing zeros for whole and simple decimal numbers', () => {
    expect(formatConvertedValue(15)).toBe('15')
    expect(formatConvertedValue(2.5)).toBe('2,5')
  })

  it('keeps more precision for small values under 1', () => {
    expect(formatConvertedValue(1 / 3)).toBe('0,333333')
  })

  it('caps large values at 2 decimal places', () => {
    const parsed = parsePtNumber(formatConvertedValue(1609.344))
    expect(parsed).toBeCloseTo(1609.34, 2)
  })

  it('rounds away floating point noise', () => {
    // 0.1 + 0.2 famously produces 0.30000000000000004 in IEEE 754 arithmetic.
    expect(formatConvertedValue(0.1 + 0.2)).toBe('0,3')
  })
})
