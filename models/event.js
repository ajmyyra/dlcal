var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var EventSchema = new Schema({
    name: String,
    description: String,
    startTime: Date,
    endTime: Date,
    deadline: Date
});

module.exports = mongoose.model('Event', EventSchema);