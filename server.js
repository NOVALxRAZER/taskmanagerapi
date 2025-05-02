// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db');
const { AES, enc } = require("crypto-js");
const util = require('util');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const Securitykey = process.env.JWT_SECRET;
const decrypt = (data) => {
    if(data){
        var bytes = AES.decrypt(data, Securitykey);
        var decryptedData = bytes.toString(enc.Utf8);
        return decryptedData;
    }else{
        return null;
    }
}
  
const encrypt = (data) => {
    return AES.encrypt(data, Securitykey).toString();
}

const app = express();
const PORT = process.env.PORT;
const HOST = process.env.HOST;

app.use(cors());
app.use(bodyParser.json());

//Promisify
const query = util.promisify(db.query).bind(db);

//  Register route
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const hashedPassword = encrypt(password);
        const existingUser = await query('SELECT * FROM users WHERE email = ?', [email]);

        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Email is already registered.' });
        }

        await query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword]);

        res.status(201).json({ message: 'Registration successful!' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// LOGIN endpoint
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], async (err, results) => {
        if (err) {
            console.error('Login query error:', err);
            return res.status(500).json({ message: 'Login failed' });
        }

        if (results.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = results[0];
        const match = password === decrypt(user.password);

        if (!match) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Generate JWT token (valid for 1 hour)
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Return success with token
        res.status(200).json({
            message: 'Login successful!',
            token,
            user: { id: user.id, username: user.username, email: user.email },
        });
    });
});

// POST route to handle form submission
app.post('/api/event', (req, res) => {
    const {
        nama_lengkap_spg,
        no_whatsapp,
        instagram_url,
        nama_event,
        tanggal_event,
        file_upload,
        status = 'waiting'
    } = req.body;

    const sql = `
    INSERT INTO event_form
    (nama_lengkap_spg, no_whatsapp, instagram_url, nama_event, tanggal_event, file_upload, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.query(sql, [
        nama_lengkap_spg,
        no_whatsapp,
        instagram_url,
        nama_event,
        tanggal_event,
        file_upload,
        status,
    ], (err, result) => {
        if (err) {
            console.error('Error inserting data:', err);
            return res.status(500).json({ error: 'Database insert failed' });
        }
        res.status(200).json({ message: 'Form submitted successfully!' });
    });
});

// GET paginated list of event_form entries
app.get('/api/event', async (req, res) => {
    let { page = 1, limit = 10 } = req.query;

    // Convert to integers
    page = parseInt(page);
    limit = parseInt(limit);

    const offset = (page - 1) * limit;

    try {
        const [rows, total] = await Promise.all([
            query(`SELECT * FROM event_form ORDER BY id DESC LIMIT ? OFFSET ?`, [limit, offset]),
            query(`SELECT COUNT(*) AS count FROM event_form`)
        ]);

        res.status(200).json({
            data: rows,
            pagination: {
                total: total[0].count,
                page,
                limit,
                totalPages: Math.ceil(total[0].count / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching event_form:', error);
        res.status(500).json({ error: 'Failed to fetch event_form data' });
    }
});

// GET paginated list of users entries
app.get('/api/user', async (req, res) => {
    let { page = 1, limit = 10 } = req.query;

    // Convert to integers
    page = parseInt(page);
    limit = parseInt(limit);

    const offset = (page - 1) * limit;

    try {
        const [rows, total] = await Promise.all([
            query(`SELECT * FROM users ORDER BY id DESC LIMIT ? OFFSET ?`, [limit, offset]),
            query(`SELECT COUNT(*) AS count FROM users`)
        ]);

        res.status(200).json({
            data: rows,
            pagination: {
                total: total[0].count,
                page,
                limit,
                totalPages: Math.ceil(total[0].count / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users data' });
    }
});

// PUT route to update status of an event_form entry
app.put('/api/event/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status value (optional: can be stricter if needed)
    const allowedStatuses = ['waiting', 'approved', 'rejected'];
    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status value.' });
    }

    try {
        const result = await query('UPDATE event_form SET status = ? WHERE id = ?', [status, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Event not found.' });
        }

        res.status(200).json({ message: 'Status updated successfully!' });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ error: 'Failed to update status.' });
    }
});

app.listen(PORT, HOST,() => {
    console.log(`Server running on http://localhost:${PORT}`);
});
