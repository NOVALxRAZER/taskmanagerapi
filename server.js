// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const pool = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Register
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const existingUser = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser[0].length > 0) {
            return res.status(400).json({ message: 'Email already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword]);

        res.status(201).json({ message: 'Registration successful!' });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

// Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [results] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

        if (results.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            message: 'Login successful!',
            token,
            user: { id: user.id, username: user.username, email: user.email },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Login failed due to server error' });
    }
});

// Submit Event Form
app.post('/api/event', async (req, res) => {
    const {
        nama_lengkap_spg,
        no_whatsapp,
        instagram_url,
        nama_event,
        tanggal_event,
        file_upload,
        status = 'waiting'
    } = req.body;

    try {
        await pool.query(
            `INSERT INTO event_form (nama_lengkap_spg, no_whatsapp, instagram_url, nama_event, tanggal_event, file_upload, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [nama_lengkap_spg, no_whatsapp, instagram_url, nama_event, tanggal_event, file_upload, status]
        );
        res.status(200).json({ message: 'Form submitted successfully!' });
    } catch (err) {
        console.error('Error inserting data:', err);
        res.status(500).json({ error: 'Database insert failed' });
    }
});

// Get Event Form Paginated
app.get('/api/event', async (req, res) => {
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    try {
        const [rows] = await pool.query('SELECT * FROM event_form ORDER BY id DESC LIMIT ? OFFSET ?', [limit, offset]);
        const [countResult] = await pool.query('SELECT COUNT(*) AS count FROM event_form');

        res.status(200).json({
            data: rows,
            pagination: {
                total: countResult[0].count,
                page,
                limit,
                totalPages: Math.ceil(countResult[0].count / limit),
            }
        });
    } catch (error) {
        console.error('Error fetching event_form:', error);
        res.status(500).json({ error: 'Failed to fetch event_form data' });
    }
});

// Get Users Paginated
app.get('/api/user', async (req, res) => {
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    try {
        const [rows] = await pool.query('SELECT * FROM users ORDER BY id DESC LIMIT ? OFFSET ?', [limit, offset]);
        const [countResult] = await pool.query('SELECT COUNT(*) AS count FROM users');

        res.status(200).json({
            data: rows,
            pagination: {
                total: countResult[0].count,
                page,
                limit,
                totalPages: Math.ceil(countResult[0].count / limit),
            }
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users data' });
    }
});

// Update Status of Event
app.put('/api/event/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const allowedStatuses = ['waiting', 'approved', 'rejected'];

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status value.' });
    }

    try {
        const [result] = await pool.query('UPDATE event_form SET status = ? WHERE id = ?', [status, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Event not found.' });
        }
        res.status(200).json({ message: 'Status updated successfully!' });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ error: 'Failed to update status.' });
    }
});

app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
});
