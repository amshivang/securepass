const title = document.getElementById('loginTitle');
const url = document.getElementById('loginUrl');
const status = document.getElementById('loginStatus');
const fill = document.getElementById('fillPage');

function render(state) {
  if (!state || state.error) return;
  title.textContent = `SecurePass — ${state.title}`;
  url.textContent = state.url;
  status.textContent = state.status;
  fill.disabled = !state.canFill;
}

window.securePassLogin.onState(render);
window.securePassLogin.action('state').then(render);
for (const [id, action] of [['fillPage', 'fill'], ['reloadPage', 'reload'], ['openExternal', 'external']]) {
  document.getElementById(id).addEventListener('click', async () => {
    try {
      const result = await window.securePassLogin.action(action);
      if (result.error) status.textContent = result.error;
    } catch (_error) {
      status.textContent = 'The action could not complete. Try again.';
    }
  });
}
