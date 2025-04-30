// task.js - Task service for managing tasks
class TaskService {
    constructor() {
        this.apiUrl = 'http://localhost:5000/api';
    }

    /**
     * Get all tasks for the current user
     * @returns {Promise} Promise resolving to array of tasks
     */
    async getAllTasks() {
        try {
            return await authService.fetchWithAuth('/tasks');
        } catch (error) {
            console.error('Error getting tasks:', error);
            throw error;
        }
    }

    /**
     * Get a specific task by ID
     * @param {string} taskId - Task ID
     * @returns {Promise} Promise resolving to task data
     */
    async getTaskById(taskId) {
        try {
            return await authService.fetchWithAuth(`/tasks/${taskId}`);
        } catch (error) {
            console.error(`Error getting task ${taskId}:`, error);
            throw error;
        }
    }

    /**
     * Create a new task
     * @param {Object|FormData} taskData - Task data as FormData or JSON object
     * @returns {Promise} Promise resolving to created task
     */
    async createTask(taskData) {
        try {
            const isFormData = taskData instanceof FormData;
            const options = {
                method: 'POST',
                body: isFormData ? taskData : JSON.stringify(taskData)
            };

            if (!isFormData) {
                options.headers = { 'Content-Type': 'application/json' };
            }

            return await authService.fetchWithAuth('/tasks', options);
        } catch (error) {
            console.error('Error creating task:', error);
            throw error;
        }
    }

    /**
     * Update an existing task
     * @param {string} taskId - Task ID
     * @param {Object|FormData} taskData - Updated task data
     * @returns {Promise} Promise resolving to updated task
     */
    async updateTask(taskId, taskData) {
        try {
            const isFormData = taskData instanceof FormData;
            const options = {
                method: 'PUT',
                body: isFormData ? taskData : JSON.stringify(taskData)
            };

            if (!isFormData) {
                options.headers = { 'Content-Type': 'application/json' };
            }

            return await authService.fetchWithAuth(`/tasks/${taskId}`, options);
        } catch (error) {
            console.error(`Error updating task ${taskId}:`, error);
            throw error;
        }
    }

    /**
     * Delete a task
     * @param {string} taskId - Task ID
     * @returns {Promise} Promise resolving to deletion result
     */
    async deleteTask(taskId) {
        try {
            return await authService.fetchWithAuth(`/tasks/${taskId}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error(`Error deleting task ${taskId}:`, error);
            throw error;
        }
    }

    /**
     * Update task status
     * @param {string} taskId - Task ID
     * @param {string} status - New status
     * @returns {Promise} Promise resolving to updated task
     */
    async updateTaskStatus(taskId, status) {
        try {
            return await authService.fetchWithAuth(`/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
        } catch (error) {
            console.error(`Error updating task status for ${taskId}:`, error);
            throw error;
        }
    }

    /**
     * Filter tasks by status
     * @param {string} status - Status to filter by (all, in-progress, completed, expired)
     * @returns {Promise} Promise resolving to filtered tasks
     */
    async filterTasksByStatus(status) {
        try {
            // Get all tasks
            const tasks = await this.getAllTasks();

            // Return all tasks if status is 'all'
            if (status === 'all') {
                return tasks;
            }

            // Map status values
            const statusMap = {
                'in-progress': ['in progress', 'pending'],
                'completed': ['completed'],
                'expired': ['expired']
            };

            // Filter tasks by status
            return tasks.filter(task => {
                const taskStatus = task.status.toLowerCase();
                const targetStatuses = statusMap[status] || [status.toLowerCase()];
                return targetStatuses.includes(taskStatus);
            });
        } catch (error) {
            console.error(`Error filtering tasks by status ${status}:`, error);
            throw error;
        }
    }

    /**
     * Search tasks by keyword
     * @param {string} query - Search query
     * @returns {Promise} Promise resolving to filtered tasks
     */
    async searchTasks(query) {
        try {
            // If query is empty, return all tasks
            if (!query) {
                return this.getAllTasks();
            }

            // Get all tasks and filter client-side
            const tasks = await this.getAllTasks();
            const lowercaseQuery = query.toLowerCase();

            return tasks.filter(task =>
                task.title.toLowerCase().includes(lowercaseQuery) ||
                (task.description && task.description.toLowerCase().includes(lowercaseQuery))
            );
        } catch (error) {
            console.error(`Error searching tasks for "${query}":`, error);
            throw error;
        }
    }
}

// Create and export singleton instance
const taskService = new TaskService();
window.taskService = taskService; // Make globally available