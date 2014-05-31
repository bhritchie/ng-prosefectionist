//app.js

//Define app
var PF = angular.module('PF', ['ngRoute', 'ngResource', 'ngAnimate']);

//Filter to allow post and page compositon with Markdown
//Uses showdown: https://github.com/coreyti/showdown
PF.filter('markdown', function ($sce) {
    var converter = new Showdown.converter();
    return function (value) {
		var html = converter.makeHtml(value || '');
        return $sce.trustAsHtml(html);
    };
});


//Preload and cache all html templates for better responsiveness
//Will change so admin-only templates are not loaded unless required
//Probably will concatenate these eventually or load them all in a separate module
PF.run(function ($templateCache, $http) {
	$http.get('hometpl', { cache: $templateCache });
	$http.get('formtpl', { cache: $templateCache });
	$http.get('posttpl', { cache: $templateCache });
	$http.get('pagetpl', { cache: $templateCache });
	$http.get('pageformtpl', { cache: $templateCache });
	$http.get('logintpl', { cache: $templateCache });
});


//Set up routes
function postRouteConfig($routeProvider) {
	$routeProvider.
	when('/', {
		controller: HomeController,
		templateUrl: 'hometpl'//,
		//resolve: {
			//posts: function(MultiPostLoader) {
			//	return MultiPostLoader();
			//},
			//titles: function(PageTitlesLoader) {
			//	return PageTitlesLoader();
			//}
		//}
	}).
	when('/post/:id', {
		controller: PostController,
		templateUrl: 'posttpl',
		resolve: {
			post: function(SinglePostLoader) {
				return SinglePostLoader();
			}
		}
	}).
	when('/newpost', {
		controller: NewController,
		templateUrl: 'formtpl',
		requireAdmin: true,
	}).
	when('/edit/:id', {
		controller: EditController,
		templateUrl: 'formtpl',
		requireAdmin: true
	}).
	when('/page/:id', {
		controller: PageController,
		templateUrl: 'pagetpl',
		resolve: {
			page: function(SinglePageLoader) {
				return SinglePageLoader();
			}
		}
	}).	
	when('/newpage', {
		controller: NewPageController,
		templateUrl: 'pageformtpl',
		requireAdmin: true
	}).
	when('/editpage/:id', {
		controller: EditPageController,
		templateUrl: 'pageformtpl',
		requireAdmin: true
	}).
	when('/login', {
		controller: LoginController,
		templateUrl: 'logintpl'
	}).
	when('/admin', {
		//cache it when loaded
		controller: AdminController,
		templateUrl: 'admintpl',
		requireAdmin: true
	}).
	otherwise({
		redirectTo: '/'
	});
}

//Configure app with routes configured above
PF.config(postRouteConfig);




//Authentication handling
//This is basic, but server does own authentication on routes as well

//On route change, check whether user is logged in
//ISSUE: TEMPLATE FLASHES IN BEFORE SECURITY CHECK IS FINISHED - see http://stackoverflow.com/questions/17978990/angularjs-need-some-combination-of-routechangestart-and-locationchangestart
PF.run(function ($rootScope, $location, $route) {
	$rootScope.$on('$routeChangeStart', function (event, next) {
		if (next.requireAdmin) {
			if (!sessionStorage.getItem("admin")) {
				//event.preventDefault(); //this only works on locationChangeStart
				//PRESENT A MESSAGE HERE AS WELL
				$location.path('/login');
			}
		}
	});
});

//Certain page elements need to check logged in status as well
loggedIn = function() {
	if (sessionStorage.getItem("admin")) {
		return true;
	}
	else {
		return false;
	}
}


//BEGN CONTROLLERS
//Eventually will use the .controller syntax

function AdminController($scope, $http, $location) {
	//IMPLEMENT ARCHIVE
	
	//ISSUE: NG-CLICK DOESN'T GIVE A VISUAL POINTER ON HOVER
	$scope.logout = function() {
		$http.get('/logout');
		sessionStorage.removeItem("admin");
		$location.path('/');
	}
}

function LoginController($scope, $http, $location) {
	//STYLE NEEDS TO BE CLEANED UP QUITE A BIT

	$scope.credentials = {
		username: '',
		password: ''
	};

	$scope.warning = '';

	//Hitting enter should fire this, not cancel()
	$scope.login = function() {

		$http.post('/login', $scope.credentials).
			success(function(data, status, headers, config) {
				//DISPLAY SYSTEM MESSAGE WITH REDIRECT
				sessionStorage.setItem("admin", true);
				$location.path('/admin');
			}).
			error(function(data, status, headers, config) {
				//Crude warning mechanism:
				$scope.warning = status + ': ' + data;
			});
	}

	$scope.cancel = function() {
		$location.path('/');
	}
}

