var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var jwt = require('jsonwebtoken');
var crypto = require('crypto');
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

routes.get('/initialSetup', function(req, res) { // TODO For testing, add events
    var testuser = new User({
        username: 'testuser',
        email: 'test@example.com'
    });
    testuser.created = new Date();
    testuser.changed = new Date();

    var cleartextpw = 'testBuzzword';
    testuser.salt = crypto.randomBytes(128).toString('base64'); // creating salt from random bytes
    crypto.pbkdf2(cleartextpw, testuser.salt, 10000, 512, function(err, hashedKey) { // hashing the password with salt
        if (err)
            res.send(err);

        testuser.password = hashedKey;

        testuser.save(function(err) {
            if (err)
                res.send(err);

            console.log('Initial setup done succesfully.');
            return res.json({ success: 'true', message: 'Setup done succesfully!' });
        });
    });


});

api.post('/register', function(req, res) {
    if (!req.body.username || !req.body.password || !req.body.email) {
        res.status(400); // Bad request
        return res.json({ success: 'false', message: 'Missing username, password or email for new user.' });
    }

    User.findOne({
        username: req.body.username
    }, function(err, user) {
        if (err)
            res.send(err);
        if (user) {
            res.status(409); // Conflict
            return res.json({ success: 'false', message: 'Username already exists.'});
        }
        else {
            var newUser = new User();
            newUser.username = req.body.username;
            newUser.email = req.body.email;
            newUser.created = new Date();
            newUser.changed = new Date();

            newUser.salt = crypto.randomBytes(128).toString('base64'); // creating salt from random bytes
            crypto.pbkdf2(req.body.password, newUser.salt, 10000, 512, function(err, hashedKey) { // hashing the password with salt
                if (err)
                    res.send(err);

                newUser.password = hashedKey;

                newUser.save(function(err) {
                    if (err)
                        res.send(err);

                    console.log('Registered a new user: ' + newUser.username);
                    return res.json({ success: 'true', message: 'Registration succesful!' });
                });
            });
        }
    });
});

