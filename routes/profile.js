const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { pool, pool2 } = require('../db');

//router.get('/', requireAuth, (req, res) => {
//  res.render('profile.ejs', { user: req.user });
//});

router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM registration_member WHERE mem_id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.redirect('/auth/login');
    }

    const member = rows[0];
    let extraInfo = {};

    if (member.role === 'student') {
      const [studentRows] = await pool2.execute(
        `SELECT student.*, major.maj_th_name
     FROM student
     INNER JOIN major ON student.stu_major = major.maj_id
     WHERE student.stu_buasri = ?`,
        [member.buasri]
      );
      extraInfo = studentRows[0] || {};
    } else {
      const [staffRows] = await pool2.execute(
        'SELECT * FROM staff WHERE staff_buasri = ?',
        [member.buasri]
      );
      extraInfo = staffRows[0] || {};
    }

    console.log('🔍 Profile query result:', rows); // TEMP — check this in terminal first
    console.log('🔍 Extra info from pool2:', extraInfo);

   res.render('profile.ejs', {
      user: { ...member, ...extraInfo },
      error: req.query.error,       // ✅ moved here — always available on success
      success: req.query.success,   // ✅ moved here
    });
  } catch (err) {
    console.error('❌ Profile route error:', err);
    res.redirect('/auth/login');    // ✅ simpler fallback — don't try to render with incomplete data
  }
});

router.post('/edit-pass', requireAuth, async (req, res) => {
  const { oldpass, newpass } = req.body;

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM registration_member WHERE mem_id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.redirect('/auth/login');
    }

    const member = rows[0];

    if (member.password !== oldpass) {
      return res.redirect('/profile?error=oldpass');
    }

    await pool.execute(
      'UPDATE registration_member SET password = ? WHERE mem_id = ?',
      [newpass, req.user.id]
    );

    res.redirect('/profile?success=passchanged');
  } catch (err) {
    console.error('❌ Edit password error:', err);
    res.redirect('/profile?error=server');
  }
});

module.exports = router;
