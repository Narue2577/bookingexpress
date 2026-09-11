const express = require('express');
const cookieParser = require('cookie-parser');
const path          = require('path');
const bodyParser    = require('body-parser');
const session       = require('express-session');
const jwt = require('jsonwebtoken');
const fs = require('fs');
require('dotenv').config();
const langMiddleware = require('./middleware/lang');
const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/booking');
const timetableRoutes = require('./routes/timetable');
const profileRoutes = require('./routes/profile');
const nodemailer = require('nodemailer');
const { pool } = require('./db');
require('dotenv').config();
const app = express();




app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(langMiddleware);
//app.use(express.static('public'));
app.use(express.static(__dirname + '/public'));

// Read JSON data from file
const roomData =
    JSON.parse(fs.readFileSync(path.join(__dirname, 'data/data.json'), 'utf8'));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


function generateRandomPassword(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < length; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

// Define a route to render the EJS template
app.get('/', (req, res) => {
    // Render the 'user.ejs' template and pass the JSON data to it
   res.render('login', { data: Object.values(roomData), error: null });
});
app.get('/policy', function(req, res) {
    res.render('index_policy.ejs');
});
app.get('/policy2', function(req, res) {
    res.render('index_policy2.ejs');
});

app.get('/captcha', function(req, res) {
    res.render('index_captcha.ejs');
});

app.get('/forgotPass', function(req, res) {
    res.render('forgotPassword.ejs', { requests: 'block', sents: 'none', error: null });
});

app.post('/forgotPass', async (req, res) => {
  const { buasri } = req.body;

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM registration_member WHERE buasri = ?',
      [buasri]
    );

    if (rows.length === 0) {
      return res.render('forgotPassword.ejs', { requests: 'block', sents: 'none', error: 'ไม่พบผู้ใช้งานนี้' });
    }

    const user = rows[0];
    const newPassword = generateRandomPassword();

    await pool.execute(
      'UPDATE registration_member SET password = ? WHERE mem_id = ?',
      [newPassword, user.mem_id]
    );
 await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: user.email,
      subject: 'รหัสผ่านใหม่ - ระบบจองห้องเรียน COSCI',
      html: `<p>สวัสดีคุณ ${user.name},</p><p>รหัสผ่านใหม่ของคุณคือ: <b>${newPassword}</b></p><p>กรุณาเข้าสู่ระบบและเปลี่ยนรหัสผ่านทันที</p>`,
    });
    console.log('Mail config:', {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS ? '(set)' : '❌ MISSING',
    });
    // ✅ success — hide the request form, show "sent" confirmation
    res.render('forgotPassword', { requests: 'none', sents: 'block', error: null });
  } catch (err) {
    console.error('❌ Forgot password error:', err);
    res.render('forgotPassword', { requests: 'block', sents: 'none', error: 'เกิดข้อผิดพลาด' });
  }
});


app.use('/auth', authRoutes);
app.use('/booking', bookingRoutes);
app.use('/timetable', timetableRoutes);
app.use('/profile', profileRoutes);

app.get('/', (req, res) => res.redirect('/auth/login'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
