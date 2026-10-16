(() => {
const siteToast = document.querySelector('#toast');
let siteToastTimer;
function toast(message) {
  siteToast.textContent = message;
  siteToast.hidden = false;
  clearTimeout(siteToastTimer);
  siteToastTimer = setTimeout(() => { siteToast.hidden = true; }, 6000);
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('Copiado para a área de transferência.'); }
  catch (error) { console.error('Clipboard failed:', error); toast('Não foi possível copiar. Selecione o texto e copie manualmente.'); }
}
window.BCUI = { toast, copy };

function applyTheme(theme) {
  document.body.dataset.theme = theme === 'dark' ? 'dark' : 'light';
  document.querySelector('#theme').setAttribute('aria-label', theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro');
}
try { applyTheme(localStorage.getItem('bc-theme')); }
catch (error) { console.warn('Theme preference unavailable:', error); applyTheme('light'); }
document.querySelector('#theme').addEventListener('click', () => {
  const theme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(theme);
  try { localStorage.setItem('bc-theme', theme); }
  catch (error) { console.warn('Theme preference not saved:', error); toast('O tema foi alterado, mas o navegador não permitiu salvar a preferência.'); }
});
})();
