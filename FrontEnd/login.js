import { login } from './shared/api.js';

const form   = document.querySelector('#loginForm');
const email  = document.querySelector('#email');
const pass   = document.querySelector('#password');
const submit = document.querySelector('.login-btn');
const error  = document.querySelector('#errorMessage');

function showError(msg) {
  error.style.display = 'block';
  error.textContent = msg || 'Login failed';
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  error.style.display = 'none';

  const emailVal = email?.value?.trim();
  const passVal  = pass?.value || '';
  if (!emailVal || !passVal) return showError('Please enter email and password.');

  submit.disabled = true;
  const { ok, data } = await login(emailVal, passVal);
  submit.disabled = false;

  if (ok) {
    location.replace('/FrontEnd/Dashboard/dashboard.html');
  } else {
    showError((data && (data.message || data.error)) || 'Invalid email or password');
  }
});