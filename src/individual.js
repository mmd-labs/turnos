/**
 * Compatibility Shim for IndividualView.
 * Delegates to IndividualController and IndividualViewPresentation.
 */

import { individualController } from './features/individual/presentation/individual.controller.js';

export const IndividualView = {
  init() {
    individualController.init();
  },

  /**
   * @param {string[][]} matrix
   * @param {string[]} employees
   * @param {string} weekStart
   */
  open(matrix, employees, weekStart) {
    individualController.open(matrix, employees, weekStart);
  },

  close() {
    individualController.close();
  },

  renderSelected() {
    individualController.renderSelected();
  },

  async copySchedule() {
    await individualController.copySchedule();
  },
};
