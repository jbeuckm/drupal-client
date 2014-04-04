# drupal-client

A Javascript client for Drupal 7 / Services 3.4

[![Build Status](https://travis-ci.org/jbeuckm/drupal-client.png)](https://travis-ci.org/jbeuckm/drupal-client)

## Requirements

1. An installation of Drupal 7.x
2. Services Module 3.4+ (implements the CSRF token for updated REST security)
3. REST Server module enabled
4. A Javascript project - node or Titanium are known to work

## Usage

Configure the client for your installation of Drupal 7 / Services 3.4

```javascript

var drupal = require('drupal');

drupal.setRestPath("http://mywebsite.com/", "rest_endpoint");

```

Create a Service and enable (at least) the Resources called "system" and "user".

### Get a session

```javascript

drupal.systemConnect(
	//success
	function(sessionData) {
		var uid = sessionData.user.uid;
		console.log('session found for user '+uid);
	},
	//failure
	function(error) {
		console.log('boo :(');
	}
);
```

### Create an account

```javascript
var user = {
	name: 'my_new_username',
	pass: 'my_new_password',
	mail: 'my_email@drupal.js'
};

drupal.createAccount(user,
	//success
	function(userData) {
		console.log('yay!');
	},
	//failure
	function(error) {
		console.log('boo :(');
	},
	headers //optional
);
```

### Login

```javascript

var my_username = "<DRUPAL USERNAME>";
var my_password = "<DRUPAL PASSWORD>";

var userObject;

drupal.login(my_username, my_password,
	function(userData) {
		console.log('User ' + userData.uid + ' has logged in.');
		userObject = userData;
	},
	function(err){
		console.log('login failed.');
	}
);
```

### Modify User Info

This updates an account profile on the server. `userObject` is a user object that may have been received from a login request (see above).

```javascript
drupal.putResource("user/"+userObject.uid, userObject,
	function(userData) {
		console.log('user has been updated.');
	},
	function(err){
		console.log('user update failed.');
	}
);

```

### Upload A File

```javascript
var filename = "uploaded_file.png";
var data = require('fs').readFileSync("path/to/file/file.png");
var base64data = data.toString('base64');
var filesize = data.length;

drupal.uploadFile(base64data, filename, filesize,
  function (response) {
    fid = response.fid;
  },
  function (err) {
    console.log(err);
  }
);

```

### Make Requests

The workhorse function of the interface is `makeAuthenticatedRequest(config, success, failure, headers)`. There are a few helper functions included for posting/getting nodes, getting views, uploading files, etc. But they typically all construct a call to `makeAuthenticatedRequest`. This function should facilitate most things that people want to do with Drupal in a mobile environment. It's also easy to use `makeAuthenticatedRequest' to make requests agaist custom Services.

### Tests

To run the tests, rename `test/config.js.example` to `test/config.js` and replace strings with the url of your Drupal install and your service endpoint.
