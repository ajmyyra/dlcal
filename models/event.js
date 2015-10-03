var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var EventSchema = new Schema({
    name: String,
    description: String,
    startTime: Date,
    endTime: Date,
    deadline: Date,
    added: Date,
    changed: Date
});

module.exports = mongoose.model('Event', EventSchema);