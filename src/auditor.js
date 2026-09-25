import { Renderer } from './renderer.js';
import { ROTATING_OFF_PATTERN } from './constants.js';

export const Auditor = {
  run(matrix, employees, demand, weekStart) {
    if (!matrix || !employees || !demand) return;

    const n = employees.length;
    const dayDates = Renderer._getDayDates(weekStart);

    const demandSummary = document.getElementById('audit-demand-summary');
    const offdaysSummary = document.getElementById('audit-offdays-summary');
    const ergonomicsSummary = document.getElementById('audit-ergonomics-summary');
    const globalBadge = document.getElementById('audit-global-badge');
    const equityContainer = document.getElementById('equity-table-container');

    if (!demandSummary || !offdaysSummary || !ergonomicsSummary || !globalBadge) return;

    let totalDemandMismatches = 0;
    let totalOffdayMismatches = 0;
    let totalConsecutiveMismatches = 0;
    let totalFatigueIssues = 0;
    let totalMorningIssues = 0;

    // 1. Demand coverage check
    demandSummary.innerHTML = '';
    for (let d = 0; d < 7; d++) {
      let countM = 0;
      let countT = 0;
      for (let e = 0; e < n; e++) {
        if (matrix[e] && matrix[e][d] === 'M') countM++;
        else if (matrix[e] && matrix[e][d] === 'T') countT++;
      }
      const reqM = (demand.morning && demand.morning[d]) || 0;
      const reqT = (demand.afternoon && demand.afternoon[d]) || 0;

      const mOk = countM === reqM;
      const tOk = countT === reqT;
      const minStaffOk = countM >= 2 && countT >= 2;
      const weekendStaffOk = (d < 4) || (countM >= 3 && countT >= 3);
      if (!mOk || !tOk || !minStaffOk || !weekendStaffOk) totalDemandMismatches++;

      const tag = document.createElement('span');
      let statusClass = (mOk && tOk && minStaffOk && weekendStaffOk) ? 'ok' : 'err';
      tag.className = `audit-tag audit-tag--${statusClass}`;
      let staffNotice = '';
      if (!minStaffOk) staffNotice = ' ⚠️ <2 personal';
      else if (!weekendStaffOk) staffNotice = ' ⚠️ Fin de semana <3';
      tag.textContent = `${dayDates[d].short}: M ${countM}/${reqM} · T ${countT}/${reqT}${staffNotice}`;
      tag.title = `${dayDates[d].name}: Mañana ${countM} asignados de ${reqM} requeridos; Tarde ${countT} asignados de ${reqT} requeridos`;
      demandSummary.appendChild(tag);
    }

    // 2. Offdays & Morning Rules check
    offdaysSummary.innerHTML = '';
    const empStats = [];
    for (let e = 0; e < n; e++) {
      let countL = 0;
      let countM = 0;
      let countT = 0;
      const offDays = [];
      for (let d = 0; d < 7; d++) {
        const s = matrix[e] ? matrix[e][d] : 'L';
        if (s === 'L') {
          countL++;
          offDays.push(d);
        } else if (s === 'M') countM++;
        else if (s === 'T') countT++;
      }
      const isKey = (e === 0);
      const is2Off = countL === 2;
      const isConsecutive = is2Off && ((offDays[1] - offDays[0] === 1) || (offDays[0] === 0 && offDays[1] === 6));

      const pWeek = Renderer.getEffectivePatternWeek(e, weekStart);
      const pItem = ROTATING_OFF_PATTERN[pWeek - 1] || ROTATING_OFF_PATTERN[0];
      const matchesPattern = is2Off && isConsecutive && (offDays[0] === pItem.days[0] && offDays[1] === pItem.days[1]);

      const shiftMode = Renderer.getEffectiveShiftMode(e, weekStart);
      const targetM = (e === 0 || shiftMode === '5M0T') ? 5 : (shiftMode === '3M2T' ? 3 : 2);
      const targetT = (e === 0 || shiftMode === '5M0T') ? 0 : (shiftMode === '3M2T' ? 2 : 3);
      const matchesShiftTarget = (countM === targetM && countT === targetT);

      empStats.push({
        name: employees[e],
        m: countM,
        t: countT,
        l: countL,
        hours: (countM + countT) * 8,
        isKey,
        isConsecutive,
        pWeek,
        pLabel: pItem.label,
        matchesPattern,
        shiftMode,
        targetM,
        targetT,
        matchesShiftTarget
      });

      if (!is2Off) totalOffdayMismatches++;
      if (is2Off && !isConsecutive) totalConsecutiveMismatches++;

      // Rule checks: Emp 1 must only work morning; everyone needs >= 1 morning
      if (isKey && countT > 0) totalMorningIssues++;
      if (countM === 0) totalMorningIssues++;

      const tag = document.createElement('span');
      let statusClass = (is2Off && isConsecutive && matchesPattern) ? 'ok' : (!is2Off ? (countL < 2 ? 'err' : 'warn') : 'warn');
      tag.className = `audit-tag audit-tag--${statusClass}`;
      let consecNotice = '';
      if (is2Off && !isConsecutive) {
        consecNotice = ' ⚠️ No seguidos';
      } else if (is2Off && !matchesPattern) {
        consecNotice = ' ℹ️ Modificado';
      }
      tag.textContent = `${employees[e]}: ${countL}/2 Libres [Sem.${pWeek}]${consecNotice}`;
      offdaysSummary.appendChild(tag);
    }

    // 3. Ergonomics check (T -> M transitions)
    ergonomicsSummary.innerHTML = '';
    const fatigueList = [];
    for (let e = 0; e < n; e++) {
      for (let d = 0; d < 6; d++) {
        if (matrix[e] && matrix[e][d] === 'T' && matrix[e][d + 1] === 'M') {
          fatigueList.push(`${employees[e]}: ${dayDates[d].short} T → ${dayDates[d + 1].short} M`);
          totalFatigueIssues++;
        }
      }
    }

    if (fatigueList.length === 0) {
      const tag = document.createElement('span');
      tag.className = 'audit-tag audit-tag--ok';
      tag.textContent = 'Descanso óptimo: 0 transiciones T → M ✅';
      ergonomicsSummary.appendChild(tag);
    } else {
      fatigueList.forEach(item => {
        const tag = document.createElement('span');
        tag.className = 'audit-tag audit-tag--warn';
        tag.textContent = item;
        tag.title = 'Transición de turno de tarde seguido inmediatamente de mañana al día siguiente';
        ergonomicsSummary.appendChild(tag);
      });
    }

    // 4. Global Badge
    if (totalDemandMismatches === 0 && totalOffdayMismatches === 0 && totalConsecutiveMismatches === 0 && totalFatigueIssues === 0 && totalMorningIssues === 0) {
      globalBadge.className = 'badge badge--success';
      globalBadge.textContent = 'Balance Óptimo ✅';
    } else if (totalDemandMismatches > 0 || totalOffdayMismatches > 0 || totalConsecutiveMismatches > 0 || totalMorningIssues > 0) {
      globalBadge.className = 'badge badge--danger';
      const issues = [];
      if (totalDemandMismatches > 0) issues.push('Demanda');
      if (totalOffdayMismatches > 0) issues.push('Días libres');
      if (totalConsecutiveMismatches > 0) issues.push('Libres no seguidos');
      if (totalMorningIssues > 0) issues.push('Regla de mañanas');
      globalBadge.textContent = `Ajuste requerido: ${issues.join(' · ')} ⚠️`;
    } else {
      globalBadge.className = 'badge badge--warning';
      globalBadge.textContent = `${totalFatigueIssues} aviso(s) ergonómico(s) T → M ⚠️`;
    }

    // 5. Equity Table
    if (equityContainer) {
      let html = '<table class="equity-table"><thead><tr><th>Empleado</th><th>Patrón Rotativo</th><th>Alternancia Turnos</th><th>Turnos Mañana</th><th>Turnos Tarde</th><th>Días Libres</th><th>Horas Semanales</th></tr></thead><tbody>';
      empStats.forEach(stat => {
        const mNotice = stat.m === 0 ? ' <span title="Se requiere al menos 1 turno de mañana" style="color:var(--color-danger); font-size:0.75rem;">⚠️ Mín. 1 M</span>' : '';
        const tNotice = (stat.isKey && stat.t > 0) ? ' <span title="El empleado clave debe ser solo mañana" style="color:var(--color-danger); font-size:0.75rem;">⚠️ Solo M</span>' : '';
        const consecNotice = (!stat.isConsecutive && stat.l === 2) ? ' <span title="Los 2 días libres deben ser seguidos" style="color:var(--color-warning); font-size:0.75rem;">⚠️ No seguidos</span>' : '';
        const patternBadge = stat.matchesPattern
          ? `<span class="badge badge--success" style="font-size:0.75rem;">Sem. ${stat.pWeek} (${stat.pLabel})</span>`
          : `<span class="badge badge--warning" style="font-size:0.75rem;" title="Días libres modificados respecto al patrón de esta semana">Sem. ${stat.pWeek} (Modificado)</span>`;
        const shiftBadge = stat.matchesShiftTarget
          ? `<span class="badge badge--success" style="font-size:0.75rem;">${stat.targetM}M / ${stat.targetT}T ✅</span>`
          : `<span class="badge badge--warning" style="font-size:0.75rem;" title="Objetivo semana: ${stat.targetM}M / ${stat.targetT}T">${stat.targetM}M / ${stat.targetT}T ⚠️</span>`;
        const nameText = stat.isKey
          ? `${Renderer._escapeHtml(stat.name)} <span style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">(Clave)</span>`
          : Renderer._escapeHtml(stat.name);
        html += `<tr>
          <td style="font-weight:600; text-align:left;">${nameText}</td>
          <td>${patternBadge}</td>
          <td>${shiftBadge}</td>
          <td><span style="color:var(--color-morning); font-weight:700;">${stat.m}</span>${mNotice}</td>
          <td><span style="color:var(--color-afternoon); font-weight:700;">${stat.t}</span>${tNotice}</td>
          <td><span style="color:var(--color-free); font-weight:700;">${stat.l}</span>${consecNotice}</td>
          <td><strong>${stat.hours} h</strong></td>
        </tr>`;
      });
      html += '</tbody></table>';
      equityContainer.innerHTML = html;
    }
  }
};
