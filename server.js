const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const PORT = process.env.PORT;

const app = express();

app.use(cors());
app.use(bodyParser.json());

// GET all tasks
app.get('/api/tasks', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, title, description, completed, pic_name, start_date, end_date, created_at FROM tasks ORDER BY id DESC'
        );
        res.status(200).json(rows);
    } catch (err) {
        console.error('Error getting tasks:', err);
        res.status(500).json({ error: err });
    }
});

// POST a new task
app.post('/api/tasks', async (req, res) => {
    const { title, description, pic_name, start_date, end_date } = req.body;
    if (!title || !pic_name || !start_date || !end_date) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO tasks (title, description, pic_name, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
            [title, description, pic_name, start_date, end_date]
        );

        const insertedTask = {
            id: result.insertId,
            title,
            description,
            pic_name,
            start_date,
            end_date,
            completed: false,
            success: true,
        };

        res.status(201).json(insertedTask);
    } catch (err) {
        console.error('Error creating task:', err);
        res.status(500).json({ error: err });
    }
});

// PATCH update a task
app.patch('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const { completed } = req.body;

    try {
        const updateResult = await pool.query(
            'UPDATE tasks SET completed = ? WHERE id = ?',
            [completed, id]
        );

        // Check if any row was affected
        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Now fetch the updated row manually
        const patchededTask = {
            id,
            completed,
            status: true,
        };

        res.status(200).json(patchededTask);
    } catch (err) {
        console.error('Error updating task:', err);
        res.status(500).json({ error: err });
    }
});

// PUT to edit a task
app.put('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, completed, pic_name, start_date, end_date } = req.body;

    if (!title || !pic_name || !start_date || !end_date) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const [updateResult] = await pool.query(
            `UPDATE tasks SET title = ?, description = ?, completed = ?, pic_name = ?, start_date = ?, end_date = ? WHERE id = ?`,
            [title, description, completed, pic_name, start_date, end_date, id]
        );

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);

        const editedTask = {
            id,
            title,
            description,
            pic_name,
            start_date,
            end_date,
            success: true,
        };

        res.status(200).json(editedTask);
    } catch (err) {
        console.error('Error editing task:', err);
        res.status(500).json({ error: err });
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

        res.status(200).json({
            message: 'Task deleted successfully',
            status: true
        });
    } catch (err) {
        console.error('Error deleting task:', err);
        res.status(500).json({ error: err });
    }
});

// Root test route
app.get('/', (req, res) => {
    res.send('Task Manager API is running!');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
