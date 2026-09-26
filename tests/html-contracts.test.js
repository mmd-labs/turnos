import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Contrato HTML: Presencia de IDs críticos requeridos por los controladores', () => {
  const htmlPath = path.resolve(__dirname, '../index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  // Extraer todos los IDs definidos en index.html
  const idRegex = /id="([^"]+)"/g;
  const foundIds = new Set();
  let match;
  while ((match = idRegex.exec(htmlContent)) !== null) {
    foundIds.add(match[1]);
  }

  const expectedIds = [
    // App shell
    'app-wrapper',
    'help-toggle',
    'theme-toggle',
    'theme-icon',
    // Configuración semanal y empleados
    'config-panel',
    'btn-prev-week',
    'week-start',
    'btn-next-week',
    'weeks-count',
    'employee-count',
    'employee-names',
    // Configuración de demanda
    'demand-config-block',
    'demand-actions',
    'btn-copy-demand',
    'demand-weeks-nav',
    'demand-active-indicator',
    'demand-table',
    // Acciones y panel de cuadrante
    'btn-generate',
    'schedule-panel',
    'btn-sched-prev',
    'schedule-week-badge',
    'btn-sched-next',
    'generated-weeks-nav',
    'btn-edit',
    'btn-individual',
    'btn-share',
    'btn-export-csv',
    'btn-export',
    'schedule-table',
    'schedule-head-row',
    'schedule-body',
    // Panel de auditoría
    'audit-panel',
    'audit-global-badge',
    'audit-demand-summary',
    'audit-offdays-summary',
    'audit-ergonomics-summary',
    'equity-table-container',
    // Modal individual
    'individual-modal',
    'modal-title',
    'modal-close',
    'individual-emp-select',
    'individual-schedule-cards',
    'btn-copy-individual',
    // Modal de ayuda
    'help-modal',
    'help-modal-title',
    'help-modal-close',
    'btn-close-help',
    // Notificaciones y PDF
    'toast-container',
    'pdf-container'
  ];

  for (const id of expectedIds) {
    assert.ok(foundIds.has(id), `Falta el ID requerido en index.html: "${id}"`);
  }
});
