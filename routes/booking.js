const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

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
router.get('/upload', (req, res) => res.render('upload'));
router.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard', { user: req.user , error: null, data: roomsArray  });
});

module.exports = router;
