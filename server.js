//server.js

var express = require('express');
var app = express();
var morgan = require('morgan')
var bodyParser = require('body-parser');



//Load configuration files
var dbconfig = require('./config/db');
var siteconfig = require('./config/site');
var userconfig = require('./config/admin');

var sitetitle = siteconfig.sitetitle;
var sitename = siteconfig.sitename;
var sitetag = siteconfig.sitetag;

var port = process.env.PORT || 3000;

var db = require('monk')(dbconfig.url);

app.use(express.static('./public'));
app.use(morgan('short'));

//But see this post: http://andrewkelley.me/post/do-not-use-bodyparser-with-express-js.html
app.use(bodyParser());

//Template configuration
app.set('view engine', 'jade')
app.set('views', './views')

//for DEV
app.locals.pretty = true;


//Admin username and password are loaded from config.admin.js
//eventually I'll set up a real configuration and registration process
var username = userconfig.username
var password = userconfig.password


//Set up MongoStore for session handling
var cookieParser = require('cookie-parser');

var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

app.use(cookieParser());

app.use(session({
	secret: 'baggins',
	store: new MongoStore({
		db: 'blog',
		host: '127.0.0.1',
		port: 27017
	})
}));



//RSS feed configuration
//Will put this into a separate module
RSS = require('feed');
feed = new RSS({
	title: "The Prosefectionist",
	description: "The Prosefectionist's blog feed.",
	link:        'http://prosefectionist.jit.su/',
    //image:       'http://example.com/image.png',
    copyright:   'All rights reserved 2014, Brendan Ritchie',
    //updated:     new Date(2013, 06, 14),                // optional, default = today
    author: {
        name:    'Brendan Ritchie',
        //email:   'johndoe@example.com',
        //link:    'https://example.com/johndoe'
    }
});

//Route for RSS feed
//Separate out this feed stuff into a module
app.get('/feed/?', function (req, res) {
	var blogposts = db.get('posts');
	blogposts.find({}, {limit:10, sort: {date: -1}}, function (error, posts) {
		posts.forEach(function(post) {
			console.log(post);
			feed.addItem({
				title: post.title,
				link: 'localhost:3000/#/post/' + post._id,
				description: post.body,
				author: {
					name: "Brendan Ritchie",
					},
				date: post.date
			});
		});
		res.contentType("application/rss+xml")
		res.send(feed.render('atom-1.0'));
	});
});


//Serve main template along with page titles
//page titles could potentialy be served from front end instead, but introduces complication because page titles are not displayed within an Angular view
app.get('/', function (req, res) {

	var blogposts = db.get('pages');

	//SORT BY SEQUENCE
	blogposts.find({}, ['shortname', 'sequence'], function(error, titles) {
		//console.log(titles);
		//apparently can't specify field and sort at same time with Monk
		titles.sort(sequential);
		//render index with some configuration and page titles
		res.render('index', {
			sitetitle: sitetitle,
			sitename: sitename,
			sitetag: sitetag,
			pages: titles
		});
	})
});


//Serve subview templates
//Probably will concatenate these eventually
app.get('/hometpl', function (req, res) {
	res.render('home');
});

app.get('/posttpl', function (req, res) {
	res.render('post');
});

app.get('/pagetpl', function (req, res) {
	res.render('page');
});

app.get('/formtpl', function (req, res) {
	res.render('form');
});

app.get('/pageformtpl', function (req, res) {
	res.render('pageform');
});

app.get('/logintpl', function (req, res) {
	res.render('login');
});

//I should write some middleware for authoirzation so I don't need to repeat the check on each relavant route

//Log in and log out
app.post('/login', function (req, res) {
	if (req.body.username === username && req.body.password === password) {
		req.session.admin = true;
		res.send('logged in');
	}
	else {
		res.send(401, 'unauthorized');
	}
});

app.get('/logout', function (req, res) {
	req.session.destroy();
	res.send('logged out');
});


//Log in and log out
app.get('/admintpl', function (req, res) {
	if (req.session.admin) {
		res.render('admin');
	}
	else {
		res.send(401, 'unauthorized');
	}
});



//Send a range of posts (for paging purposes)
app.get('/post/:from(\\d+)-:to(\\d+)', function(req, res) {
	var blogposts = db.get('posts');
	blogposts.find({}, {limit: (Math.abs(req.params.from - req.params.to) + 1), sort: {date: -1}, skip: (req.params.from - 1)}, function(error, posts) {
		//console.log(posts);
		res.send(posts);
	});
});

app.get('/postcount', function(req, res) {
	var blogposts = db.get('posts');
	blogposts.count({}, function(error, count) {
		//console.log(count);
		res.json(count);
	});	
});



app.get('/pagetitles', function(req, res) {
	var blogposts = db.get('pages');
	blogposts.find({},
		['shortname', 'sequence'],
		function(error, titles) {
			//console.log(titles),
			//sort the results by sequence - don't seem to be able to get a sort and specify fields at the same time with Monk
			titles.sort(sequential);
			//console.log(titles)
			res.json(titles);
	});	
})



//POST HANDLING

//Send all posts
//Need a proper paging system here
app.get('/post', function (req, res) {
	var blogposts = db.get('posts');
	blogposts.find({}, {sort: {date: -1}}, function (error, posts) {
		res.json(posts);
	});
});


