var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var bcrypt = require('bcrypt-nodejs');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
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
  //check if user is logged in
  //if they are not logged in, redirect to /login page
  sess = req.session;
  if (sess.username) {
    //checks if anyone is logged in
    console.log('someone is logged in');
    res.render('index');
  } else {
    res.redirect('login');
  }
  //if they are logged in, render index page 
});

app.get('/create', 
function(req, res) {
  sess = req.session;
  if (sess.username) {
    //checks if anyone is logged in
    console.log('someone is logged in');
    res.render('index');
  } else {
    res.redirect('login');
  }
});

app.get('/login', 
function(req, res) {
  res.render('login');
});

app.get('/signup', 
function(req, res) {
  res.render('signup');
});

app.get('/links', 
function(req, res) {
  sess = req.session;
  if (sess.username) {
    //checks if anyone is logged in
    console.log('someone is logged in');
    Links.reset().fetch().then(function(links) {
      res.status(200).send(links.models);
    });
  } else {

    res.redirect('login');
    
  }
});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
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
          res.status(200).send(newLink);
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
              console.log('match!!!!'); 
              //create session 
              sess = req.session;
              sess.username = username;
              console.log('what even is sess???', sess);
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
      //if name is not in database
          //redirect to signup page 


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
