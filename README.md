# Requirements

1. An installation of Drupal 7.x
2. Services Module 3.4+ (implements the CSRF token for updated REST security)
3. REST Server module enabled
4. A Titanium project - probably works with most versions since this only uses Ti.Network.HTTPClient


# Usage

Create a Service and enable (at least) the Resources called "system" and "user". Rename `config.js.example` to `config.js` and enter the url of your Drupal install and your service endpoint.

### Get a session

```javascript

var drupal = require('drupal');

drupal.systemConnect(
	//success
	function(sessionData) {
		var uid = sessionData.user.uid;
		Ti.API.info('session found for user '+uid);
	},
	//failure
	function(error) {
		Ti.API.error('boo :(');
	}
);
```

### Create an account

```javascript 
var user = {
	name: 'my_new_username',
	pass: 'my_new_password',
	mail: 'my_email@titaniumdrupal.com'
};

drupal.createAccount(user,
	//success
	function(userData) {
		Ti.API.info('yay!');
	},
	//failure
	function(error) {
		Ti.API.error('boo :(');
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
		Ti.API.info('User ' + userData.uid + ' has logged in.');
		userObject = userData;
	},
	function(err){
		Ti.API.error('login failed.');
	}
);
```

### Modify User Info

This updates an account profile on the server. `userObject` is a user object that may have been received from a login request (see above).

```javascript
drupal.putResource("user/"+userObject.uid, userObject, 
	function(userData) {
		Ti.API.info('user has been updated.');
	},
	function(err){
		Ti.API.error('user update failed.');
	}
);
	
```
### Make Requests

The workhorse function of the interface is `makeAuthenticatedRequest(config, success, failure, headers)`. There are a few helper functions included for posting/getting nodes, getting views, uploading files, etc. But they typically all construct a call to `makeAuthenticatedRequest`. This function should facilitate most things that people want to do with Drupal in a mobile environment. It's also easy to use `makeAuthenticatedRequest' to make requests agaist custom Services.