//Send single post
app.get('/post/:id', function (req, res) {
	var blogposts = db.get('posts');
	blogposts.find({_id: req.params.id}, function (error, post) {
		res.json(post[0]);
	});
});


//Create new post and return it
app.post('/post', function (req, res) {
	if(req.session.admin) {
		var blogposts = db.get('posts');
		blogposts.insert({
			'title': req.body.title,
			'body': req.body.body,
			'date': new Date()
			}, function (err, doc) {
				//handle error as well
				res.json(doc);
			});
	}
	else {
		res.send(401, 'unauthorized');
	}
});


//Edit a post and return it
app.post('/post/:id', function (req, res) {
	if(req.session.admin) {
		var blogposts = db.get('posts');
		blogposts.update({_id: req.params.id}, {$set: {
			'title': req.body.title,
			'body': req.body.body
			}}, function (err, doc) {
				//add error handling here
				res.json(doc);
			});			
	}
	else {
		res.send(401, 'unauthorized');
	}
});


//Delete a post
app.delete('/post/:id', function (req, res) {
	if(req.session.admin) {
		var blogposts = db.get('posts');
		blogposts.remove({_id: req.params.id}, function (err, doc) {
			//Notify app of success or failure
		});
		var comments = db.get('comments');
		comments.remove({post: req.params.id}, function (err, doc) {
			//Notify app of success or failure
		});
	}
	else {
		res.send(401, 'unauthorized');
	}
});


//PAGE HANDLING

//Send single page
app.get('/page/:id', function (req, res) {
	var blogpages = db.get('pages');
	blogpages.find({_id: req.params.id}, function (error, page) {
		res.json(page[0]);
	});
});

//Create new page and return it
app.post('/page', function (req, res) {
	if(req.session.admin) {
		var blogpages = db.get('pages');
		//PUT THE PROPER PARAMETERS IN HERE
		blogpages.insert({
			'shortname': req.body.shortname,
			'longname': req.body.longname,
			'sequence': req.body.sequence,
			'body': req.body.body,
			'date': new Date()
			}, function (err, doc) {
				//handle error as well
				res.json(doc);
			});
	}
	else {
		res.send(401, 'unauthorized');
	}
});


//Edit a page and return it
app.post('/page/:id', function (req, res) {
	if(req.session.admin) {
		var blogpages = db.get('pages');
		blogpages.update({_id: req.params.id}, {$set: {
			'shortname': req.body.shortname,
			'longname': req.body.longname,
			'sequence': req.body.sequence,
			'body': req.body.body
			}}, function (err, doc) {
				//add error handling here
				res.json(doc);
			});			
	}
	else {
		res.send(401, 'unauthorized');
	}
});


//Delete a page
app.delete('/page/:id', function (req, res) {
	if(req.session.admin) {
		var blogpages = db.get('pages');
		blogpages.remove({_id: req.params.id}, function (err, doc) {
			//Notify app of error
		});
	}
	else {
		res.send(401, 'unauthorized');
	}	
});


//COMMENT HANDLING

//might also want a route for latest comments

//Send all comments for a post
app.get('/post/:postid/comment', function (req, res) {
	var comments = db.get('comments');
	comments.find({post: req.params.postid}, {sort: {date: 1}}, function (error, comments) {
		//console.log(comments);
		res.json(comments);
	});
});

//Send single comment
//REWRITE
app.get('/post/:postid/comment/:id', function (req, res) {
	var comments = db.get('comments');
	comments.find({_id: req.params.id}, function (error, comment) {
		res.json(comment[0]);
	});
});

//Create new comment and return it
app.post('/post/:postid/comment', function (req, res) {
	var comments = db.get('comments');

	var newcomment = {
		'post': req.params.postid,
		'admin': req.body.admin,
		'name': req.body.name,
		//'email': req.body.email,		
		'comment': req.body.comment,
		'date': new Date()
	}

	//console.log(newcomment);

	comments.insert(newcomment, function (error, comment) {
			//handle error as well
			res.json(comment);
		});
	
});

//Edit a comment and return it
app.post('/post/:postid/comment/:id', function (req, res) {
	if(req.session.admin) {
		var comments = db.get('comments');
		comments.update({_id: req.params.id}, {$set: {
			'comment': req.body.comment
			}}, function (err, comment) {
				//add error handling here
				res.json(comment);
			});			
	}
	else {
		res.send(401, 'unauthorized');
	}
});

//Delete a comment
app.delete('/post/:postid/comment/:id', function (req, res) {
	if(req.session.admin) {
		var comments = db.get('comments');
		comments.remove({_id: req.params.id}, function (error, comment) {
			//Notify app of error
		});
	}
	else {
		res.send(401, 'unauthorized');
	}	
});


app.listen(port);
console.log("Prosefectionist is listening on port " + port);
exports = module.exports = app;


//UTILITY FUNCTIONS

//Used to order pages by sequence property
sequential = function(a, b) {
	if (a.sequence < b.sequence) {
		return -1;
	}
	else if (a.sequence > b.sequence) {
		return 1;
	}
	else {
		return 0;
	}
}


