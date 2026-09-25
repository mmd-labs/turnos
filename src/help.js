export const HelpModal = {
  init() {
    this.modal = document.getElementById('help-modal');
    this.toggleBtn = document.getElementById('help-toggle');
    this.closeBtn = document.getElementById('help-modal-close');
    this.actionCloseBtn = document.getElementById('btn-close-help');

    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => this.open());
    }
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }
    if (this.actionCloseBtn) {
      this.actionCloseBtn.addEventListener('click', () => this.close());
    }
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal && !this.modal.hidden) {
        this.close();
      }
    });
  },

  open() {
    if (this.modal) this.modal.hidden = false;
  },

  close() {
    if (this.modal) this.modal.hidden = true;
  }
};

/* ============================================
   APP INITIALIZATION
   ============================================ */