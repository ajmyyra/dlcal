var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var api = express.Router();

var routes = require('./routes/index');
var Event = require('./models/event');

var app = express();
mongoose.connect('mongodb://localhost:27017/dlcal');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon(path.join(__dirname, 'public', 'favicon.png')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/api', api);

api.get('/', function(req, res, next) {
    res.json({ message: 'Here is our calendar API!\nSo far it provides CRUD actions for calendar events.' });
});

api.route('/events')

    .post(function(req, res, next) {
        console.log("New POST for event!"); // debug
        var event = new Event();
        event.name = req.body.name;
        event.description = req.body.description;
        event.startTime = req.body.startTime;
        event.endTime = req.body.endTime;
        event.deadline = req.body.deadline;

        event.save(function(err) {
            if (err)
                res.send(err);

            res.json({ message: 'New event created!' });
        });
    })

    .get(function(req, res, next) {
        Event.find(function(err, events) {
            if (err)
                res.send(err);

            res.json(events);
        });
    });

api.route('/events/:event_id')

    .get(function(req, res, next) {
        Event.findById(req.params.event_id, function(err, event) {
            if (err)
                res.send(err);

            res.json(event);
        })
    })

    .put(function(req, res, next) {
        Event.findById(req.params.event_id, function(err, event) {
            if (err)
                res.send(err);

            event.name = req.body.name;
            event.description = req.body.description;
            event.startTime = req.body.startTime;
            event.endTime = req.body.endTime;
            event.deadline = req.body.deadline;

            event.save(function(err) {
                if (err)
                    res.send(err);

                res.json({ message: 'Event updated!' });
            });
        });
    })

    .delete(function(req, res, next) {
        Event.remove({
            _id: req.params.event_id
        }, function(err, event) {
            if (err)
                res.send(err);

            res.json({ message: 'Event succesfully deleted.' });
        });
    });

app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});


if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
