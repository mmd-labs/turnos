import { escapeHtml } from '../../../core/html.js';

/**
 * Renders an AuditReport DTO into the DOM elements.
 * Separated from calculation to respect SRP.
 *
 * @param {import('../domain/audit-report.entity.js').AuditReport} report
 */
export function renderAuditView(report) {
  if (!report) return;

  const demandSummary = document.getElementById('audit-demand-summary');
  const offdaysSummary = document.getElementById('audit-offdays-summary');
  const ergonomicsSummary = document.getElementById('audit-ergonomics-summary');
  const globalBadge = document.getElementById('audit-global-badge');
  const equityContainer = document.getElementById('equity-table-container');

  if (!demandSummary || !offdaysSummary || !ergonomicsSummary || !globalBadge) return;

  // 1. Demand coverage tags
  demandSummary.innerHTML = '';
  report.demandDays.forEach(day => {
    const tag = document.createElement('span');
    const statusClass = day.ok ? 'ok' : 'err';
    tag.className = `audit-tag audit-tag--${statusClass}`;
    tag.textContent = day.text;
    tag.title = day.title;
    demandSummary.appendChild(tag);
  });

  // 2. Offdays & Morning tags
  offdaysSummary.innerHTML = '';
  report.empStats.forEach(stat => {
    const tag = document.createElement('span');
    tag.className = `audit-tag audit-tag--${stat.statusClass}`;
    tag.textContent = stat.tagText;
    offdaysSummary.appendChild(tag);
  });

  // 3. Ergonomics tags
  ergonomicsSummary.innerHTML = '';
  if (report.fatigueList.length === 0) {
    const tag = document.createElement('span');
    tag.className = 'audit-tag audit-tag--ok';
    tag.textContent = 'Descanso óptimo: 0 transiciones T → M ✅';
    ergonomicsSummary.appendChild(tag);
  } else {
    report.fatigueList.forEach(item => {
      const tag = document.createElement('span');
      tag.className = 'audit-tag audit-tag--warn';
      tag.textContent = item;
      tag.title = 'Transición de turno de tarde seguido inmediatamente de mañana al día siguiente';
      ergonomicsSummary.appendChild(tag);
    });
  }

  // 4. Global Badge
  globalBadge.className = `badge ${report.globalBadgeClass}`;
  globalBadge.textContent = report.globalBadgeText;

  // 5. Equity Table
  if (equityContainer) {
    let html = '<table class="equity-table"><thead><tr><th>Empleado</th><th>Patrón Rotativo</th><th>Alternancia Turnos</th><th>Turnos Mañana</th><th>Turnos Tarde</th><th>Días Libres</th><th>Horas Semanales</th></tr></thead><tbody>';
    report.empStats.forEach(stat => {
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
        ? `${escapeHtml(stat.name)} <span style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">(Clave)</span>`
        : escapeHtml(stat.name);

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