//Implement paging myself
function HomeController($scope, $http, $window) {

	//$scope.posts = BlogPosts.query();

	//need to control for fact that there may not be a next or previous page
	//caching is on but probably won't know about saves and edits - would have to clear it
	//jumps to top of page after pagechange but maybe icon should be shrunk a bit.

	//$scope.pageTitles = titles;

	var PAGESKIP = 2;
	var currentPost = 1;
	var postCount = null;

	$scope.next = function() {
		currentPost += PAGESKIP;
		loadposts();
		$window.scrollTo(0,0)
	}

	$scope.previous = function() {
		currentPost -= PAGESKIP;
		loadposts();
		$window.scrollTo(0,0);
	}

	var loadposts = function() {
		$http.get('/post/' + currentPost + '-' + (currentPost + (PAGESKIP - 1)), {cache: true}).success(function(data) {
			$scope.posts = data;
		});

		$http.get('/postcount', {cache: true}).success(function(count) {
			$scope.morePosts = (count >= (currentPost + PAGESKIP));
		});
	
		$scope.atStart = (currentPost <= 1);
	}

	loadposts();

}




//Using Pagination
/*
function HomeController($scope, $http, Paginator) {

	var fetchFunction = function(offset, limit, callback) {
		//$http.get('/post/' + offset + '-' + limit, {params: {offset: offset, limit: limit}}).success(callback);
		$http.get('/post/' + offset + '-' + limit, {}).success(callback);

	};

	$scope.posts = Paginator(fetchFunction, 3);
}
*/
/*
//going straight to BlogPosts
function HomeController($scope, BlogPosts) {
	$scope.posts = BlogPosts.query();
}
*/


//Using resolver
/*
function HomeController($scope, posts) {
	$scope.posts = posts;
}
*/



//POST CONTROLLERS
//Do I need to be injecting BlogPosts here?
function PostController($scope, $routeParams, $location, post, BlogPosts, Comments) {
	$scope.post = post;

	//for this need to inject BlogPosts
	//$scope.post = BlogPosts.get({postId: $routeParams.id});

	$scope.edit = function() {
		$location.path('/edit/' + $routeParams.id);
	}

	$scope.delete = function() {
		BlogPosts.remove({postId: $routeParams.id});
		$location.path('/');
	}

	//COMMENT HANDLING
	//get all comments for the post
	$scope.comments = Comments.query({postId: $routeParams.id});

	//This works but need to smooth out the reload - shouldn't really need to reload all the comments either
	$scope.deleteComment = function(commentIndex) {
		commentId = $scope.comments[commentIndex]._id;
		console.log(commentId);
		Comments.remove({postId: $routeParams.id, commentId: commentId});
		//I would like this to respond to server confimration but not sure how to add a call back to remove
		//ANIMATE THIS
		$scope.comments = $scope.comments.filter(function(object){return object._id !== commentId});
		//$scope.comments = Comments.query({postId: $routeParams.id});
	}

	$scope.editComment = function(commentIndex) {
		//comment editing not implemented yet
		//might need a subcontroller here
	}

	initiateComment = function () {
		$scope.newcomment = new Comments();
		$scope.newcomment.admin = false;
		//set this when creating the comment?
		$scope.newcomment.postId = $routeParams.id;
	}
	
	$scope.saveComment = function() {
		//console.log($scope.newcomment);
		$scope.newcomment.$save().then(function(data) {
			//console.log(data);
			//ANIMATE THIS:
			$scope.comments.push(data);
			initiateComment();
		});
	}

	//add cancelComment
	$scope.cancelComment = function() {
		//HAVE TO PREVENT VALIDATION WARNING - PREVENTDAFAULT OR DO MY OWN VALIDATIONs
		initiateComment();
	}

	initiateComment();

	$scope.authorized = loggedIn();
	
}

//Issue: new posts are not reflected until full refresh: force refresh or turn off caching or make it smarter
function NewController($scope, $location, BlogPosts) {

	$scope.newpost = new BlogPosts();

	$scope.save = function () {
		$scope.newpost.$save().then(function(data) {
			$location.path('/post/' + data._id);
		});
	}

	$scope.cancel = function () {
		$location.path('/');
	}
}

//Issue: edits are not reflected until full refresh: force refresh or turn off caching or make it smarter
function EditController($scope, $location, BlogPosts, $routeParams) {
	$scope.newpost = BlogPosts.get({postId: $routeParams.id});

	$scope.cancel = function () {
		$location.path('/post/' + $routeParams.id);
	}

	$scope.save = function () {
		$scope.newpost.$save().then(function(data) {
			$location.path('/post/' + $routeParams.id);
		});
	}
}



