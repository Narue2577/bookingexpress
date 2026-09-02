const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { pool, pool2 } = require('../db');
const fs = require('fs');
const path = require('path');

const roomData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/data.json'), 'utf8')
);
const roomsArray = Object.values(roomData);

router.get('/login', (req, res) => {
  res.render('login', { error: null, data: roomsArray });
});

router.get('/register', (req, res) => {
  res.render('register', { error: null, data: roomsArray });
});

router.get('/policy2', (req, res) => {
  res.render('index_policy2.ejs');
});

router.get('/captcha', (req, res) => {
  res.render('index_captcha.ejs');
});

router.post('/login', async (req, res) => {
  const { buasri, role, password } = req.body;

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM registration_member WHERE buasri = ? AND role = ?',
      [buasri, role]
    );

    if (rows.length === 0) {
      return res.render('login', { error: 'ไม่พบผู้ใช้งาน', data: roomsArray });
    }

    const user = rows[0];
    if (user.password !== password) {
      return res.render('login', { error: 'รหัสผ่านไม่ถูกต้อง', data: roomsArray });
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
    res.render('login', { error: 'เกิดข้อผิดพลาด', data: roomsArray });
  }
});

router.post('/check-buasri', async (req, res) => {
  const { buasri, role } = req.body;

  try {
    let query;
    if (role === 'student') {
      query = `SELECT student.*, staff.staff_name AS advisor_name
           FROM student
           INNER JOIN staff ON student.stu_advisor = staff.staff_id
           WHERE student.stu_buasri = ?`;
    } else {
      query = 'SELECT * FROM staff WHERE staff_buasri = ?';
    }

    const [found] = await pool2.execute(query, [buasri]);

    if (found.length === 0) {
      return res.json({ ok: false, message: 'ไม่พบข้อมูลนี้ในระบบ' }); // ✅ return added
    }

    const [existing] = await pool.execute(
      'SELECT * FROM registration_member WHERE buasri = ? AND role = ?',
      [buasri, role]
    );

    if (existing.length > 0) {
      return res.json({ ok: false, message: 'มีผู้ใช้งานนี้ลงทะเบียนแล้ว' }); // ✅ return added
    }

    return res.json({ ok: true, userData: found[0] }); // ✅ return added (good practice even on the last one)
  } catch (err) {
    console.error(err);
    return res.json({ ok: false, message: 'เกิดข้อผิดพลาด' });
  }
});

router.post('/register', async (req, res) => {
  const { buasri, role, password, name, email, ref_id  } = req.body;
   const advisor = role === 'staff' ? '-' : req.body.advisor;

  try {
    const [existing] = await pool.execute(
      'SELECT * FROM registration_member WHERE buasri = ? AND role = ?',
      [buasri, role]
    );

    if (existing.length > 0) {
      return res.render('register', { error: 'มีผู้ใช้งานนี้ลงทะเบียนแล้ว', data: roomsArray });
    }

    const [result] = await pool.execute(
      `INSERT INTO registration_member 
       (id, buasri, role, password, name, advisor, email, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [ref_id ?? null, buasri, role, password, name, advisor, email]
    );

    const token = jwt.sign(
      { id: result.insertId, role, name },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.cookie('token', token, { httpOnly: true });
    res.redirect('/booking/dashboard');
  } catch (err) {
    console.error(err);
    res.render('register', { error: 'เกิดข้อผิดพลาดในการลงทะเบียน', data: roomsArray });
  }
});

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.render('login', { data: roomsArray, error: null });
});

module.exports = router;
