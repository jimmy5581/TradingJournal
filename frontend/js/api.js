const API_BASE_URL = 'http://localhost:5000/api';

const getToken = () => {
  return localStorage.getItem('token');
};

const setToken = (token) => {
  localStorage.setItem('token', token);
};

const removeToken = () => {
  localStorage.removeItem('token');
};

const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

const setUser = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};

const removeUser = () => {
  localStorage.removeItem('user');
};

const apiCall = async (endpoint, options = {}) => {
  const token = getToken();
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    }
  };

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        removeToken();
        removeUser();
        window.location.href = '/login.html';
      }
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error: - api.js:58', error);
    throw error;
  }
};

const AuthAPI = {
  register: (name, email, password) => {
    return apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
  },

  login: (email, password) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  getProfile: () => {
    return apiCall('/auth/profile');
  },

  logout: () => {
    removeToken();
    removeUser();
    window.location.href = '/login.html';
  }
};

const TradeAPI = {
  createTrade: (tradeData) => {
    return apiCall('/trades', {
      method: 'POST',
      body: JSON.stringify(tradeData)
    });
  },

  getAllTrades: (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    return apiCall(`/trades?${queryParams}`);
  },

  getTradeById: (id) => {
    return apiCall(`/trades/${id}`);
  },

  updateTrade: (id, tradeData) => {
    return apiCall(`/trades/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tradeData)
    });
  },

  deleteTrade: (id) => {
    return apiCall(`/trades/${id}`, {
      method: 'DELETE'
    });
  }
};

const AnalyticsAPI = {
  getSummary: (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    return apiCall(`/analytics/summary?${queryParams}`);
  },

  getBehaviorAnalysis: (days = 30) => {
    return apiCall(`/analytics/behavior?days=${days}`);
  },

  getEquityCurve: (period = 'daily', days = 30) => {
    return apiCall(`/analytics/equity-curve?period=${period}&days=${days}`);
  }
};

const checkAuth = () => {
  const token = getToken();
  const currentPage = window.location.pathname;
  
  if (!token && !currentPage.includes('login.html') && !currentPage.includes('register.html')) {
    window.location.href = '/login.html';
    return false;
  }
  
  if (token && (currentPage.includes('login.html') || currentPage.includes('register.html'))) {
    window.location.href = '/index.html';
    return false;
  }
  
  return true;
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatDateTime = (date, time) => {
  return `${formatDate(date)} ${time}`;
};

const showNotification = (message, type = 'success') => {
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 px-6 py-3 rounded shadow-lg z-50 ${
    type === 'success' ? 'bg-green-500' : 'bg-red-500'
  } text-white`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
};

window.API = {
  Auth: AuthAPI,
  Trade: TradeAPI,
  Analytics: AnalyticsAPI,
  getToken,
  setToken,
  removeToken,
  getUser,
  setUser,
  removeUser,
  checkAuth,
  formatCurrency,
  formatDate,
  formatDateTime,
  showNotification
};
