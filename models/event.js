var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var EventSchema = new Schema({
    user: String,
    name: String,
    description: String,
    startTime: Date,
    endTime: Date,
    deadline: Date,
    created: Date,
    changed: Date
});

module.exports = mongoose.model('Event', EventSchema);