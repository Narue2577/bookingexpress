const fs = require('fs');
const path = require('path');

const locales = {
  en: JSON.parse(fs.readFileSync(path.join(__dirname, '../locales/en.json'))),
  th: JSON.parse(fs.readFileSync(path.join(__dirname, '../locales/th.json'))),
  ch: JSON.parse(fs.readFileSync(path.join(__dirname, '../locales/ch.json'))),
};

function langMiddleware(req, res, next) {

  //  console.log('🌐 langMiddleware running for:', req.path); // TEMP DEBUG

  // Priority: query param > cookie > default 'en'
  const lang = req.query.lang || req.cookies.lang || 'th';
  const validLang = locales[lang] ? lang : 'en';

  if (req.query.lang) {
    res.cookie('lang', validLang, { maxAge: 1000 * 60 * 60 * 24 * 365 }); // remember for 1 year
  }

  res.locals.lang = validLang;
  res.locals.t = (key) => locales[validLang][key] || key;
  next();
}

module.exports = langMiddleware;