var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UserSchema = new Schema({
    username: String,
    password: String,
    salt: String,
    email: String,
    created: Date,
    changed: Date
});

module.exports = mongoose.model('User', UserSchema);