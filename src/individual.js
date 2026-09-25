import { Renderer } from './renderer.js';
import { ROTATING_OFF_PATTERN } from './constants.js';
export const IndividualView = {
  init() {
    this.modal = document.getElementById('individual-modal');
    this.select = document.getElementById('individual-emp-select');
    this.cardsContainer = document.getElementById('individual-schedule-cards');
    this.closeBtn = document.getElementById('modal-close');
    this.copyBtn = document.getElementById('btn-copy-individual');

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
    }
    if (this.select) {
      this.select.addEventListener('change', () => this.renderSelected());
    }
    if (this.copyBtn) {
      this.copyBtn.addEventListener('click', () => this.copySchedule());
    }
  },

  open(matrix, employees, weekStart) {
    this.matrix = matrix;
    this.employees = employees;
    this.weekStart = weekStart;

    if (!this.select) return;
    this.select.innerHTML = '';
    employees.forEach((name, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = name;
      this.select.appendChild(opt);
    });

    this.renderSelected();
    this.modal.hidden = false;
  },

  close() {
    if (this.modal) this.modal.hidden = true;
  },

  renderSelected() {
    if (!this.select || !this.cardsContainer) return;
    const empIdx = parseInt(this.select.value) || 0;
    const dayDates = Renderer._getDayDates(this.weekStart);
    const shiftLabels = { M: 'Mañana', T: 'Tarde', L: 'Libre' };
    const shiftClasses = { M: 'morning', T: 'afternoon', L: 'free' };

    this.cardsContainer.innerHTML = '';
    dayDates.forEach((d, dayIdx) => {
      const shiftKey = (this.matrix && this.matrix[empIdx]) ? this.matrix[empIdx][dayIdx] : 'L';
      const card = document.createElement('div');
      card.className = 'indiv-day-card';
      card.innerHTML = `
        <div class="indiv-day-name">${d.name}</div>
        <div class="indiv-day-date">${d.date}</div>
        <span class="indiv-shift-badge indiv-shift-badge--${shiftClasses[shiftKey] || 'free'}">
          ${shiftLabels[shiftKey] || 'Libre'}
        </span>
      `;
      this.cardsContainer.appendChild(card);
    });
  },

  async copySchedule() {
    const empIdx = parseInt(this.select.value) || 0;
    const empName = this.employees[empIdx];
    const dayDates = Renderer._getDayDates(this.weekStart);
    const shiftEmojis = { M: '☀️ Mañana', T: '🌅 Tarde', L: '🏖️ Libre' };

    const pWeek = Renderer.getEffectivePatternWeek(empIdx, this.weekStart);
    const pItem = ROTATING_OFF_PATTERN[pWeek - 1] || ROTATING_OFF_PATTERN[0];
    const shiftMode = Renderer.getEffectiveShiftMode(empIdx, this.weekStart);
    const shiftModeLabel = (empIdx === 0) ? 'Solo Mañanas (5M)' : (shiftMode === '3M2T' ? '3 Mañanas + 2 Tardes' : '2 Mañanas + 3 Tardes');

    let msg = `👤 *Horario Semanal - ${empName}*\n`;
    msg += `🗓️ Semana del ${Renderer._formatDateLong(this.weekStart)}\n`;
    msg += `🔄 *Patrón rotativo:* Semana ${pWeek} (${pItem.label})\n`;
    msg += `⏱️ *Turnos:* ${shiftModeLabel}\n\n`;

    dayDates.forEach((d, dayIdx) => {
      const shiftKey = (this.matrix && this.matrix[empIdx]) ? this.matrix[empIdx][dayIdx] : 'L';
      msg += `• *${d.name} (${d.date})*: ${shiftEmojis[shiftKey] || 'Libre'}\n`;
    });

    try {
      await navigator.clipboard.writeText(msg.trim());
      Toast.show(`Horario de ${empName} copiado para WhatsApp.`, 'success');
    } catch {
      Toast.show('No se pudo copiar automáticamente.', 'error');
    }
  }
};

/* ============================================
   MODULE: HelpModal (Manual & Guide)
   ============================================ */