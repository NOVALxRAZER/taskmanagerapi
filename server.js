// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const PORT = process.env.PORT;
const HOST = process.env.DB_HOST;

const app = express();

app.use(cors());
app.use(bodyParser.json());

// GET all tasks
app.get('/api/tasks', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tasks ORDER BY id DESC');
        res.status(200).json(result[0]);
    } catch (err) {
        console.error('Error getting tasks:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST a new task
app.post('/api/tasks', async (req, res) => {
    const { title, description } = req.body;
    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }
    try {
        const [result] = await pool.query(
            'INSERT INTO tasks (title, description) VALUES (?, ?)',
            [title, description]
        );

        const insertedTask = {
            id: result.insertId,
            title,
            description,
            completed: false,
            success: true,
        };

        res.status(201).json(insertedTask);
    } catch (err) {
        console.error('Error creating task:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH update a task
app.patch('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, completed } = req.body;

    try {
        const updateResult = await pool.query(
            'UPDATE tasks SET title = ?, description = ?, completed = ? WHERE id = ?',
            [title, description, completed, id]
        );

        // Check if any row was affected
        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Now fetch the updated row manually
        const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);

        res.status(200).json(rows[0]);
    } catch (err) {
        console.error('Error updating task:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE a task
app.delete('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Check if task exists
        const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Delete the task
        await pool.query('DELETE FROM tasks WHERE id = ?', [id]);

        res.status(200).json({ message: 'Task deleted successfully' });
    } catch (err) {
        console.error('Error deleting task:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Root test route
app.get('/', (req, res) => {
    res.send('Task Manager API is running!');
});

app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${PORT}`);
});
