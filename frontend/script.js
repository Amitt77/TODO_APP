// Utility function to check if the user is logged in
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
    }
}

// Login Functionality
if (window.location.pathname.includes('login.html')) {
    document.getElementById('loginForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const response = await fetch('http://localhost:5000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        if (response.ok) {
            const { token } = await response.json();
            localStorage.setItem('token', token);
            window.location.href = 'dashboard.html';
        } else {
            alert('Invalid credentials');
        }
    });
}

// Create Account Functionality
if (window.location.pathname.includes('createAccount.html')) {
    document.getElementById('signupForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const response = await fetch('http://localhost:5000/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password }),
        });

        if (response.ok) {
            window.location.href = 'login.html';
        } else {
            alert('Registration failed');
        }
    });
}

// Dashboard Functionality
if (window.location.pathname.includes('dashboard.html')) {
    checkAuth();

    document.addEventListener('DOMContentLoaded', async function () {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/tasks', {
            headers: {
                'Authorization': token,
            },
        });

        const tasks = await response.json();
        const tasksContainer = document.getElementById('tasks');
        tasksContainer.innerHTML = tasks.map(task => `
            <div class="task">
                <h3>${task.title}</h3>
                <p>${task.description}</p>
                <p>Due: ${new Date(task.dueDate).toLocaleDateString()}</p>
                <p>Priority: ${task.priority}</p>
                <p>Status: ${task.status}</p>
                <button onclick="deleteTask('${task._id}')">Delete</button>
                <button onclick="editTask('${task._id}')">Edit</button>
            </div>
        `).join('');
    });

    window.deleteTask = async function (taskId) {
        const token = localStorage.getItem('token');
        await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': token,
            },
        });
        window.location.reload();
    };

    window.editTask = function (taskId) {
        window.location.href = `createTask.html?taskId=${taskId}`;
    };
}

// Create/Edit Task Functionality
if (window.location.pathname.includes('createTask.html')) {
    checkAuth();

    const taskId = new URLSearchParams(window.location.search).get('taskId');

    if (taskId) {
        // Editing an existing task
        document.addEventListener('DOMContentLoaded', async function () {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
                headers: {
                    'Authorization': token,
                },
            });

            const task = await response.json();
            document.getElementById('title').value = task.title;
            document.getElementById('description').value = task.description;
            document.getElementById('dueDate').value = new Date(task.dueDate).toISOString().split('T')[0];
            document.getElementById('priority').value = task.priority;
        });
    }

    document.getElementById('taskForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const task = {
            title: document.getElementById('title').value,
            description: document.getElementById('description').value,
            dueDate: document.getElementById('dueDate').value,
            priority: document.getElementById('priority').value,
            status: 'pending',
            token,
        };

        const url = taskId ? `http://localhost:5000/api/tasks/${taskId}` : 'http://localhost:5000/api/tasks';
        const method = taskId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(task),
        });

        if (response.ok) {
            window.location.href = 'dashboard.html';
        }
    });
}

// Profile Functionality
if (window.location.pathname.includes('profile.html')) {
    checkAuth();

    document.addEventListener('DOMContentLoaded', async function () {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/user', {
            headers: {
                'Authorization': token,
            },
        });

        const user = await response.json();
        document.getElementById('username').value = user.username;
        document.getElementById('email').value = user.email;
    });

    document.getElementById('logoutBtn').addEventListener('click', function () {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });
}