import { validateDemand } from './rules/demand.js';
import {
  DAYS_FULL,
  ROTATING_OFF_PATTERN,
  DEFAULT_EMPLOYEE_PATTERNS
} from '../../../core/constants/domain.js';

export const Scheduler = {
  /**
   * Generates a weekly schedule matrix adhering to ergonomics, consecutive rest and shift targets.
   * Returns { success: boolean, matrix: Array<Array<'M'|'T'|'L'>>, error: string | null }
   * @param {string[]} employees
   * @param {import('./entities.js').Demand} demand
   * @param {Object} [options]
   * @param {number[]} [options.patternWeeks]
   * @param {import('./entities.js').ShiftTarget[]} [options.shiftTargets]
   * @returns {import('./entities.js').Result<import('./entities.js').WeekMatrix>}
   */
  generate(employees, demand, options = {}) {
    const n = employees.length;
    const validation = validateDemand(demand, n);
    if (!validation.valid) {
      return { success: false, error: validation.error, matrix: null };
    }

    const demandM = demand.morning;
    const demandT = demand.afternoon;

    // Initialize matrix with null (unset)
    const matrix = Array.from({ length: n }, () => Array(7).fill(null));
    const offCount = Array(7).fill(0);

    // Determine pattern weeks for each employee
    const patternWeeks = (options && options.patternWeeks && options.patternWeeks.length >= n)
      ? options.patternWeeks
      : Array.from({ length: n }, (_, i) => DEFAULT_EMPLOYEE_PATTERNS[i] || ((i % 7) + 1));

    // off[d] = how many employees must take off on day d
    const off = [];
    for (let d = 0; d < 7; d++) {
      off[d] = n - ((demandM[d] || 0) + (demandT[d] || 0));
    }

    // Solve circular system: c[k-1] + c[k] = off[k] (indices mod 7)
    // where c[k] is the count of employees assigned ROTATING_OFF_PATTERN[k] (starting on day k)
    const c = Array(7).fill(0);
    c[0] = (off[0] + off[1] - off[2] + off[3] - off[4] + off[5] - off[6]) / 2;
    for (let k = 1; k < 7; k++) {
      c[k] = off[k] - c[k - 1];
    }

    // ---- PHASE 1 & 2: Assign CONSECUTIVE days off (L) by preference ----
    // Preferences: pref[e] = (patternWeeks[e] - 1) % 7
    const assignedPair = Array(n).fill(-1);
    const quotas = [...c];

    // Pass 1: Assign preferred pair if quota available
    for (let emp = 0; emp < n; emp++) {
      const pWeek = patternWeeks[emp] || ((emp % 7) + 1);
      const pref = ((pWeek - 1) % 7 + 7) % 7;
      if (quotas[pref] > 0) {
        assignedPair[emp] = pref;
        quotas[pref] -= 1;
      }
    }

    // Pass 2: Assign remaining employees to available quotas minimizing circular distance to preference
    for (let emp = 0; emp < n; emp++) {
      if (assignedPair[emp] !== -1) continue;
      const pWeek = patternWeeks[emp] || ((emp % 7) + 1);
      const pref = ((pWeek - 1) % 7 + 7) % 7;

      let bestK = -1;
      let minDistance = Infinity;

      for (let k = 0; k < 7; k++) {
        if (quotas[k] > 0) {
          const directDist = Math.abs(k - pref);
          const circDist = Math.min(directDist, 7 - directDist);
          if (circDist < minDistance) {
            minDistance = circDist;
            bestK = k;
          }
        }
      }

      if (bestK !== -1) {
        assignedPair[emp] = bestK;
        quotas[bestK] -= 1;
      }
    }

    // Apply off days to matrix
    for (let emp = 0; emp < n; emp++) {
      const k = assignedPair[emp];
      const patternItem = ROTATING_OFF_PATTERN[k] || ROTATING_OFF_PATTERN[0];
      const [d1, d2] = patternItem.days;
      matrix[emp][d1] = 'L';
      matrix[emp][d2] = 'L';
      offCount[d1] += 1;
      offCount[d2] += 1;
    }

    // Internal assertion: offCount must exactly match required off days
    for (let d = 0; d < 7; d++) {
      const expectedOff = n - (demandM[d] + demandT[d]);
      if (offCount[d] !== expectedOff) {
        return {
          success: false,
          error: `Error interno de asignación de libres en ${DAYS_FULL[d]}: esperado ${expectedOff}, obtenido ${offCount[d]}.`,
          matrix: null,
        };
      }
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
        if (i === 0) return { m: 5, t: 0, mode: '5M0T' };
        return (i % 2 === 1) ? { m: 3, t: 2, mode: '3M2T' } : { m: 2, t: 3, mode: '2M3T' };
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

    const eligibleStart = 1;

    for (let pass = 0; pass < 20; pass++) {
      let improved = false;
      for (let emp1 = eligibleStart; emp1 < n; emp1++) {
        for (let d1 = 0; d1 < 7; d1++) {
          for (let d2 = d1 + 1; d2 < 7; d2++) {
            if (matrix[emp1][d1] !== matrix[emp1][d2] && matrix[emp1][d1] !== 'L' && matrix[emp1][d2] !== 'L') {
              for (let emp2 = eligibleStart; emp2 < n; emp2++) {
                if (emp1 === emp2) continue;
                if (matrix[emp2][d1] === matrix[emp1][d2] && matrix[emp2][d2] === matrix[emp1][d1]) {
                  const before = countViolations(emp1) + countViolations(emp2);

                  // Swap
                  const temp1 = matrix[emp1][d1];
                  matrix[emp1][d1] = matrix[emp1][d2];
                  matrix[emp1][d2] = temp1;

                  const temp2 = matrix[emp2][d1];
                  matrix[emp2][d1] = matrix[emp2][d2];
                  matrix[emp2][d2] = temp2;

                  const after = countViolations(emp1) + countViolations(emp2);

                  if (after < before) {
                    improved = true;
                    break;
                  } else {
                    // Revert
                    matrix[emp1][d2] = matrix[emp1][d1];
                    matrix[emp1][d1] = temp1;

                    matrix[emp2][d2] = matrix[emp2][d1];
                    matrix[emp2][d1] = temp2;
                  }
                }
              }
            }
            if (improved) break;
          }
          if (improved) break;
        }
      }
      if (!improved) break;
    }
  },
};
