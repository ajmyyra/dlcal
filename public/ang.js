;(function(){
    function authInterceptor(API, auth) {
        return {
            // Automatically attach token to requests, if we have one
            request: function(config) {
                var token = auth.getToken();
                if (config.url.indexOf(API) === 0 && token) {
                    config.headers.Authorization = token;
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
            var url;
            if (arguments.length == 1) { // Just the year
                $url = API + '/events/search/' + year;
            }
            else if (arguments.length == 2) { // Year and month
                $url = API + '/events/search/' + year + '/' + month;
            }
            else if (arguments.length == 3) { // Year, month and date
                $url = API + '/events/search/' + year + '/' + month + '/' + day;
            }
            else { // No arguments given, return everything
                $url = API + '/events';
            }

            return $http.get($url);
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

    function MainCtrl($scope, $route, $routeParams, $window, user, auth, cal) {
        var self = this;

        function handleRequest(res) {
            var token = res.data ? res.data.token : null;
            self.message = res.data.message;
        }

        $scope.eventSources = [];

        self.login = function() {
            user.login(self.username, self.password)
                .then(function(res) {
                    self.getDeadlines();
                    $scope.username = self.username;
                });
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

        // Controller deadlines for calendar service
        self.getDeadlines = function() {
            cal.getDeadlines()
                .then(function(res) {
                    $scope.deadlines = self.modifyToFullcalForm(res.data);

                    $scope.monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
                    ];

                })
        }

        // Controller events for calendar service
        self.getEvents = function() {
            cal.getEvents()
                .then(function(res) {
                    $scope.events = self.modifyToFullcalForm(res.data);
                    $scope.eventSources = [{
                        'events': $scope.events
                    }];

                    $scope.monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
                    ];
                })
        }

        self.modifyToFullcalForm = function(backendEvents) {
            // http://fullcalendar.io/docs/event_data/Event_Object/
            return backendEvents.map(function (obj) {
                return {
                    "id": obj._id,
                    "title": obj.name,
                    "start": new Date(obj.startTime),
                    "end": new Date(obj.endTime),
                    "description": obj.description,
                    "deadline": new Date(obj.deadline),
                    "allDay": false
                }
            });
        }

        self.addEvent = function() {
            return cal.addEvent(self.name, self.description, self.startTime, self.endTime, self.deadline)
                .then(function(res) {
                    $window.location.href = "/";
                });
        }

        self.timeUntil = function(timeObj) {
            var current = new Date();
            var difference = Math.round((timeObj.getTime() - current.getTime()) / (1000*3600*24));
            return difference;
        }

        self.calendarView = 'month';
        self.calendarDay = new Date();

        if (self.isAuthed()) {
            self.getDeadlines();
            self.getEvents();
        }

    }

    function EditCtrl($scope, $route, $routeParams, $window, user, auth, cal) {
        var self = this;

        $scope.event = [];

        self.modifyEvent = function() {
            var event = $scope.event;
            return cal.modifyEvent(event._id, event.name, event.description, event.startTime, event.endTime, event.deadline)
                .then(function(res) {
                    $window.location.href = '/';
                })
        }

        self.deleteEvent = function() {
            var event = $scope.event;
            return cal.deleteEvent(event._id)
                .then(function(res) {
                    $window.location.href = "/";
                })
        }

        self.getEvent = function() {
            return cal.getEvent($routeParams.eventId)
                .then(function(res) {
                    $scope.event = res.data;
                })
        }

        if (auth.isAuthed() && $routeParams.eventId) {
            self.getEvent();
        }
    }

    angular.module('ang', ['ngRoute', 'ui.calendar'])
        .factory('authInterceptor', authInterceptor)
        .service('user', userService)
        .service('auth', authService)
        .service('cal', calService)
        .directive('ngReallyClick', [function() {
            return {
                restrict: 'A',
                link: function(scope, element, attrs) {
                    element.bind('click', function() {
                        var message = attrs.ngReallyMessage;
                        if (message && confirm(message)) {
                            scope.$apply(attrs.ngReallyClick);
                        }
                    });
                }
            }
        }])
        .constant('API', '/api')
        .config(['$httpProvider', '$routeProvider', function($httpProvider, $routeProvider) {
            $httpProvider.interceptors.push('authInterceptor');

            $routeProvider
                .when('/', {
                    templateUrl : 'deadlines.html',
                    controller  : 'Main'
                })
                .when('/events', {
                    templateUrl : 'events.html',
                    controller  : 'Main'
                })
                .when('/calendar', {
                    templateUrl : 'calendar.html',
                    controller  : 'Main'
                })
                .when('/add', {
                    templateUrl : 'add.html',
                    controller  : 'Main'
                })
                .when('/view/:eventId', {
                    templateUrl : 'view.html'
                })
                .when('/edit/:eventId', {
                    templateUrl : 'edit.html'
                })
                .when('/remove/:eventId', {
                    templateUrl : 'remove.html'
                });
        }])
        .controller('Main', MainCtrl)
        .controller('Edit', EditCtrl)
})();