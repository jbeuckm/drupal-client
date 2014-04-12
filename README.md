# drupal-client

A Javascript client for Drupal 7 / Services Module

[![Build Status](https://travis-ci.org/jbeuckm/drupal-client.png)](https://travis-ci.org/jbeuckm/drupal-client)

## Requirements

1. An installation of Drupal 7.x and <a href="https://drupal.org/project/services">Services Module</a>
3. REST Server module enabled, an endpoint defined and appropriate permissions (system, user, node, etc.)
4. A Javascript project - node.js or Titanium are known to work

## Installation

`npm install drupal-client`

## Usage

Configure the client for your installation of Drupal+Services

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
  },
  function (progress_event) {
    console.log(progress_event.loaded + '/' + filesize + ' uploaded');
  }
);
```

### Create a New Node

```javascript
var node = {
  type: "my_content_type",
  title: "My New Node",
  body: drupal.field.structureField("Check out this great new node!"),
  field_bool: drupal.field.structureField(1),
  field_decimal: drupal.field.structureField(.1),
  field_float: drupal.field.structureField(2.3),
  field_integer: drupal.field.structureField(4),
  field_multiple: drupal.field.structureField(["one", "two", "three"]),
  field_file: drupal.field.structureField(fid, "fid")
};

drupal.createNode(node,
  function (resp) {
    console.log(resp);
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
