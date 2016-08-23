var db = require('../config');
var userUrl = require('../models/userUrl');

var UserUrls = new db.Collection();

UserUrls.model = userUrl;

module.exports = UserUrls;
