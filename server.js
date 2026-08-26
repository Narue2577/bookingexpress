const express = require('express');
const cookieParser = require('cookie-parser');
const path          = require('path');
const bodyParser    = require('body-parser');
const session       = require('express-session');
const fs = require('fs');
require('dotenv').config();
const langMiddleware = require('./middleware/lang');
const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/booking');
const timetableRoutes = require('./routes/timetable');
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

app.get('/forgotpass', function(req, res) {
    res.render('index_forgotPassword.ejs');
});

app.get('/profile', function(req, res) {
    res.render('member_profile.ejs');
});
app.use('/auth', authRoutes);
app.use('/booking', bookingRoutes);
app.use('/timetable', timetableRoutes);
app.get('/', (req, res) => res.redirect('/auth/login'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});