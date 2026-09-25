import * as constants from "./constants.js";
const { DAYS, DAYS_OFF_PER_EMPLOYEE, MIN_EMPLOYEES, ROTATING_OFF_PATTERN } = constants;
export const Scheduler = {
  /**
   * Generate a schedule matrix.
   * Returns { success: boolean, matrix: Array, error: string }
   * matrix[empIndex][dayIndex] = 'M' | 'T' | 'L'
   */
  generate(employees, demand, options = {}) {
    const n = employees.length;
    if (n < MIN_EMPLOYEES) {
      return { success: false, error: `Se necesitan al menos ${MIN_EMPLOYEES} empleados.` };
    }

    // Build demand arrays: demandM[day], demandT[day]
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

    // Minimum staffing checks:
    // Rule: minimum 2 per shift on any day. Never less than 2 per shift.
    // Rule: Friday, Saturday, Sunday ALWAYS have at least 3 employees per shift.
    for (let d = 0; d < 7; d++) {
      if (demandM[d] < 2 || demandT[d] < 2) {
        return {
          success: false,
          error: `El personal mínimo por turno es de 2 empleados. Revisa los turnos del ${DAYS_FULL[d]} (Mañana: ${demandM[d]}, Tarde: ${demandT[d]}). Nunca puede haber menos de dos por turno.`,
        };
      }
      if (d >= 4 && (demandM[d] < 3 || demandT[d] < 3)) {
        return {
          success: false,
          error: `Los viernes, sábados y domingos siempre deben tener al menos 3 empleados por cada turno. Revisa el ${DAYS_FULL[d]} (Mañana: ${demandM[d]}, Tarde: ${demandT[d]}).`,
        };
      }
    }

    // Daily capacity check
    for (let d = 0; d < 7; d++) {
      if (demandM[d] + demandT[d] > n) {
        return {
          success: false,
          error: `La demanda del ${DAYS_FULL[d]} (${demandM[d] + demandT[d]} turnos) supera la cantidad total de empleados (${n}).`,
        };
      }
    }

    // Total capacity: each employee works (7 - DAYS_OFF_PER_EMPLOYEE) days
    const workDaysPerEmployee = 7 - DAYS_OFF_PER_EMPLOYEE;
    const totalCapacity = n * workDaysPerEmployee;

    if (totalDemand > totalCapacity) {
      return {
        success: false,
        error: `La demanda total (${totalDemand} turnos) supera la capacidad disponible (${totalCapacity} turnos con ${DAYS_OFF_PER_EMPLOYEE} libres por empleado).`,
      };
    }

    // Morning capacity check: Emp 1 needs 5 morning shifts, and each of the other n-1 employees needs at least 1 morning shift
    const minMorningsRequired = 5 + (n - 1);
    if (totalDemandM < minMorningsRequired) {
      return {
        success: false,
        error: `La demanda total de mañanas (${totalDemandM} turnos) es insuficiente. Se requieren al menos ${minMorningsRequired} turnos de mañana para que el Empleado 1 trabaje 5 mañanas y cada uno de los restantes ${n - 1} empleados tenga al menos 1 turno de mañana.`,
      };
    }

    // Initialize matrix with null (unset)
    const matrix = Array.from({ length: n }, () => Array(7).fill(null));
    const offCount = Array(7).fill(0); // how many employees are off per day

    // Determine pattern weeks for each employee
    const patternWeeks = (options && options.patternWeeks && options.patternWeeks.length >= n)
      ? options.patternWeeks
      : Array.from({ length: n }, (_, i) => DEFAULT_EMPLOYEE_PATTERNS[i] || ((i % 7) + 1));

    // ---- PHASE 1 & 2: Assign CONSECUTIVE days off (L) following the 7-week rotating pattern ----
    for (let emp = 0; emp < n; emp++) {
      const pWeek = patternWeeks[emp] || ((emp % 7) + 1);
      const patternItem = ROTATING_OFF_PATTERN[(pWeek - 1) % 7] || ROTATING_OFF_PATTERN[0];
      const [d1, d2] = patternItem.days;
      matrix[emp][d1] = 'L';
      matrix[emp][d2] = 'L';
      offCount[d1] += 1;
      offCount[d2] += 1;
    }

    // Emp 1 (index 0 - Clave): works strictly Morning on their 5 working days
    for (let d = 0; d < 7; d++) {
      if (matrix[0][d] === null) {
        matrix[0][d] = 'M';
      }
    }

    // Determine shift targets for each employee:
    // Emp 0 (Mar - Clave): strictly 5M / 0T
    // Emps 1..n-1: alternating 3M/2T and 2M/3T as provided in options.shiftTargets
    let shiftTargets = options && options.shiftTargets;
    if (!shiftTargets || shiftTargets.length < n) {
      shiftTargets = Array.from({ length: n }, (_, i) => {
        if (i === 0) return { m: 5, t: 0 };
        return (i % 2 === 1) ? { m: 3, t: 2 } : { m: 2, t: 3 };
      });
    }

    // ---- PHASE 3: Assign M/T for employees 1..n-1 with guaranteed shiftTargets ----
    const mCount = Array(n).fill(0);
    const tCount = Array(n).fill(0);

    for (let d = 0; d < 7; d++) {
      if (matrix[0][d] === 'M') mCount[0]++;
    }

    // Count remaining working days for an employee from day d to end of week
    const remWork = (emp, fromDay) => {
      let cnt = 0;
      for (let fd = fromDay; fd < 7; fd++) {
        if (matrix[emp][fd] === null) cnt++;
      }
      return cnt;
    };

    for (let d = 0; d < 7; d++) {
      let mAssigned = (matrix[0][d] === 'M') ? 1 : 0;
      let tAssigned = 0;

      const workingEmps = [];
      for (let emp = 1; emp < n; emp++) {
        if (matrix[emp][d] === null) workingEmps.push(emp);
      }

      // Prioritize assigning M:
      // Urgency = slack = remainingWorkingDays - (targetM - currentM)
      workingEmps.sort((a, b) => {
        const neededA = Math.max(0, shiftTargets[a].m - mCount[a]);
        const neededB = Math.max(0, shiftTargets[b].m - mCount[b]);
        if (neededA > 0 && neededB === 0) return -1;
        if (neededB > 0 && neededA === 0) return 1;
        if (neededA > 0 && neededB > 0) {
          const slackA = remWork(a, d) - neededA;
          const slackB = remWork(b, d) - neededB;
          if (slackA !== slackB) return slackA - slackB;
        }
        return (shiftTargets[b].m - mCount[b]) - (shiftTargets[a].m - mCount[a]);
      });

      for (const emp of workingEmps) {
        const needsM = mCount[emp] < shiftTargets[emp].m;
        const needsT = tCount[emp] < shiftTargets[emp].t;

        if (mAssigned < demandM[d] && tAssigned < demandT[d]) {
          if (needsM && !needsT) {
            matrix[emp][d] = 'M';
            mCount[emp]++;
            mAssigned++;
          } else if (needsT && !needsM) {
            matrix[emp][d] = 'T';
            tCount[emp]++;
            tAssigned++;
          } else {
            const defM = shiftTargets[emp].m - mCount[emp];
            const defT = shiftTargets[emp].t - tCount[emp];
            if (defM >= defT) {
              matrix[emp][d] = 'M';
              mCount[emp]++;
              mAssigned++;
            } else {
              matrix[emp][d] = 'T';
              tCount[emp]++;
              tAssigned++;
            }
          }
        } else if (mAssigned < demandM[d]) {
          matrix[emp][d] = 'M';
          mCount[emp]++;
          mAssigned++;
        } else if (tAssigned < demandT[d]) {
          matrix[emp][d] = 'T';
          tCount[emp]++;
          tAssigned++;
        } else {
          matrix[emp][d] = 'T';
          tCount[emp]++;
          tAssigned++;
        }
      }
    }

    // Repair pass: Strictly guarantee every employee reaches shiftTargets[emp].m
    for (let pass = 0; pass < 10; pass++) {
      let improved = false;
      for (let e1 = 1; e1 < n; e1++) {
        if (mCount[e1] < shiftTargets[e1].m) {
          for (let d = 0; d < 7; d++) {
            if (matrix[e1][d] === 'T') {
              for (let e2 = 1; e2 < n; e2++) {
                if (e1 !== e2 && matrix[e2][d] === 'M' && mCount[e2] > shiftTargets[e2].m) {
                  matrix[e1][d] = 'M';
                  matrix[e2][d] = 'T';
                  mCount[e1]++;
                  tCount[e1]--;
                  mCount[e2]--;
                  tCount[e2]++;
                  improved = true;
                  break;
                }
              }
              if (mCount[e1] === shiftTargets[e1].m) break;
            }
          }
        }
      }
      if (!improved) break;
    }

    // ---- PHASE 4: Ergonomic optimization (avoid T -> M transitions) ----
    // Uses reciprocal swaps preserving exact shiftTargets and daily demand
    this._fixErgonomics(matrix, n);

    // Verify no nulls remain
    for (let emp = 0; emp < n; emp++) {
      for (let d = 0; d < 7; d++) {
        if (matrix[emp][d] === null) {
          matrix[emp][d] = 'L';
        }
      }
    }

    return { success: true, matrix, error: null };
  },

  _fixErgonomics(matrix, n) {
    const countViolations = (emp) => {
      let v = 0;
      for (let d = 0; d < 6; d++) {
        if (matrix[emp][d] === 'T' && matrix[emp][d + 1] === 'M') {
          v++;
        }
      }
      return v;
    };

    // Emp 1 (index 0) is restricted to morning shifts only; eligible employees are index 1 to n-1
    const eligibleStart = 1;

    for (let pass = 0; pass < 5; pass++) {
      let improved = false;
      for (let emp1 = eligibleStart; emp1 < n; emp1++) {
        for (let d = 0; d < 6; d++) {
          if (matrix[emp1][d] === 'T' && matrix[emp1][d + 1] === 'M') {
            // Reciprocal 2-day swap: emp1 (T at d, M at d+1), emp2 (M at d, T at d+1)
            // Preserves exact mCount and tCount for BOTH employees without altering daily demands!
            for (let emp2 = eligibleStart; emp2 < n; emp2++) {
              if (emp1 === emp2) continue;
              if (matrix[emp2][d] === 'M' && matrix[emp2][d + 1] === 'T') {
                const before = countViolations(emp1) + countViolations(emp2);
                matrix[emp1][d] = 'M';
                matrix[emp1][d + 1] = 'T';
                matrix[emp2][d] = 'T';
                matrix[emp2][d + 1] = 'M';
                const after = countViolations(emp1) + countViolations(emp2);

                if (after < before) {
                  improved = true;
                  break;
                } else {
                  // Revert swap
                  matrix[emp1][d] = 'T';
                  matrix[emp1][d + 1] = 'M';
                  matrix[emp2][d] = 'M';
                  matrix[emp2][d + 1] = 'T';
                }
              }
            }

            if (improved) break;
          }
          if (improved) break;
        }
        if (improved) break;
      }
      if (!improved) break;
    }
  },

  _solveConsecutiveOffCounts(numEmpsToAssign, targetOff) {
    let bestCounts = null;
    let bestScore = Infinity;

    function score(counts) {
      let s = 0;
      for (let d = 0; d < 7; d++) {
        const actual = counts[d] + counts[(d + 6) % 7];
        const diff = actual - targetOff[d];
        if (diff > 0) s += diff * 1000 + diff * diff * 100;
        else s += Math.abs(diff) * 10;
      }
      return s;
    }

    const counts = Array(7).fill(0);

    function search(idx, currentSum) {
      if (idx === 6) {
        counts[6] = numEmpsToAssign - currentSum;
        const sc = score(counts);
        if (sc < bestScore) {
          bestScore = sc;
          bestCounts = [...counts];
        }
        return;
      }

      const remaining = numEmpsToAssign - currentSum;
      const maxVal = Math.min(remaining, (targetOff[idx] || 0) + 3);
      for (let v = 0; v <= maxVal; v++) {
        counts[idx] = v;
        search(idx + 1, currentSum + v);
        if (bestScore === 0) return;
      }
    }

    search(0, 0);

    if (!bestCounts || bestScore > 500) {
      function searchBroader(idx, currentSum) {
        if (idx === 6) {
          counts[6] = numEmpsToAssign - currentSum;
          const sc = score(counts);
          if (sc < bestScore) {
            bestScore = sc;
            bestCounts = [...counts];
          }
          return;
        }
        const remaining = numEmpsToAssign - currentSum;
        for (let v = 0; v <= remaining; v++) {
          counts[idx] = v;
          searchBroader(idx + 1, currentSum + v);
          if (bestScore === 0) return;
        }
      }
      searchBroader(0, 0);
    }

    if (!bestCounts) {
      bestCounts = Array(7).fill(0);
      for (let i = 0; i < numEmpsToAssign; i++) {
        bestCounts[i % 7]++;
      }
    }

    return bestCounts;
  },
};

/* ============================================
   MODULE: Renderer
   ============================================ */