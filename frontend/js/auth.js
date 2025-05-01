// Authentication service
const authService = {
  // Check if user is authenticated
  isAuthenticated() {
    return localStorage.getItem('token') !== null;
  },

  // Register new user
  async register(userData) {
    try {
      const response = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const contentType = response.headers.get('content-type');
      let errorData;

      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
      } else {
        errorData = { message: await response.text() };
      }

      if (!response.ok) {
        throw new Error(errorData.message || 'Registration failed');
      }

      // Store the token in localStorage
      localStorage.setItem('token', errorData.token);
      localStorage.setItem('user', JSON.stringify(errorData.user));
      
      return errorData;
    } catch (error) {
      throw error;
    }
  },

  // Login user
  async login(credentials) {
    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const contentType = response.headers.get('content-type');
      let errorData;

      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
      } else {
        errorData = { message: await response.text() };
      }

      if (!response.ok) {
        throw new Error(errorData.message || 'Login failed');
      }

      // Store the token in localStorage
      localStorage.setItem('token', errorData.token);
      localStorage.setItem('user', JSON.stringify(errorData.user));
      
      return errorData;
    } catch (error) {
      throw error;
    }
  },

  // Logout user
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
  },

  // Get current user
  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Get auth token
  getToken() {
    return localStorage.getItem('token');
  }
}; 