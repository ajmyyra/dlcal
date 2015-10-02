var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.render('index', { title: 'Calendar with deadlines', headline: 'dlCal - Calendar with deadlines' });
});

module.exports = router;
