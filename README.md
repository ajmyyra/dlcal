# dlCal - Calendar software with focus on deadlines

Just a quick MEAN (MongoDB, Express, Angular, Node.js) app project 
for the course Mobile Cloud Computing in Aalto University.

Configuration is stored in config.js, so you'll need one too. Here's an example:

module.exports = {
    'secret': 'therearetoofewnomihoudaisinfinland',
    'database': 'mongodb://localhost:27017/dlcal'
}

## Known bugs
* Timezones! Times are added as UTC times, but MongoDB searches them with a proper timezone.
    * Should save them into correct timezone.

## Features in development
* Shared events you can add to your friends calendar? Maybe!
* Email when a deadline is closing in?
    * Your normal calendar isn't as creepy as it should be when you need to be intimidated into doing things!

## Installation

Below are instructions to install dlCal on a new Ubuntu server.
Remember that on small instances mongodb might need a smallfiles config option (smallfiles = true).

```
sudo apt-get update
sudo apt-get upgrade
sudo reboot
sudo apt-get install mongodb nodejs npm git
git clone https://github.com/ajmyyra/dlcal.git
cd dlcal
npm install
```

We'll use pm2 application manager to run the program. In actual setups we should have a proxy server between us and the Interwebs.
Find more from https://www.digitalocean.com/community/tutorials/how-to-set-up-a-node-js-application-for-production-on-ubuntu-14-04

Install pm2 as shown below. Before actually running the app (pm2 start) remember to create your own config.js with correct settings.

```
sudo npm install pm2 -g
sudo ln -s /usr/bin/nodejs /usr/local/bin/node
pm2 start bin/www
```

Enjoy your very own dlCal setup!

## Setting up

The system is somewhat self-explanatory. Once running, you'll need to register in order to start creating events.

We now have a single-page app with Angular as well. Just go to / of the server to see the UI.

### Registering

You can register to dlCal with a POST request to /api/register
Username, password and email address are required for registration and should be provided in message body.
All passwords are salted and hashed immediately, so we can't tell you your password, sorry!

### Authenticating

dlCal uses JSON Web Tokens to authenticate users. Tokens expire in two hours.

To authenticate, send a POST request to /api/authenticate
You'll need to provide your username and a matching password in message body.
Once accepted, you'll receive a token that you can use when using the service.

JSON Web Token should be given in message headers as x-access-token. With this, you can use the API.

## Using the API

### /api/events

You can list all your events with a simple GET to /api/events.

To create a new event, just POST to the same URL. You can provide the following information.
* name: Title of your event, e.g. 'Birthday party for Joel'
* description: A better, longer description of the event.
* startTime: When the event is starting? Correct form for times is '2015-24-12T14:00'
* endTime: When the event is ending.
* deadline: When all preparations for this event should be done. Handy when you need to get something done early before the event.

#### /api/events/id

To check only one specific event, you can use its id (given in events listing) with GET /api/events/id
Within the same URL, you can change the event with PUT request. Just provide the fields you want to change, others remain unchanged.
It is also possible to delete the event, just by posting DELETE to the same URL.

#### /api/events/search

You can search events by specific date, month or year. To list all the events in May 2016,
just GET /api/events/search/2015/05 . You can include a specific date (/api/events/search/2015/05/21)
or just use the year.

#### /api/events/deadlines

See what you need to do next with dlCal's deadlines feature. With GET to this URL, you'll get your 5 next deadlines.
Just in case you run out of things to do.

### /api/user

We all have those Monday mornings when we can't even remember our email address.
You can check your information any time with a GET to /api/user .

You can change your information with a PUT request.
As with events, just provide the information you wish to change.


Our service has just launched and the web app should be coming in a few weeks. Until then, have fun with the API!
