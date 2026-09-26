/**
 * @typedef {import('../domain/entities.js').WeekMatrix} WeekMatrix
 * @typedef {import('../domain/entities.js').Demand} Demand
 */

/**
 * Interface for Schedule persistence.
 * @typedef {Object} ScheduleRepository
 * @property {(weekStr: string, matrix: WeekMatrix) => void} save
 * @property {(weekStr: string) => WeekMatrix | null} load
 * @property {(weeks: string[]) => void} saveGeneratedWeeks
 * @property {() => string[]} loadGeneratedWeeks
 */

/**
 * Interface for Demand persistence.
 * @typedef {Object} DemandRepository
 * @property {(weekStr: string, demand: Demand) => void} saveDemandForWeek
 * @property {(weekStr: string) => Demand | null} loadDemandForWeek
 * @property {(demand: Demand) => void} saveDefaultDemand
 * @property {() => Demand | null} loadDefaultDemand
 */

/**
 * Interface for Settings / Patterns persistence.
 * @typedef {Object} SettingsRepository
 * @property {(weekStr: string) => void} saveBaseWeek
 * @property {() => string | null} loadBaseWeek
 * @property {(count: number) => void} saveWeeksCount
 * @property {() => number | null} loadWeeksCount
 * @property {(names: string[]) => void} saveNames
 * @property {() => string[] | null} loadNames
 * @property {(patterns: number[]) => void} savePatterns
 * @property {() => number[] | null} loadPatterns
 * @property {(shiftModes: string[]) => void} saveShiftModes
 * @property {() => string[] | null} loadShiftModes
 */

export {};
