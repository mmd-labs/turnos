import {
  DAYS_FULL,
  MIN_EMPLOYEES,
  DAYS_OFF_PER_EMPLOYEE
} from '../../../../core/constants/domain.js';

/**
 * Returns the minimum required employees for a single shift on the specified day.
 * Friday (4), Saturday (5), and Sunday (6) require at least 3.
 * Monday to Thursday require at least 2.
 * @param {number} dayIndex (0 = Lunes, ..., 6 = Domingo)
 * @returns {number}
 */
export function getMinStaffForDay(dayIndex) {
  return dayIndex >= 4 ? 3 : 2;
}

/**
 * Clamps a proposed demand value for a specific day to satisfy the daily minimum.
 * @param {number} dayIndex
 * @param {number} value
 * @returns {number}
 */
export function clampDemandValue(dayIndex, value) {
  const min = getMinStaffForDay(dayIndex);
  return Math.max(min, Number.isFinite(value) ? Math.floor(value) : min);
}

/**
 * Validates a weekly demand configuration against all business rules.
 * Pure domain rule: zero DOM dependencies.
 *
 * @param {Object} demand - { morning: number[], afternoon: number[] }
 * @param {number} employeeCount - Total count of employees (must be >= MIN_EMPLOYEES)
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateDemand(demand, employeeCount) {
  const n = employeeCount;
  if (!n || n < MIN_EMPLOYEES) {
    return {
      valid: false,
      error: `Se necesitan al menos ${MIN_EMPLOYEES} empleados.`,
    };
  }

  if (!demand || !Array.isArray(demand.morning) || !Array.isArray(demand.afternoon)) {
    return {
      valid: false,
      error: 'La configuración de demanda debe incluir los turnos de mañana y tarde.',
    };
  }

  const demandM = [];
  const demandT = [];
  let totalDemand = 0;
  let totalDemandM = 0;

  for (let d = 0; d < 7; d++) {
    demandM[d] = demand.morning[d] || 0;
    demandT[d] = demand.afternoon[d] || 0;
    totalDemand += demandM[d] + demandT[d];
    totalDemandM += demandM[d];
  }

  // 1. Minimum staffing checks per shift
  for (let d = 0; d < 7; d++) {
    if (demandM[d] < 2 || demandT[d] < 2) {
      return {
        valid: false,
        error: `El personal mínimo por turno es de 2 empleados. Revisa los turnos del ${DAYS_FULL[d]} (Mañana: ${demandM[d]}, Tarde: ${demandT[d]}). Nunca puede haber menos de dos por turno.`,
      };
    }
    if (d >= 4 && (demandM[d] < 3 || demandT[d] < 3)) {
      return {
        valid: false,
        error: `Los viernes, sábados y domingos siempre deben tener al menos 3 empleados por cada turno. Revisa el ${DAYS_FULL[d]} (Mañana: ${demandM[d]}, Tarde: ${demandT[d]}).`,
      };
    }
  }

  // 2. Daily capacity check: shifts cannot exceed total headcount
  for (let d = 0; d < 7; d++) {
    if (demandM[d] + demandT[d] > n) {
      return {
        valid: false,
        error: `La demanda del ${DAYS_FULL[d]} (${demandM[d] + demandT[d]} turnos) supera la cantidad total de empleados (${n}).`,
      };
    }
  }

  // 3. Total capacity check: each employee works exactly (7 - DAYS_OFF_PER_EMPLOYEE) days
  const workDaysPerEmployee = 7 - DAYS_OFF_PER_EMPLOYEE;
  const totalCapacity = n * workDaysPerEmployee;

  if (totalDemand !== totalCapacity) {
    return {
      valid: false,
      error: `La demanda total (${totalDemand} turnos) debe ser exactamente igual a la capacidad de la plantilla (${totalCapacity} turnos).`,
    };
  }

  // 4. Morning capacity check: Emp 1 needs 5 mornings, others need >= 1 morning
  const minMorningsRequired = 5 + (n - 1);
  if (totalDemandM < minMorningsRequired) {
    return {
      valid: false,
      error: `La demanda total de mañanas (${totalDemandM} turnos) es insuficiente. Se requieren al menos ${minMorningsRequired} turnos de mañana para que el Empleado 1 trabaje 5 mañanas y cada uno de los restantes ${n - 1} empleados tenga al menos 1 turno de mañana.`,
    };
  }

  // 5. Feasibility check via circular system / consecutive pair decomposition
  const off = [];
  for (let d = 0; d < 7; d++) {
    off[d] = n - (demandM[d] + demandT[d]);
  }

  const c = Array(7).fill(0);
  c[0] = (off[0] + off[1] - off[2] + off[3] - off[4] + off[5] - off[6]) / 2;
  for (let k = 1; k < 7; k++) {
    c[k] = off[k] - c[k - 1];
  }

  const invalidDayIndex = c.findIndex(val => !Number.isInteger(val) || val < 0);
  if (invalidDayIndex !== -1) {
    return {
      valid: false,
      error: `La distribución de la demanda no puede cubrirse con pares de 2 días libres consecutivos (par con inicio en ${DAYS_FULL[invalidDayIndex]} inválido). Ajusta los totales diarios.`,
    };
  }

  return { valid: true, error: null };
}
