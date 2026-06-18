const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { SECRET } = require('../middleware/auth');

router.post('/register', (req, res) => {
    try {
        const { username, password, age, gender, height, weight, activity_level } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existing) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        const hashedPassword = bcrypt.hashSync(password, 10);

        const result = db.prepare(
            `INSERT INTO users (username, password, age, gender, height, weight, activity_level)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(username, hashedPassword, age ?? null, gender ?? null, height ?? null, weight ?? null, activity_level ?? null);

        res.json({ user_id: Number(result.lastInsertRowid), message: 'Registration successful' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = db.prepare(
            'SELECT id, username, password FROM users WHERE username = ?'
        ).get(username);

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = jwt.sign(
            { userId: user.id, username: user.username },
            SECRET,
            { expiresIn: '7d' }
        );

        res.json({ user_id: user.id, username: user.username, token, message: 'Login successful' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
