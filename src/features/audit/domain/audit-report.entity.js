/**
 * @typedef {Object} DemandDayAudit
 * @property {number} dayIndex
 * @property {string} short
 * @property {string} name
 * @property {number} countM
 * @property {number} reqM
 * @property {number} countT
 * @property {number} reqT
 * @property {boolean} mOk
 * @property {boolean} tOk
 * @property {boolean} minStaffOk
 * @property {boolean} weekendStaffOk
 * @property {boolean} ok
 * @property {string} text
 * @property {string} title
 * @property {string} staffNotice
 */

/**
 * @typedef {Object} EmpAuditStat
 * @property {string} name
 * @property {number} m
 * @property {number} t
 * @property {number} l
 * @property {number} hours
 * @property {boolean} isKey
 * @property {boolean} isConsecutive
 * @property {number} pWeek
 * @property {string} pLabel
 * @property {boolean} matchesPattern
 * @property {string} shiftMode
 * @property {number} targetM
 * @property {number} targetT
 * @property {boolean} matchesShiftTarget
 * @property {'ok' | 'warn' | 'err'} statusClass
 * @property {string} tagText
 * @property {string} consecNotice
 */

/**
 * @typedef {Object} AuditReport
 * @property {DemandDayAudit[]} demandDays
 * @property {EmpAuditStat[]} empStats
 * @property {string[]} fatigueList
 * @property {number} totalDemandMismatches
 * @property {number} totalOffdayMismatches
 * @property {number} totalConsecutiveMismatches
 * @property {number} totalFatigueIssues
 * @property {number} totalMorningIssues
 * @property {'badge--success' | 'badge--warning' | 'badge--danger'} globalBadgeClass
 * @property {string} globalBadgeText
 */

export {};
