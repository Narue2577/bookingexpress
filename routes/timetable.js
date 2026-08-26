const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const pool = require('../db');

const upload = multer({ storage: multer.memoryStorage() });

const DAYS = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];
const TIME_RE = /^\d{1,2}[.:]\d{2}\s*-\s*\d{1,2}[.:]\d{2}$/;

function parseSubject(val) {
  const m = val.match(/^([^\s(]+)\s*\(([^)]+)\)\s*(.*)$/);
  if (m) {
    const dash = m[1].indexOf('-');
    return {
      subject: dash > -1 ? m[1].slice(0, dash) : m[1],
      section: dash > -1 ? m[1].slice(dash + 1) : null,
      teacher: m[2].trim(),
      room: m[3].trim() || null,
      raw: val,
    };
  }
  return { raw: val };
}

function parseTimetable(rows) {
  const out = { title: '', rooms: {} };

  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      if (rows[r][c]) { out.title = rows[r][c]; break; }
    }
    if (out.title) break;
  }

  const anchors = [];
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      if (!rows[r][c]) continue;
      const m = String(rows[r][c]).match(/รหัสห้องเรียน\s+\d+-\d+-\d*(\d{4})/);
      if (m) { anchors.push({ r, roomNum: m[1], info: rows[r][c] }); break; }
    }
  }

  anchors.forEach((anchor, ai) => {
    const infoR = anchor.r;
    const limitR = ai + 1 < anchors.length ? anchors[ai + 1].r : rows.length;

    let roomName = '';
    for (let r = infoR - 1; r >= 0; r--) {
      for (let c = 0; c < rows[r].length; c++) {
        const v = rows[r][c];
        if (v && v !== out.title && !v.match(/รหัสห้องเรียน/)) { roomName = v; break; }
      }
      if (roomName) break;
    }

    const timeMap = {};
    const timeSlots = [];
    let timeR = -1;
    for (let r = infoR + 1; r < limitR; r++) {
      const cnt = rows[r].filter(v => v && TIME_RE.test(v)).length;
      if (cnt >= 2) {
        timeR = r;
        rows[r].forEach((v, c) => { if (v && TIME_RE.test(v)) { timeMap[c] = v; timeSlots.push(v); } });
        break;
      }
    }
    if (timeR === -1) return;

    const schedule = {};
    for (let r = timeR + 1; r < limitR; r++) {
      const row = rows[r];
      let day = null;
      for (let c = 0; c < row.length; c++) {
        if (row[c] && DAYS.indexOf(row[c]) > -1) { day = row[c]; break; }
      }
      if (!day) continue;
      if (!schedule[day]) schedule[day] = [];

      Object.keys(timeMap).forEach(col => {
        const cell = row[parseInt(col)];
        if (!cell || DAYS.indexOf(cell) > -1) return;
        schedule[day].push({ time: timeMap[parseInt(col)], ...parseSubject(cell) });
      });
    }

    out.rooms[anchor.roomNum] = { roomName, roomInfo: anchor.info, timeSlots, schedule };
  });

  return out;
}

// GET current timetable
router.get('/', async (req, res) => {
  const [rows] = await pool.execute(
    'SELECT filename, data FROM timetables ORDER BY uploaded_at DESC LIMIT 1'
  );
  if (rows.length === 0) return res.json({ filename: null, data: null });
  res.json({ filename: rows[0].filename, data: JSON.parse(rows[0].data) });
});

// POST upload + parse + conflict check
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];

    const mergeMap = {};
    (sheet['!merges'] || []).forEach(m => {
      const src = sheet[XLSX.utils.encode_cell(m.s)];
      const val = src && src.v !== undefined ? src.v : null;
      for (let r = m.s.r; r <= m.e.r; r++) {
        for (let c = m.s.c; c <= m.e.c; c++) {
          mergeMap[`${r},${c}`] = val;
        }
      }
    });

    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    const rows = raw.map((row, r) =>
      row.map((cell, c) => {
        if (cell !== null && cell !== '') return String(cell).trim();
        const v = mergeMap[`${r},${c}`];
        return v !== null && v !== undefined ? String(v).trim() : null;
      })
    );

    const parsed = parseTimetable(rows);

    // Save timetable
    await pool.execute(
      'INSERT INTO timetables (filename, data) VALUES (?, ?)',
      [req.file.originalname, JSON.stringify(parsed)]
    );

    // Conflict check against existing bookings
    const [bookings] = await pool.execute(
      "SELECT * FROM BookingTest WHERE status IN ('reserved','occupied')"
    );

    const conflicts = [];
    for (const room of Object.keys(parsed.rooms)) {
      const schedule = parsed.rooms[room].schedule;
      for (const day of Object.keys(schedule)) {
        for (const cls of schedule[day]) {
          const match = bookings.find(b =>
            b.room === room && b.period_time === cls.time
          );
          if (match) {
            conflicts.push({
              room,
              username: match.username,
              date: match.date_in,
              bookingPeriod: match.period_time,
              subject: cls.subject || cls.raw,
              bookingId: match.id,
            });
          }
        }
      }
    }

    res.json({ success: true, filename: req.file.originalname, data: parsed, conflicts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT cancel conflicting bookings
router.put('/cancel-conflicts', async (req, res) => {
  const { bookingIds } = req.body;
  if (!bookingIds || bookingIds.length === 0) {
    return res.json({ cancelledCount: 0 });
  }

  const placeholders = bookingIds.map(() => '?').join(',');
  const [result] = await pool.execute(
    `UPDATE BookingTest SET status = 'cancelled' WHERE id IN (${placeholders})`,
    bookingIds
  );

  res.json({ cancelledCount: result.affectedRows });
});

// DELETE timetable
router.delete('/', async (req, res) => {
  await pool.execute('DELETE FROM timetables');
  res.json({ success: true });
});

module.exports = router;