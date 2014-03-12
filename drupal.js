/**
 * @module drupal
 *
 * Yet another Drupal adapter for Javascript 
 * This dependency-free module is adapted to the new CSRF token requirement in Services 3.4.

 */

var Settings, createHTTPClient;
if (typeof Ti != 'undefined') {
    Settings = Ti.App.Properties;
    createHTTPClient = Ti.Network.createHTTPClient;
}
else {
    var npSettings = require("node-persist");
    Settings = {
	setString: function(name, value) {
	    npSettings.setItem(name, value);
	},
	getString: function(name, defaultValue) {
	    var item = npSettings.getItem(name);
	    if (item == undefined) {
		return defaultValue;
	    }
	    else {
		return item;
	    }
	}
    };
    npSettings.initSync();

    createHTTPClient = function(){
	throw("vanilla http client not defined yet");
    }
}


var REST_PATH, SERVICES_ENDPOINT, SITE_ROOT;

/**
 * Prepare to connect to a (different) Drupal server and Services 3.4 module.
 */
function setRestPath(root, endpoint) {
        SITE_ROOT = root;
        SERVICES_ENDPOINT = endpoint;
        REST_PATH = root + endpoint + '/';
}



/**
 * Establish a session (or return the stored session).
 */
function systemConnect(success, failure) {

	var xhr = createHTTPClient();

    var url = REST_PATH + 'system/connect';

    console.log("POSTing to url "+url);
    xhr.open("POST", url);

	xhr.onload = function(e) {

		if (xhr.status == 200) {
			var response = xhr.responseText;
			var responseData = JSON.parse(response);
            
            console.log("system.connect session "+responseData.sessid);
            console.log('system.connect user '+responseData.user.uid);
            
            var cookie = responseData.session_name+'='+responseData.sessid;
            Settings.setString("Drupal-Cookie", cookie);

            getCsrfToken(function(token){
                success(responseData);
            },
            function(err){
                failure(err);
            });
		}
		else {
		    failure(xhr.responseText);
		}
	};
	xhr.onerror = function(e) {
        console.log("There was an error calling systemConnect: ");
        console.log(e);

		// since systemConnect failed, will need a new csrf and session
        Settings.setString("X-CSRF-Token", null);
        Settings.setString("Drupal-Cookie", null);

		failure(e);
	};

    xhr.clearCookies(SITE_ROOT);
	xhr.send();
}


/**
 * Retrieve the new Services security token identifying this session with this device.
 */
function getCsrfToken(success, failure) {
    
    var existingToken = Settings.getString("X-CSRF-Token");
    if (existingToken) {
        success(existingToken);
        return;
    }

    var xhr = Ti.Network.createHTTPClient();

    xhr.onload = function() {
        Settings.setString("X-CSRF-Token", xhr.responseText);
        console.log('got new CSRF token ' + xhr.responseText);
        success(xhr.responseText);
    };
    xhr.onerror = function(err) {
        console.log("error getting CSRF token:");
        throw(err);
        
        failure(err);
    };

    var tokenPath = SITE_ROOT + 'services/session/token';
    xhr.open("GET", tokenPath);

    var cookie = Settings.getString("Drupal-Cookie");
    xhr.setRequestHeader("Cookie", cookie);

    xhr.send();
}



/**
 * Construct and fire arbitrary requests to the connected Drupal server.
 * @TODO: encode and append url params here for GET requests.
 * Config properties:
 * 
 * 		httpMethod: GET, POST, PUT, DELETE, etc.
 * 
 * 		params: An object to be sent to the server
 * 
 * 		servicePath: Path to the resource including any url parameters like resource id
 * 
 * 		contentType: String to send as "Content-Type" HTTP header
 * 
 * 		trace (boolean): If true, echo the request summary with Ti.API.trace()
 */
function makeAuthenticatedRequest(config, success, failure, headers) {
	
	var trace = "makeAuthenticatedRequest()\n";

    var url = REST_PATH + config.servicePath;

    var xhr = Titanium.Network.createHTTPClient();
	trace += config.httpMethod+' '+url+"\n";
    
	// optionally override timeout
	if (config.timeout) {
		xhr.timeout = config.timeout;
	}

    xhr.open(config.httpMethod, url);

    xhr.onerror = function(e) {
        console.log(JSON.stringify(e));

		console.log('FAILED REQUEST:');
		console.log(trace);
		console.log(config.params);

        failure(e);
    };

    xhr.onload = function() {
        if (xhr.status == 200) {
        	var responseData = JSON.parse(xhr.responseText);
            success(responseData);
        }
        else {
	    console.log('makeAuthReq returned with status '+xhr.status);
            failure(xhr.responseText);
        }
    };


	if (!config.skipCookie) {
		var cookie = Settings.getString("Drupal-Cookie");
	    xhr.setRequestHeader("Cookie", cookie);
	    trace += "Cookie: " + cookie + "\n";
	}

    if (!config.skipCsrfToken) {
    	var token = Settings.getString("X-CSRF-Token");
        xhr.setRequestHeader("X-CSRF-Token", token);
        trace += "X-CSRF-Token: " + token + "\n";
    }


    xhr.setRequestHeader("Accept", "application/json");

    if (config.contentType) {
        xhr.setRequestHeader("Content-Type", config.contentType);
        trace += "Content-Type: " + config.contentType+"\n";
    }
    
    // add optional headers
    if (headers) {
    	for (var key in headers) {
		    xhr.setRequestHeader(key, headers[key]);
    	}
    }

	// optionally output a summary of the request
	if (config.trace) {
		console.log(trace);
	        console.log(config.params);
	}
	
    xhr.send(config.params);
}


