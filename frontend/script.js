// script.js - Common functionality for all pages
document.addEventListener('DOMContentLoaded', function () {
    // Check if auth.js is loaded
    if (typeof authService === 'undefined') {
        console.error('Auth service not loaded! Please include auth.js');
        return;
    }

    // Skip authentication check on login and registration pages
    const currentPage = window.location.pathname.split('/').pop();
    const publicPages = ['login.html', 'createAccount.html', 'index.html', ''];

    if (!publicPages.includes(currentPage)) {
        // Check authentication for protected pages
        if (!authService.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }

        // Initialize user data for protected pages
        initializeUserData();
    }

    // Setup navigation links
    setupNavigationLinks();

    // Handle logout buttons
    setupLogoutButtons();
});

/**
 * Initialize user data for the current page
 */
async function initializeUserData() {
    try {
        // Fetch user data
        const user = await authService.getCurrentUser();

        // Update user info in sidebar and header (if elements exist)
        updateUserInfo(user);
    } catch (error) {
        console.error('Error initializing user data:', error);

        // If authentication error, redirect to login
        if (error.message.includes('authentication') || error.message.includes('401')) {
            authService.clearAuthToken();
            window.location.href = 'login.html?expired=true';
        }
    }
}

/**
 * Update user information in UI
 * @param {Object} user - User data
 */
function updateUserInfo(user) {
    // Get elements if they exist
    const headerUsername = document.getElementById('headerUsername');
    const sidebarUsername = document.getElementById('sidebarUsername');
    const headerUserInitials = document.getElementById('headerUserInitials');
    const sidebarUserInitials = document.getElementById('sidebarUserInitials');

    // Set username
    if (headerUsername) headerUsername.textContent = user.username || 'User';
    if (sidebarUsername) sidebarUsername.textContent = user.username || 'User';

    // Set user initials
    const initials = getInitials(user.username || 'User');
    if (headerUserInitials) headerUserInitials.textContent = initials;
    if (sidebarUserInitials) sidebarUserInitials.textContent = initials;

    // Update profile image if available
    if (user.profileImage) {
        updateProfileImage(user.profileImage);
    }
}

/**
 * Get initials from username
 * @param {string} name - Username
 * @returns {string} Initials
 */
function getInitials(name) {
    return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase();
}

/**
 * Update profile image in UI
 * @param {string} imagePath - Path to profile image
 */
function updateProfileImage(imagePath) {
    // Get elements if they exist
    const headerAvatar = document.getElementById('headerAvatar');
    const sidebarAvatar = document.getElementById('sidebarAvatar');

    // Full image URL
    const imageUrl = `http://localhost:5000/${imagePath}`;

    // Update header avatar
    if (headerAvatar) {
        // Clear existing content
        headerAvatar.innerHTML = '';

        // Create and append image
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = 'Profile Image';
        headerAvatar.appendChild(img);
    }

    // Update sidebar avatar
    if (sidebarAvatar) {
        // Clear existing content
        sidebarAvatar.innerHTML = '';

        // Create and append image
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = 'Profile Image';
        sidebarAvatar.appendChild(img);
    }
}

/**
 * Setup navigation links
 */
function setupNavigationLinks() {
    // Get all navigation links
    const navLinks = document.querySelectorAll('.nav-link');

    // Add click event to each link
    navLinks.forEach(link => {
        link.addEventListener('click', function () {
            const href = this.getAttribute('href');
            if (href) {
                window.location.href = href;
            }
        });
    });
}

/**
 * Setup logout buttons
 */
function setupLogoutButtons() {
    // Get all logout buttons
    const logoutButtons = document.querySelectorAll('.logout-btn');

    // Add click event to each button
    logoutButtons.forEach(button => {
        button.addEventListener('click', function () {
            authService.logout();
        });
    });
}

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date
 */
function formatDate(date) {
    if (!date) return 'N/A';

    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid date';

    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Map task status to CSS class
 * @param {string} status - Task status
 * @returns {string} CSS class
 */
function getStatusClass(status) {
    if (!status) return '';

    const s = status.toLowerCase();
    if (s === 'in progress' || s === 'pending') return 'status-in-progress';
    if (s === 'completed') return 'status-completed';
    if (s === 'expired') return 'status-expired';
    return '';
}

/**
 * Map task priority to CSS class
 * @param {string} priority - Task priority
 * @returns {string} CSS class
 */
function getPriorityClass(priority) {
    if (!priority) return 'priority-medium';

    const p = priority.toLowerCase();
    if (p === 'high') return 'priority-high';
    if (p === 'medium') return 'priority-medium';
    if (p === 'low') return 'priority-low';
    return 'priority-medium';
}

// Export common helper functions globally
window.todoApp = {
    getInitials,
    formatDate,
    getStatusClass,
    getPriorityClass,
    updateUserInfo
};