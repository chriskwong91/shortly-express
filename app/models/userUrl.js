var db = require('../config');
var Promise = require('bluebird');
var link = require('./link');

var userUrl = db.Model.extend({
  tableName: 'userUrls',

  initialize: function() {
    this.on('creating', function(model, attrs, options) {
      var userId = model.get('userId');
      var urlId = model.get('urlId');
    });
  }

});

module.exports = userUrl;



/*



*/