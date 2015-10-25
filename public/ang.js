;(function(){
    function authInterceptor(API, auth) {
        return {
            // Automatically attach token to requests, if we have one
            request: function(config) {
                var token = auth.getToken();
                if (config.url.indexOf(API) === 0 && token) {
                    config.headers.Authorization = 'x-access-token ' + token;
                }

                return config;
            },

            // If a token was sent back, we'll save it
            response: function(res) {
                if (res.config.url.indexOf(API) === 0 && res.data.token) {
                    auth.saveToken(res.data.token);
                }

                return res;
            },
        }
    }

    function authService($window) {
        var self = this;

        self.parseJwt = function(token) {
            var base64url = token.split('.')[1];
            var base64 = base64url.replace('-', '+').replace('_', '/');
            return JSON.parse($window.atob(base64));
        }

        self.saveToken = function(token) {
            $window.localStorage['jwtToken'] = token;
        }

        self.getToken = function() {
            return $window.localStorage['jwtToken'];
        }

        self.isAuthed = function() {
            var token = self.getToken();
            if (token) {
                var params = self.parseJwt(token);
                return Math.round(new Date().getTime() / 1000) <= params.exp;
            }
            else {
                return false;
            }
        }

        self.logout = function () {
            $window.localStorage.removeItem('jwtToken');
        }
    }

    function userService($http, API, auth) {
        var self = this;

        self.login = function(username, password) {
            return $http.post(API + '/authenticate', {
                username: username,
                password: password
            })
        },

        self.register = function(username, password, email) {
            return $http.post(API + '/register', {
                username: username,
                password: password,
                email: email
            })
        }

    }

    function calService($http, API) {
        var self = this;

        self.getEvents = function(year, month, day) {
            if (arguments.length == 1) { // Just the year
                return $http.get(API + '/events/search/' + year);
            }
            else if (arguments.length == 2) { // Year and month
                return $http.get(API + '/events/search/' + year + '/' + month);
            }
            else if (arguments.length == 3) { // Year, month and date
                return $http.get(API + '/events/search/' + year + '/' + month + '/' + day);
            }
            else { // No arguments given, return everything
                return $http.get(API + '/events');
            }
        }

        self.getDeadlines = function() { // Get 5 (or less) next deadlines
            return $http.get(API + '/events/deadlines');
        }

        self.getEvent = function(eventId) { // Get a single event
            return $http.get(API + '/events/' + eventId);
        }

        self.addEvent = function(name, description, startTime, endTime, deadline) {
            return $http.post(API + '/events', {
                name: name,
                description: description,
                startTime: startTime,
                endTime: endTime,
                deadline: deadline
            })
        }

        self.modifyEvent = function(eventId, name, description, startTime, endTime, deadline) {
            return $http.put(API + '/events/' + eventId, {
                name: name,
                description: description,
                startTime: startTime,
                endTime: endTime,
                deadline: deadline
            })
        }

        self.deleteEvent = function(eventId) {
            return $http.delete(API + '/events/' + eventId);
        }
    }

    function MainCtrl(user, auth, cal) {
        var self = this;

        function handleRequest(res) {
            var token = res.data ? res.data.token : null;
            // if(token) { console.log('JWT:', token); } // For login debugging
            self.message = res.data.message;
        }

        self.login = function() {
            user.login(self.username, self.password)
                .then(handleRequest, handleRequest)
        }
        self.register = function() {
            user.register(self.username, self.password, self.email)
                .then(handleRequest, handleRequest);
        }

        self.logout = function() {
            auth.logout && auth.logout()
        }
        self.isAuthed = function() {
            return auth.isAuthed ? auth.isAuthed() : false
        }

        // Controller events for calendar service
        self.getEvents = function() {
            return cal.getEvents(self.year, self.month, self.day)
                .then(handleRequest, handleRequest)
        }
        self.getDeadlines = function() {
            return cal.getDeadlines()
                .then(handleRequest, handleRequest)
        }
        self.getEvent = function() {
            return cal.getEvent(self.eventId)
                .then(handleRequest, handleRequest)
        }
        self.addEvent = function() {
            return cal.addEvent(self.name, self.description, self.startTime, self.endTime, self.deadline)
                .then(handleRequest, handleRequest)
        }
        self.modifyEvent = function() {
            return cal.modifyEvent(self.eventId, self.name, self.description, self.startTime, self.endTime, self.deadline)
                .then(handleRequest, handleRequest)
        }
        self.deleteEvent = function() {
            return cal.deleteEvent(self.eventId)
                .then(handleRequest, handleRequest)
        }

        self.calendarView = 'month';
        self.calendarDay = new Date();
    }

    angular.module('ang', [])
        .factory('authInterceptor', authInterceptor)
        .service('user', userService)
        .service('auth', authService)
        .service('cal', calService)
        .constant('API', '/api')
        .config(function($httpProvider) {
            $httpProvider.interceptors.push('authInterceptor');
        })
        .controller('Main', MainCtrl)
})();