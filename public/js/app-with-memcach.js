//For Saturday, May 10th:
//- Cache the posts so I don't make a new ajax call unless necessary
//- Use resolve to load new screens



var PF = angular.module('PF', ['ngRoute', 'ngResource']);

//This filter allows for posts and pages to be composed with Markdown
//uses showdown https://github.com/coreyti/showdown
PF.filter('markdown', function ($sce) {
    var converter = new Showdown.converter();
    return function (value) {
		var html = converter.makeHtml(value || '');
        return $sce.trustAsHtml(html);
    };
});


//Preload and cache all html templates for better responsiveness
PF.run(function ($templateCache, $http) {
	$http.get('hometpl', { cache: $templateCache });
	$http.get('formtpl', { cache: $templateCache });
	$http.get('posttpl', { cache: $templateCache });
});


//Set up routes
function postRouteConfig($routeProvider) {
	$routeProvider.
	when('/', {
		controller: HomeController,
		templateUrl: 'hometpl'
	}).
	when('/post/:id', {
		controller: PostController,
		templateUrl: 'posttpl'
	}).
	when('/new', {
		controller: NewController,
		templateUrl: 'formtpl'
	}).
	when('/edit/:id', {
		controller: EditController,
		templateUrl: 'formtpl'
	}).
	otherwise({
		redirectTo: '/'
	});
}


//Configure app with routes configured above
PF.config(postRouteConfig);


//I should be caching a batch of posts somehow

//should use the .controller form for my controllers
function HomeController($scope, BlogPosts, FetchPosts) {
	//console.log('hello from HomeController');
	$scope.posts = FetchPosts.latest();

	//});
	
	//probably not the best palce to do this
	//$scope.posts.forEach(function(post) {
	//	if (!_.contains(PF.cachedPosts, post)) {
	//		PF.cachedPosts.push(post);
	//	}
	//});
}


function NewController($scope, $location, BlogPosts, FetchPosts) {

	$scope.newpost = new BlogPosts();
	$scope.save = function () {
		$scope.newpost.$save().then(function(data) {
			$location.path('/post/' + data._id);
			//console.log(data);
			FetchPosts.add(data);
		});
	}
}


function EditController($scope, $location, BlogPosts, $routeParams, FetchPosts) {
	$scope.newpost = FetchPosts.single($routeParams.id);
	//$scope.newpost = BlogPosts.get({postId: $routeParams.id});

	//this is somehow broken now... when I go back to the main page post displays incorrectly
	//the promise isn't resolved when the new data is spliced into cachedPosts
	$scope.save = function () {
		$scope.newpost.$save().then(function(data) {
			$location.path('/post/' + $routeParams.id);
			//console.log(data);
			FetchPosts.refresh
			//FetchPosts.edit($scope.newpost);
		});
	}
}


function PostController($scope, $routeParams, $location, FetchPosts) {
	$scope.post = FetchPosts.single($routeParams.id);

	$scope.edit = function() {
		$location.path('/edit/' + $routeParams.id);
	}

	$scope.delete = function() {
		FetchPosts.remove($routeParams.id);
		$location.path('/');
	}
}

//Angular $resource for blog posts
PF.factory('BlogPosts', ['$resource', '$cacheFactory', function($resource, $cacheFactory) {
	return $resource('/post/:postId', {postId: '@_id'});
}]);



//Cache posts so I don't need to make an Ajax call unless necessary
//Have to set up this or the resource so that I am only fetching the latest ten or so posts up front

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






