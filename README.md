ng-Prosefectionist
==================

Prosefectionist (read: prose-fectionist) is a clean, single-page blogging platform written on the MEAN stack (MongoDB, Express, Angular, Node) and using a RESTful back-end. Its purpose is to provide myself a blogging platform that also develops my web skills. *Prosefectionist is a work in progress.*

A demo site is up at [prosefectionist.jit.su](http://prosefectionist.jit.su/).


Installation & Configuration
----------------------------

- Install node dependencies: "npm install"

- Install bower dependencies: "bower install"

- Create the config/admin.js configuration file:

<pre>
module.exports = {
	username: "name",
	password: "password"
}
</pre>

- Create the config/db.js configuration file:

<pre>
module.exports = {
	url: 'mongoddb://localhost:27017/blog'
}
</pre>

- Create the config/site.js configuration file:

<pre>
module.exports = {
	sitetitle: "The Prosefectionist",
	sitename: "The Prosefectionist",
	sitetag: "Welcome to my Blog"
}
</pre>

- The site currently uses my own logos at public/images/, so you'll want to replace those 

- Run app: "node app.js"

Administration
--------------

Access /login to log in with username and password defined in config/admin.js. This allows the user to create, edit, and delete posts and pages, to delete user comments (no comment editing yet), and to comment as the administrator (admin comments display differently).

Log out from /admin.

Current Features
----------------

Prosefectionist is in the early stages of development, but currently offers the following features:

- Create, edit, and delete posts
- Simple paging for blogs posts
- Create, edit, and delete pages
- Minimal commenting system (no user log-in)
- Administrator ability to delete comments, and admin comments have special highlighting
- RSS feed (at /feed)
