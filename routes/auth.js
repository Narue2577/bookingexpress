const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../db');
const fs = require('fs');
const path = require('path');


const roomData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/data.json'), 'utf8')
);
const roomsArray = Object.values(roomData);

router.get('/login', (req, res) => {
  res.render('login', { error: null, data: roomsArray });
});

/* ===== Show Borrow Policy Page ===== */

router.get('/policy2', function(req, res) {
    res.render('index_policy2.ejs');
});


/* ===== Show Captcha Page ===== */
router.get('/captcha', function(req, res) {
    res.render('index_captcha.ejs');
});

/* ===== Show Register Page ===== */
router.get('/register', function(req, res) {
    res.render('index_register.ejs', {
        texts:         '',
        showRegist:    1,
        userData:      ''
    });
});

router.post('/login', async (req, res) => {
  const { buasri, role, password } = req.body;

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM registration_member WHERE buasri = ? AND role = ?',
      [buasri, role]
    );

    if (rows.length === 0) {
      return res.render('login', { error: 'ไม่พบผู้ใช้งาน' });
    }

    const user = rows[0];
    if (user.password !== password) {
      return res.render('login', { error: 'รหัสผ่านไม่ถูกต้อง' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.cookie('token', token, { httpOnly: true });
    res.redirect('/booking/dashboard');
  } catch (err) {
    console.error(err);
    res.render('login', { error: 'เกิดข้อผิดพลาด' });
  }
});



router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.render('login', { data: roomsArray, error: null }); // add both here
});

module.exports = router;