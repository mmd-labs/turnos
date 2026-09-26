/**
 * @typedef {Object} AppConfig
 * @property {string} [weekStart]
 * @property {number} [employeeCount]
 * @property {import('../../scheduling/domain/entities.js').Demand} [demand]
 * @property {string[]} [shiftModes]
 */

/**
 * Repository interface for Settings, Employee Names, Demands and Patterns.
 * @typedef {Object} SettingsRepository
 * @property {(names: string[]) => void} saveNames
 * @property {() => string[] | null} loadNames
 * @property {(config: AppConfig) => void} saveConfig
 * @property {() => AppConfig | null} loadConfig
 * @property {(demand: import('../../scheduling/domain/entities.js').Demand) => void} saveDemand
 * @property {() => import('../../scheduling/domain/entities.js').Demand | null} loadDemand
 * @property {(weekStr: string, demand: import('../../scheduling/domain/entities.js').Demand) => void} saveDemandForWeek
 * @property {(weekStr: string) => import('../../scheduling/domain/entities.js').Demand | null} loadDemandForWeek
 * @property {(patterns: number[]) => void} savePatterns
 * @property {() => number[] | null} loadPatterns
 * @property {(weekStr: string) => void} saveBaseWeek
 * @property {() => string | null} loadBaseWeek
 * @property {(count: number) => void} saveWeeksCount
 * @property {() => number | null} loadWeeksCount
 */

export {};