/**
 * Attempt to register a new account. user object must include name, pass, mail properties.
 */
function createAccount(user, success, failure, headers) {

	console.log('Registering new user: '+JSON.stringify(user)+" with cookie "+Settings.getString("Drupal-Cookie"));	

	makeAuthenticatedRequest({
			httpMethod : 'POST',
			servicePath : 'user/register.json',
			contentType: 'application/json',
			params: JSON.stringify(user)
		}, 
		//success
		function(responseData){
			console.log('registerNewUser SUCCESS');
			success(responseData);
		},
		//fail
		function(err){
			console.log('registerNewUser FAIL');
			failure(err);
		},
		headers
	);
}


/**
 * Construct and send the proper login request.
 */
function login(username, password, success, failure, headers) {

	var user = {
		username : username,
		password : password
	};


	makeAuthenticatedRequest({
			httpMethod : 'POST',
			servicePath : 'user/login.json',
            contentType: "application/json",
			params: JSON.stringify(user)
		},
		function(responseData) {

            var cookie = responseData.session_name+'='+responseData.sessid;
            Settings.setString("Drupal-Cookie", cookie);
            console.log('login saving new cookie '+cookie);

            // clear old token and get a new one for this session
            Settings.setString("X-CSRF-Token", null);
            getCsrfToken(function(token){
                success(responseData.user);
            },
            function(err){
                failure(err);
            });
		},
		failure, headers);
};


/**
 * Become user:uid=0
 */
function logout(success, failure, headers) {

	makeAuthenticatedRequest({
		httpMethod : 'POST',
		servicePath : 'user/logout.json'
	}, function(response) {
	    // session over - delete the token
        Settings.setString("X-CSRF-Token", null);
		success(response);
	}, failure, headers);

}


/**
 * Requires Services Views module
 */
function getView(viewName, args, success, failure, headers) {
	makeAuthenticatedRequest({
		servicePath : "views/" + viewName + ".json?" + encodeUrlString(args),
		httpMethod : 'GET',
		contentType : "application/json",
	}, success, failure, headers);
}

/**
 * Convenience function for GET requests
 */
function getResource(resourceName, args, success, failure, headers) {
	makeAuthenticatedRequest({
		servicePath : resourceName + ".json?" + encodeUrlString(args),
		httpMethod : 'GET'
	}, success, failure, headers);
}

/**
 * Convenience function for POST requests
 */
function postResource(resourceName, object, success, failure, headers) {
	makeAuthenticatedRequest({
		servicePath : resourceName + ".json",
		httpMethod : 'POST',
		params : JSON.stringify(object)
	}, success, failure, headers);
}

/**
 * Convenience function for PUT requests
 */
function putResource(resourceName, object, success, failure, headers) {
	makeAuthenticatedRequest({
		servicePath : resourceName + ".json",
		httpMethod : 'PUT',
		contentType: 'application/json',
		params : JSON.stringify(object)
	}, success, failure, headers);
}

/**
 * The fundamental act of Drupal
 */
function createNode(node, success, failure, headers) {

	makeAuthenticatedRequest({
			servicePath : "node",
			httpMethod : "POST",
	
			params : JSON.stringify({
				node : node
			})
		}, function(response) {
			console.log(JSON.stringify(response));
			success(response);
		}, function(response) {
			failure(response);
		}, 
		headers
	);
}

/**
 * Haven't tested this in a while but it was working in Services 3.2...
 */
function uploadFile(base64data, filename, filesize, success, failure, headers) {

	var fileDescription = {
		file : base64data,
		filename : filename,
		filesize : "" + filesize,
	};

	makeAuthenticatedRequest({
		servicePath : "file.json",
		httpMethod : "POST",
		contentType : "application/x-www-form-urlencoded; charset=utf-8",
		params : fileDescription
	}, success, failure, headers);
}



/**
 * Do the custom serialization for sending drupal views contextual filter settings
 * 
 * @param {Object} obj
 */
function serializeDrupalViewsFilter(obj) {
	var str = [];
	for(var p in obj) {
  		if (obj[p]  instanceof Array) {
  			
  			for (var i=0, l=obj[p].length; i<l; i++) {
				str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p][i]));
			}
  		}
  		else {
			str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
		}
	}
	return str.join("&");
}

/**
 * Create a request string from an object of request parameters.
 */
function encodeUrlString(args) {
	var parts = [];
	for (var i in args) {
		var arg = args[i];
		parts.push(i + '=' + encodeURIComponent(arg));
	}
	var url = parts.join('&');
	return url;
}


/**
 * Create the basic field structure for uploading a field.
 * This function is mainly here to document the "unique" way that field data must be constructed to work with Services.
 */
function basicField(obj) {
	return {
		und : [obj]
	};
}

exports.Settings = Settings;
exports.setRestPath = setRestPath;

exports.systemConnect = systemConnect;
exports.makeAuthenticatedRequest = makeAuthenticatedRequest;
exports.createAccount = createAccount;
exports.login = login;
exports.logout = logout;

exports.basicField = basicField;
exports.serializeDrupalViewsFilter = serializeDrupalViewsFilter;

exports.getResource = getResource;
exports.postResource = postResource;
exports.putResource = putResource;

exports.getView = getView;

