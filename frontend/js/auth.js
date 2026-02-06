const handleLogin = async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('loginError');

  try {
    const response = await API.Auth.login(email, password);
    
    API.setToken(response.data.token);
    API.setUser(response.data.user);
    
    window.location.href = '/index.html';
  } catch (error) {
    errorDiv.textContent = error.message;
    errorDiv.classList.remove('hidden');
  }
};

const handleRegister = async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('registerError');

  try {
    const response = await API.Auth.register(name, email, password);
    
    API.setToken(response.data.token);
    API.setUser(response.data.user);
    
    window.location.href = '/index.html';
  } catch (error) {
    errorDiv.textContent = error.message;
    errorDiv.classList.remove('hidden');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
});
