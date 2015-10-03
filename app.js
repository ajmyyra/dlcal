var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var jwt = require('jsonwebtoken');
var api = express.Router();
var routes = express.Router();

var config = require('./config');
var Event = require('./models/event');
var User = require('./models/user');

var app = express();
mongoose.connect(config.database);

app.set('protectedSecret', config.secret);
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

routes.get('/', function(req, res) {
    res.render('index', { title: 'Calendar with deadlines', headline: 'dlCal - Calendar with deadlines' });
});

routes.get('/initialSetup', function(req, res) { // TODO Remove when we can create users
    var testuser = new User({
        username: 'testuser',
        password: 'testPassword',
        email: 'test@example.com'
    });
    testuser.created = new Date();
    testuser.changed = new Date();

    testuser.save(function(err) {
        if (err)
            res.send(err);

        console.log('Initial setup done succesfully.');
        res.json({ success: 'true', message: 'Setup done succesfully!' });
    });
});

api.post('/authenticate', function(req, res) {
    User.findOne({
        username: req.body.username
    }, function(err, user) {
        if (err)
            res.send(err);

        if (!user) {
            res.status(401); // Unauthorized
            res.json({ success: false, message: 'Authentication failed. Wrong username or password.'});
        }
        else {

            if (user.password != req.body.password) {
                console.log('Login with wrong password for user ' + user.username)
                res.status(401);
                res.json({ success: false, message: 'Authentication failed. Wrong username or password.'});
            }
            else {
                console.log('User logged in: ' + user.username)

                var newToken = jwt.sign(user, app.get('protectedSecret'), {
                    expiresIn: 7200 // 2 hour expiration
                });

                res.json({ success: true, message: 'Accepted, you can now use the API.', token: newToken });
            }
        }
    });
});

// Verifying user token
api.use(function(req, res, next) {
    var token = req.body.token || req.query.token || req.headers['x-access-token'];

    if (token) {
        jwt.verify(token, app.get('protectedSecret'), function(err, decoded) {
            if (err) {
                res.status(403);
                return res.json({ success: false, message: 'Failed to authenticate given token.' });
            }
            else {
                req.decoded = decoded;
                next();
            }
        });
    }
    else {
        res.status(403);
        return res.json({ success: false, message: 'No token provided' });
    }
});

api.get('/', function(req, res) {
    res.json({ message: 'Here is our calendar API!\nSo far it provides CRUD actions for calendar events.' });
});

api.route('/user')// TODO When we can create users, change this to show user information. Don't show password.
    .get(function(req, res) {
        User.find(function(err, users) {
            if (err)
                res.send(err);

            res.json(users);
        });
    });

api.route('/events')

    .post(function(req, res) {
        var event = new Event();
        event.name = req.body.name;
        event.description = req.body.description;
        event.startTime = req.body.startTime;
        event.endTime = req.body.endTime;
        event.deadline = req.body.deadline;
        event.added = new Date();
        event.changed = new Date();

        event.save(function(err) {
            if (err)
                res.send(err);

            console.log('New event created.')
            res.json({ success: 'true', message: 'New event created!' });
        });
    })

    .get(function(req, res, next) {
        Event.find(function(err, events) {
            if (err)
                res.send(err);

            events.sort(function(a,b){return a.startTime - b.startTime});
            res.json(events);
        });
    });

api.route('/events/deadlines')

    .get(function(req, res, next) {
        Event.find(function(err, events) {
            if (err)
                res.send(err);

            events.sort(function(a,b){return a.deadline - b.deadline});
            res.json(events);
        });
    });

api.route('/events/:event_id')

    .get(function(req, res, next) {
        Event.findById(req.params.event_id, function(err, event) {
            if (err)
                res.send(err);

            if (!event) {
                res.status(404);
                res.json({ message: 'Event not found.' });
            }
            else {
                res.json(event);
            }
        })
    })

    .put(function(req, res, next) {
        Event.findById(req.params.event_id, function(err, event) {
            if (err)
                res.send(err);

            if (!event) {
                res.status(404);
                res.json({ message: 'Event not found.' });
            }
            else {
                event.name = req.body.name;
                event.description = req.body.description;
                event.startTime = req.body.startTime;
                event.endTime = req.body.endTime;
                event.deadline = req.body.deadline;
                event.changed = new Date();

                event.save(function(err) {
                    if (err)
                        res.send(err);

                    console.log('Event updated.')
                    res.json({ success: 'true', message: 'Event updated!' });
                });
            }
        });
    })

    .delete(function(req, res, next) {
        Event.findById(req.params.event_id, function(err, event) {
            if (err)
                res.send(err);

            if (!event) {
                res.status(404);
                res.json({ message: 'Event not found.' })
            }
            else {
                Event.remove({
                    _id: req.params.event_id
                }, function(err, event) {
                    if (err)
                        res.send(err);

                    console.log('Event deleted.')
                    res.json({ success: 'true', message: 'Event succesfully deleted.' });

                });
            }
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