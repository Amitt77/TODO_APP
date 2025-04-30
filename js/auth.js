// auth.js - Authentication service
class AuthService {
    constructor() {
        this.tokenKey = 'auth_token';
        this.apiUrl = 'http://localhost:5000/api';
    }

    /**
     * Set authentication token in localStorage and cookie
     * @param {string} token - JWT token
     * @param {number} expiryDays - Number of days until token expires
     */
    setAuthToken(token, expiryDays = 7) {
        console.log('Setting auth token:', token.substring(0, 15) + '...');

        // Store in localStorage
        localStorage.setItem(this.tokenKey, token);

        // Also store in cookie as backup
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expiryDays);
        const secure = window.location.protocol === 'https:' ? 'secure;' : '';
        document.cookie = `${this.tokenKey}=${token};expires=${expiryDate.toUTCString()};path=/;${secure}`;
    }

    /**
     * Get authentication token from localStorage or cookie
     * @returns {string} JWT token or null if not found
     */
    getAuthToken() {
        // First try localStorage
        let token = localStorage.getItem(this.tokenKey);

        // If not found, try cookies
        if (!token) {
            const cookies = document.cookie.split(';');
            for (let cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                if (name === this.tokenKey) {
                    token = value;
                    break;
                }
            }
        }

        return token;
    }

    /**
     * Clear authentication token from localStorage and cookie
     */
    clearAuthToken() {
        console.log('Clearing auth token');
        localStorage.removeItem(this.tokenKey);
        document.cookie = `${this.tokenKey}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`;
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} True if authenticated
     */
    isAuthenticated() {
        return !!this.getAuthToken();
    }

    /**
     * Redirect to login page if not authenticated
     * @param {string} redirectUrl - URL to redirect to if not authenticated
     * @returns {boolean} True if authenticated
     */
    requireAuth(redirectUrl = 'login.html') {
        if (!this.isAuthenticated()) {
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    }

    /**
     * Register a new user
     * @param {Object} userData - User registration data
     * @returns {Promise} Promise resolving to registration result
     */
    async register(userData) {
        try {
            const response = await fetch(`${this.apiUrl}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            if (data.token) {
                this.setAuthToken(data.token);
            }

            return data;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    /**
     * Login user
     * @param {Object} credentials - User login credentials
     * @returns {Promise} Promise resolving to login result
     */
    async login(credentials) {
        try {
            const response = await fetch(`${this.apiUrl}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            if (data.token) {
                this.setAuthToken(data.token);
            }

            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    /**
     * Logout user
     * @returns {Promise} Promise resolving to logout result
     */
    async logout() {
        this.clearAuthToken();
        window.location.href = 'login.html';
        return { success: true };
    }

    /**
     * Get current user data
     * @returns {Promise} Promise resolving to user data
     */
    async getCurrentUser() {
        try {
            const token = this.getAuthToken();

            if (!token) {
                throw new Error('Not authenticated');
            }

            const response = await fetch(`${this.apiUrl}/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // Handle unauthorized response
            if (response.status === 401) {
                this.clearAuthToken();
                throw new Error('Authentication failed - please log in again');
            }

            // Handle server error
            if (response.status === 500) {
                throw new Error('Server error - please try again later');
            }

            // Handle other non-2xx responses
            if (!response.ok) {
                throw new Error(`Server returned error: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error getting user data:', error);
            throw error;
        }
    }

    /**
     * Make authenticated API request
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Fetch options
     * @returns {Promise} Promise resolving to response data
     */
    async fetchWithAuth(endpoint, options = {}) {
        const token = this.getAuthToken();

        if (!token) {
            throw new Error('Not authenticated');
        }

        const requestOptions = {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${token}`
            }
        };

        try {
            const response = await fetch(`${this.apiUrl}${endpoint}`, requestOptions);

            // Handle session expiry
            if (response.status === 401) {
                this.clearAuthToken();
                window.location.href = 'login.html?expired=true';
                throw new Error('Session expired');
            }

            // Parse response based on content type
            let data;
            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                throw new Error(data.message || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error(`Error calling ${endpoint}:`, error);
            throw error;
        }
    }
}

// Create and export singleton instance
const authService = new AuthService();
window.authService = authService; // Make globally available