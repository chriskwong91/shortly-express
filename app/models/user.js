var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
var link = require('./link');

var User = db.Model.extend({
  tableName: 'users',

  urls: function() {
    return this.hasMany(link);
  },

  initialize: function() {
    this.on('creating', function(model, attrs, options) {
      var username = model.get('username');
      var userPassword = model.get('password');
      // console.log('creating hash with password: ', userPassword);
      //bcrypt requires a callback as third argument, this progress
      //function is just a placeholder
      var progress = function() {};
      bcrypt.genSalt(10, function(err, salt) {
        if (err) {
          throw err;
        }
        bcrypt.hash(userPassword, salt, progress, function(error, hash) { 
          if (error) { 
            throw error;
          }
          model.set({password: hash});
        });
      });
    });
  }

});

module.exports = User;



/*



*/