api.post('/authenticate', function(req, res) {
    if (!req.body.username || !req.body.password) {
        res.status(400); // Bad request
        return res.json({ success: false, message: 'Authentication failed. Username or password not provided.' });
    }

    User.findOne({
        username: req.body.username
    }, function(err, user) {
        if (err)
            res.send(err);

        if (!user) {
            res.status(401); // Unauthorized
            return res.json({ success: false, message: 'Authentication failed. Wrong username or password.'});
        }
        else {

            crypto.pbkdf2(req.body.password, user.salt, 1000, 512, function(err, hashedKey) {
                if (user.password != hashedKey) {
                    console.log('Login with wrong password for user ' + user.username)
                    res.status(401);
                    return res.json({ success: false, message: 'Authentication failed. Wrong username or password.'});
                }
                else {
                    console.log('User logged in: ' + user.username)

                    var newToken = jwt.sign( {user: user.username}, app.get('protectedSecret'), {
                        expiresIn: 7200 // 2 hour expiration
                    });

                    return res.json({ success: true, message: 'Accepted, you can now use the API.', token: newToken });
                }
            })

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
    return res.json({ message: 'Here is our calendar API!\nSo far it provides CRUD actions for calendar events and deadlines.' });
});

api.route('/user')
    .put(function(req, res) {
        User.findOne( {
            username: req.decoded.user
        } , function(err, user) {
            if (err)
                res.send(err);


            if (req.body.email) {
                user.email = req.body.email;
            }
            user.changed = new Date();

            if (req.body.password) {
                user.salt = crypto.randomBytes(128).toString('base64'); // creating salt from random bytes
                crypto.pbkdf2(req.body.password, user.salt, 10000, 512, function(err, hashedKey) { // hashing the password with salt
                    if (err)
                        res.send(err);

                    user.password = hashedKey;

                    user.save(function(err) {
                        if (err)
                            res.send(err);

                        console.log('User information updated.')
                        return res.json({ success: 'true', message: 'User information updated!' });
                    });
                });
            }
            else {
                user.save(function(err) {
                    if (err)
                        res.send(err);

                    console.log('User information updated.')
                    return res.json({ success: 'true', message: 'User information updated!' });
                });
            }
        });
    })

    .get(function(req, res) {
        User.findOne( {
            username: req.decoded.user
        } , function(err, user) {
            if (err)
                res.send(err);

            return res.json({ username: user.username, email: user.email, created: user.created, changed: user.changed });
        });
    });


api.route('/events')

    .post(function(req, res) {
        var event = new Event();
        event.user = req.decoded.user;
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
            return res.json({ success: 'true', message: 'New event created!' });
        });
    })

    .get(function(req, res, next) { // TODO search only those created by user, example: deadlines
        Event.find(function(err, events) {
            if (err)
                res.send(err);

            events.sort(function(a,b){return a.startTime - b.startTime});
            return res.json(events);
        });
    });

api.route('/events/deadlines')

    .get(function(req, res) {
        Event.find( {
            "deadline": {"$gte": new Date()},
            "user": req.decoded.user
        }, function(err, events) {
            if (err)
                res.send(err);

            events.sort(function(a,b){return a.deadline - b.deadline});
            res.json(events);
        }).sort( { deadline: 1 } ).limit(5);
    });

api.get('/events/search', function(req, res) {
    res.status(400); // Bad request
    return res.json({ message: 'No search parameters provided.' });
});

api.get('/events/search/:year', function(req, res) { // Full year (2014, 2015, ...)

    var year = req.params.year;
    Event.find( { // TODO search only those created by user, example: deadlines
        "startTime": {"$gte": new Date(year, 0, 0, 00, 00), "$lt": new Date(year, 11, 31, 24, 00)}
    }, function(err, events) {
        if (err)
            res.send(err);

        res.json(events);

    })
});

api.get('/events/search/:year/:month', function(req, res) { // Months (1-12)

    var year = req.params.year;
    var month = req.params.month - 1; // Because Date(), http://www.w3schools.com/jsref/jsref_obj_date.asp
    Event.find( {
        "startTime": {"$gte": new Date(year, month, 1, 00, 00), "$lt": new Date(year, month, 31, 23, 59)}
    }, function(err, events) {
        if (err)
            res.send(err);

        res.json(events);

    })
});

api.get('/events/search/:year/:month/:day', function(req, res) { // Days (1-31)

    var year = req.params.year;
    var month = req.params.month - 1; // Because Date(), http://www.w3schools.com/jsref/jsref_obj_date.asp
    var day = req.params.day;
    Event.find( {
        "startTime": {"$gte": new Date(year, month, day, 00, 00), "$lt": new Date(year, month, day, 23, 59)}
    }, function(err, events) {
        if (err)
            res.send(err);

        res.json(events);

    })
});

api.route('/events/:event_id')

    .get(function(req, res) {
        Event.findById(req.params.event_id, function(err, event) {
            if (err)
                return res.send(err);

            if (!event) {
                res.status(404);
                res.json({ message: 'Event not found.' });
            }
            else {
                // TODO check if created by user
                return res.json(event);
            }
        })
    })

    .put(function(req, res) {
        Event.findById(req.params.event_id, function(err, event) {
            if (err)
                res.send(err);

            if (!event) {
                res.status(404);
                return res.json({ message: 'Event not found.' });
            }
            else { // TODO check if created by user
                if (req.body.name) event.name = req.body.name;
                if (req.body.description) event.description = req.body.description;
                if (req.body.startTime) event.startTime = req.body.startTime;
                if (req.body.endTime) event.endTime = req.body.endTime;
                if (req.body.deadline) event.deadline = req.body.deadline;
                event.changed = new Date();

                event.save(function(err) {
                    if (err)
                        res.send(err);

                    console.log('Event updated.');
                    return res.json({ success: 'true', message: 'Event updated!' });
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
                return res.json({ message: 'Event not found.' })
            }
            else {// TODO check if created by user
                Event.remove({
                    _id: req.params.event_id
                }, function(err, event) {
                    if (err)
                        res.send(err);

                    console.log('Event deleted.')
                    return res.json({ success: 'true', message: 'Event succesfully deleted.' });

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