//PAGE CONTROLLERS

function PageController($scope, $routeParams, $location, page, BlogPage) {
	$scope.page = page;

	$scope.edit = function() {
		$location.path('/editpage/' + $routeParams.id);
	}

	$scope.delete = function() {
		BlogPage.remove({pageId: $routeParams.id});
		$location.path('/');
	}

	$scope.authorized = loggedIn();
}

//Issue: nav section doesn't reflect new pages until reload - either force reload or make nav more dynamic
function NewPageController($scope, $location, BlogPage) {

	$scope.newpage = new BlogPage();

	$scope.save = function () {
		$scope.newpage.$save().then(function(data) {
			$location.path('/page/' + data._id);
		});
	}

	$scope.cancel = function () {
		$location.path('/');
	}
}

//Issue: edits are not reflected until full refresh: force refresh or turn off caching or make it smarter
function EditPageController($scope, $location, BlogPage, $routeParams) {

	$scope.newpage = BlogPage.get({pageId: $routeParams.id});

	$scope.cancel = function () {
		$location.path('/page/' + $routeParams.id);
	}

	$scope.save = function () {
		$scope.newpage.$save().then(function(data) {
			$location.path('/page/' + $routeParams.id);
		});
	}
}



//POST LOADING
PF.factory('MultiPostLoader', ['BlogPosts', '$q', function(BlogPosts, $q) {
	return function() {
		var delay = $q.defer();
		BlogPosts.query(function(posts) {
			delay.resolve(posts);
		}, function() {
			delay.reject('Unable to fetch posts.');
		});
		return delay.promise;
	};
}]);

PF.factory('SinglePostLoader', ['BlogPosts', '$route', '$q', function(BlogPosts, $route, $q) {
	return function() {
		var delay = $q.defer();
		//BlogPosts.get({postId: $route.current.params.postId}, function(posts) {
		BlogPosts.get({postId: $route.current.params.id}, function(posts) {
			delay.resolve(posts);
		}, function() {
			delay.reject('Unable to fetch post.');
		});
		return delay.promise;
	};
}]);



//PAGE LOADING
PF.factory('SinglePageLoader', ['BlogPage', '$route', '$q', function(BlogPage, $route, $q) {
	return function() {
		var delay = $q.defer();
		//BlogPage.get({postId: $route.current.params.postId}, function(posts) {
		BlogPage.get({pageId: $route.current.params.id}, function(page) {
			delay.resolve(page);
		}, function() {
			delay.reject('Unable to fetch page.');
		});
		return delay.promise;
	};
}]);


/*
PF.factory('PageTitlesLoader', ['$http', '$q', function($http, $q) {
	return function() {
		var delay = $q.defer();
		$http.get('/pagetitles', function(titles) {
			delay.resolve(titles);
			console.log("I was called");
		}, function() {
			delay.reject('Unable to fetch titles.');
			console.log("Error was called");
		});
		return delay.promise;
	};
}]);
*/

/*
		$http.get('/post/' + currentPost + '-' + (currentPost + (PAGESKIP - 1)), {cache: true}).success(function(data) {
			$scope.posts = data;
		});
*/


//Angular $resource for blog posts
/*
PF.factory('BlogPosts', ['$resource', '$cacheFactory', function($resource, $cacheFactory) {
	return $resource('/post/:postId', {postId: '@_id'}, {
		get: { method: 'GET', cache: $cacheFactory, isArray: true },
		query: { method: 'GET', cache: $cacheFactory }
	});
}]);
*/

//Post $resource
PF.factory('BlogPosts', function($resource, $cacheFactory) {
	return $resource('/post/:postId', {postId: '@_id'}, {
		get: { method: 'GET', cache: $cacheFactory},
		query: { method: 'GET', cache: $cacheFactory, isArray: true }
	});
});

//Page $resource
PF.factory('BlogPage', function($resource, $cacheFactory) {
	return $resource('/page/:pageId', {pageId: '@_id'}, {
		get: { method: 'GET', cache: $cacheFactory}
	});
});

//Post comments $resource
PF.factory('Comments', function($resource, $cacheFactory) {
	return $resource('/post/:postId/comment/:commentId', {postId: '@postId', commentId: '@_id'}, {
		//not caching coments currently
		//get: { method: 'GET', cache: $cacheFactory}
	});
});



