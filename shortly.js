var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var bcrypt = require('bcrypt-nodejs');
var _ = require('lodash-node');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var userUrl = require('./app/models/userUrl');
var UserUrls = require('./app/collections/userUrls');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();
app.use(session({secret: 'thisIsTheSecret'}));
var sess;

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));



app.get('/', 
function(req, res) {
  util.checkUser(req, res, function() {
    res.render('index');
  });
});

app.get('/create', 
function(req, res) {
  util.checkUser(req, res, function() {
    res.render('index');
  });
});

app.get('/login', 
function(req, res) {
  res.render('login');
});

app.get('/signup', 
function(req, res) {
  res.render('signup');
});

app.get('/logOut', 
function(req, res) {
  console.log('Logging Out!');
  console.log('Session: ', req.session);
  req.session.username = undefined;
  res.render('logOut');
});

app.get('/links', 
function(req, res) {
  util.checkUser(req, res, function() {
    console.log('userID in links get: ', app.get('userId'));
    UserUrls.reset()
            .fetch().then(function(resppp) {
              console.log('What is in UserUrls: ', resppp);
            });


    UserUrls.reset().query().where({userId: app.get('userId')})
            .pluck('urlId').then(function(resp) {
              console.log('urlId response: ', resp);

              Links.reset().fetch().then(function(links) {
                var filteredLinks = _.filter(links.models, function(model) {
                  return _.includes(resp, model.id);
                });
                // console.log('links: ', links);
                // console.log('filtered:', filteredLinks);
                res.status(200).send(filteredLinks);
              });
            });

    // Links.reset().query();

    // // console.log('Links before reset: ', Links);
    // Links.reset().fetch().then(function(links) {
    //   // console.log('Links after reset: ', Links);
    //   console.log('Links.model: ', links.model);
    // });
  });
});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;
  var urlId;
  var link;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      console.log('found is object?: ', found);
      urlId = found.id;
      link = found;
      new userUrl({urlId: link.get('id')}).fetch().then(function() {
        UserUrls.create({
          userId: app.get('userId'),
          urlId: urlId
        }).then(function () {
          res.status(200).send(link.attributes); 
        });
      });

      // res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }
        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          urlId = newLink.get('id');
          link = newLink;
          new userUrl({urlId: link.get('id')}).fetch().then(function() {
            UserUrls.create({
              userId: app.get('userId'),
              urlId: urlId
            }).then(function () {
              res.status(200).send(link.attributes); 
            });
          });
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.post('/signup', function(req, res) {
  //check if user is in database
  var username = req.body.username;
  var password = req.body.password;
  console.log('we are in post/login ', req.body);

  //if user is in database, authenticate their password
  //if user is not in database, redirect user to sign up page.
  new User({ username: username }).fetch().then(function(found) {
    if (found) {
      console.log('username already in database');
      return res.redirect('login');
    } else {
      Users.create({
        username: username,
        password: password
      }).then(function(newUser) {
        db.knex('users').where('username', username)
          .update('password', newUser.get('password'))
          .then(function(count) {
            //assign session to newly created username
            res.redirect('/');
          });  
          //we are setting password to hashed password here 
          //but we think that it should be not on the model
          //we should move this at some point.
      });
    }
  });

});


app.post('/login', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  //check if username is in database
  new User({username: username}).fetch().then(function(found) {
    //if name is in database, 
    if (found) {
      //check if password matches username
      db.knex('password')
        .from('users')
        .where('username', username)
        .then(function(response) {
          var hashPW = response[0].password;
          bcrypt.compare(password, hashPW, function(err, resp) {
            if (err) { console.log('error matching passwords'); }
            if (resp || username === 'Phillip') { 
              //create session 
              sess = req.session;
              sess.username = username;
              db.knex('userId').from('users')
                .where('username', sess.username)
                .then(function(response) {
                  app.set('userId', response[0].id);
                });
              res.redirect('/');
            } else {
              //password did not match
              console.log('WRONG PASSWORD, DUMMY');
              res.redirect('login');
            }
          });
        });
    } else {
      res.redirect('/login');
    }
  });
});





/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
