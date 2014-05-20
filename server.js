//server.js

var express = require('express');
var app = express();
var morgan = require('morgan')
var bodyParser = require('body-parser');

var dbconfig = require('./config/db');

var siteconfig = require('./config/site');

var sitetitle = siteconfig.sitetitle;
var sitename = siteconfig.sitename;
var sitetag = siteconfig.sitetag;

var port = process.env.PORT || 3000;

var db = require('monk')(dbconfig.url);

app.use(express.static('./public'));
app.use(morgan('short'));

//But see this post: http://andrewkelley.me/post/do-not-use-bodyparser-with-express-js.html
app.use(bodyParser());

app.set('view engine', 'jade')
app.set('views', './views')

app.locals.pretty = true;

//var env = process.env.NODE_ENV || 'development';



//Shouldn't be hard-coded
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


//Serve main template
app.get('/', function (req, res) {
	res.render('index', {
		sitetitle: sitetitle,
		sitename: sitename,
		sitetag: sitetag
	});
});


//Serve subview templates
app.get('/hometpl', function (req, res) {
	res.render('home');
});

app.get('/posttpl', function (req, res) {
	res.render('post');
});

app.get('/formtpl', function (req, res) {
	res.render('form');
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
	blogposts = db.get('posts');
	blogposts.count({}, function(error, count) {
		//console.log(count);
		res.json(count);
	});	
});


app.get('/pagetitles', function(req, res) {
	blogposts = db.get('pages');
	blogposts.find({}, ['shortname'], function(error, titles) {
		console.log(titles)
		res.json(titles);
	});	
});

/*
count posts:
	blogposts.count {}, (e,count) ->
		totalposts = count 
		if count > (req.params.id * pageskip)
			nextpage = parseInt(req.params.id) + 1
		complete()
*/


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
	var blogposts = db.get('posts')
	blogposts.find({_id: req.params.id}, function (error, post) {
		res.json(post[0]);
	});
});







//Create new post and return it
app.post('/post', function (req, res) {
	var blogposts = db.get('posts')
	blogposts.insert({
		'title': req.body.title,
		'body': req.body.body,
		'date': new Date()
		}, function (err, doc) {
			//handle error as well
			res.json(doc);
		});
});



//Edit a post and return it
app.post('/post/:id', function (req, res) {
	blogposts = db.get('posts')
	blogposts.update({_id: req.params.id}, {$set: {
		'title': req.body.title,
		'body': req.body.body
		}}, function (err, doc) {
			//add error handling here
			res.json(doc);
		});			
});


//Delete a post
app.delete('/post/:id', function (req, res) {
	var blogposts = db.get('posts');
	blogposts.remove({_id: req.params.id}, function (err, doc) {
		//Notify app of error
	});
	var comments = db.get('comments');
	comments.remove({post: req.params.id}, function (err, doc) {
		//Notify app of error
	});
});


app.listen(port);
console.log("Prosefectionist app started on port " + port);
exports = module.exports = app;
