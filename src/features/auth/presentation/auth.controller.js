/**
 * Auth Controller for dialog and session lifecycle.
 */
export class AuthController {
  /**
   * @param {Object} options
   * @param {import('../application/ports.js').AuthPort} options.authPort
   * @param {import('../../sync/application/ports.js').SyncPort} [options.syncPort]
   * @param {(ctx: { session?: any, offline?: boolean }) => void} [options.onLoginSuccess]
   * @param {() => void} [options.onLogout]
   */
  constructor({ authPort, syncPort, onLoginSuccess, onLogout }) {
    this.authPort = authPort;
    this.syncPort = syncPort;
    this.onLoginSuccess = onLoginSuccess;
    this.onLogout = onLogout;
  }

  init() {
    const authContainer = document.getElementById('auth-container');
    const appWrapper = document.getElementById('app-wrapper');
    const btnLogin = document.getElementById('btn-login');
    const usernameInput = document.getElementById('auth-username');
    const passwordInput = document.getElementById('auth-password');
    const errorEl = document.getElementById('auth-error');
    const btnLoginOffline = document.getElementById('btn-login-offline');
    const btnLogout = document.getElementById('btn-logout');

    const handleLogin = async () => {
      const username = usernameInput ? usernameInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';
      if (!username || !password) return;

      if (btnLogin) {
        btnLogin.textContent = 'Ingresando...';
        btnLogin.disabled = true;
      }
      if (errorEl) errorEl.style.display = 'none';

      const { error } = await this.authPort.signIn({ username, password });

      if (error) {
        if (errorEl) {
          errorEl.textContent = 'Credenciales inválidas';
          errorEl.style.display = 'block';
        }
        if (btnLogin) {
          btnLogin.textContent = 'Ingresar';
          btnLogin.disabled = false;
        }
      }
    };

    if (btnLogin) btnLogin.addEventListener('click', handleLogin);
    if (passwordInput) {
      passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
      });
    }

    if (btnLoginOffline) {
      btnLoginOffline.addEventListener('click', () => {
        if (authContainer && authContainer.open) authContainer.close();
        if (appWrapper) appWrapper.style.display = 'block';
        if (this.onLoginSuccess) this.onLoginSuccess({ offline: true });
      });
    }

    if (btnLogout) {
      btnLogout.addEventListener('click', async () => {
        await this.authPort.signOut();
        if (this.onLogout) this.onLogout();
      });
    }

    this.authPort.onAuthStateChange(async (event, session) => {
      if (session) {
        if (authContainer && authContainer.open) authContainer.close();
        if (appWrapper) appWrapper.style.display = 'block';
        if (this.syncPort) {
          await this.syncPort.pull();
        }
        if (this.onLoginSuccess) this.onLoginSuccess({ session });
      } else {
        if (appWrapper) appWrapper.style.display = 'none';
        if (authContainer && !authContainer.open) authContainer.showModal();
      }
    });
  }
}
