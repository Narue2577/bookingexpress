const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

const roomData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/data.json'), 'utf8')
);
const roomsArray = Object.values(roomData);

function requireAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect('/auth/login');

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.redirect('/auth/login');
  }
}

router.get('/upload', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT filename FROM timetables ORDER BY uploaded_at DESC LIMIT 1'
    );
    const currentFile = rows.length > 0 ? rows[0].filename : null;

    res.render('upload', { user: req.user, currentFile });
  } catch (err) {
    console.error('❌ Upload page error:', err);
    res.render('upload', { user: req.user, currentFile: null });
  }
});

router.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard', { user: req.user, error: null, data: roomsArray });
});

router.get('/profile', requireAuth, (req, res) => {
  res.render('profile', { user: req.user });
});

module.exports = router;