/*
PF.factory('SitePages', function($resource, $cacheFactory) {
	return $resource('/page/:pageId', {pageId: '@_id'}, {
		get: { method: 'GET', cache: $cacheFactory},
		//query: { method: 'GET', cache: $cacheFactory, isArray: true }
	});
});
*/




//PF.module('services', []).factory('Paginator', function() {
PF.factory('Paginator', function() {
	return function(fetchFunction, pageSize) {
		var paginator = {
			hasNextVar: false,
			next: function() {
				if (this.hasNextVar) {
				this.currentOffset += pageSize;
				this._load();
			}
		},
		_load: function() {
			var self = this;
			fetchFunction(this.currentOffset, pageSize + 1, function(items) {
				self.currentPageItems = items.slice(0, pageSize);
				self.hasNextVar = items.length === pageSize + 1;
			});
		},
		hasNext: function() {
			return this.hasNextVar;
		},
		previous: function() {
			if(this.hasPrevious()) {
				this.currentOffset -= pageSize;
				this._load();
			}
		},
		hasPrevious: function() {
			return this.currentOffset !== 0;
		},
		currentPageItems: [],
		currentOffset: 0
		};
		// Load the first page
		paginator._load();
		return paginator;
	};
});






//Cache posts in memory so I don't need to make an Ajax call unless necessary
//Have to set up this or the resource so that I am only fetching the latest ten or so posts up front
//Not currently in use
/*

PF.factory('FetchPosts', ['BlogPosts', function(BlogPosts) {

	//add functions to refresh or trim down the cache

	var FetchPostsObject = {

		cachedPosts: [],
		result: undefined,

		//make sure this only returns latest and limit it
		latest: function() {
			//console.log(this); 
			//console.log("FetchPosts.latest was called"); 
			if (this.cachedPosts.length < 1) {
				this.cachedPosts = BlogPosts.query(function(posts) {
					//console.log(cachedPosts);
					return this.cachedPosts;
				});
				return this.cachedPosts;
			}
			else {
				return this.cachedPosts;
			}
			//why doesn't this work?
			//console.log(this.cachedPosts);
		},


		//this function has to push new results to the cache
		single: function(postid) {
			//console.log("FetchPosts.single was called for post " + postid);
			//var result;
			//console.log(this.cachedPosts);

			this.result = undefined;

			for (var i = 0; i < this.cachedPosts.length; i++) {
				//console.log("hello " + i);
				if (this.cachedPosts[i]._id === postid) {
					//console.log(this.cachedPosts[i]._id);
					this.result = this.cachedPosts[i];
					//console.log(this.result);
					break;
				}
			}
			//console.log("outside the lop: " + this.result);
			if (this.result!==undefined) {
				//console.log("not undefined");
				//return this.result;
			}
			else {
				//console.log("must have been undefined");
				this.result = BlogPosts.get({postId: postid});
			}
			return this.result;
		},

		remove: function(postid) {
			console.log(this.cachedPosts);
			this.cachedPosts = this.cachedPosts.filter(function(object){
				return object._id !== postid;
			});
			console.log(this.cachedPosts);
			BlogPosts.remove({postId: postid});
		},

		refresh: function() {
			console.log("refresh was called");
			console.log(this.cachedPosts);
			this.cachedPosts = [];
			console.log(this.cachedPosts);
			//this.latest();
		},

		//this should really do everything: insert record, report errors, etc
		add: function(newpost) {
			this.cachedPosts.unshift(newpost);
		},

		//this is broken.
		edit: function(editedpost) {
			console.log(this.cachedPosts);
			console.log("FetchPosts.edit function called");
			console.log(this.cachedPosts.indexOf(editedpost));
			this.cachedPosts.splice(this.cachedPosts.indexOf(editedpost), 1, editedpost);
			console.log(this.cachedPosts);
		}

	}

	return FetchPostsObject;

}]);	
*/


/*
PF.FetchPosts = {
	cachedPosts: [],

	latest: function() {
		if (this.cachedPosts.length < 1) {
			cachedPosts = BlogPosts.query(function(posts) {
				return cachedPosts;
			});
		}
	}
};	
*/

/*
	$scope.posts = BlogPosts.query(function(posts) {
		posts.forEach(function(post) {
			if (!_.contains(PF.cachedPosts, post)) {
				PF.cachedPosts.push(post);
			}
		});
	});
};
*/



/*
//WHERE DO I PUT THIS? IT DOES NOT BELONG IN ANY OF THE CONTROLLERS
//currently loading directly as part of main template
var loadTitles = function() {
	$http.get('/pagetitles', {cache: true}).success(function(titles) {
		//console.log(titles)
		$scope.pageTitles = titles;
	});
}
loadTitles();
*/





