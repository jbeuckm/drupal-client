/**
 * @module drupal
 *
 * Yet another Drupal adapter for Javascript 
 * This dependency-free module is adapted to the new CSRF token requirement in Services 3.4.

 */

var REST_PATH;
try {
	require("drupal/config.js");
	REST_PATH = SITE_ROOT + SERVICES_ENDPOINT + '/';
}
catch (e) {
	throw("************************ DRUPAL CONFIG NOT FOUND *******************************");
}

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

	var xhr = Ti.Network.createHTTPClient();

    var url = REST_PATH + 'system/connect';

    Ti.API.debug("POSTing to url "+url);
    xhr.open("POST", url);

	xhr.onload = function(e) {

		if (xhr.status == 200) {
			var response = xhr.responseText;
			var responseData = JSON.parse(response);
            
            Ti.API.debug("system.connect session "+responseData.sessid);
            Ti.API.debug('system.connect user '+responseData.user.uid);
            
            var cookie = responseData.session_name+'='+responseData.sessid;
            Ti.App.Properties.setString("Drupal-Cookie", cookie);

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
        Ti.API.error("There was an error calling systemConnect: ");
        Ti.API.error(e);

		// since systemConnect failed, will need a new csrf and session
        Ti.App.Properties.setString("X-CSRF-Token", null);
        Ti.App.Properties.setString("Drupal-Cookie", null);

		failure(e);
	};

    xhr.clearCookies(SITE_ROOT);
	xhr.send();
}


/**
 * Retrieve the new Services security token identifying this session with this device.
 */
function getCsrfToken(success, failure) {
    
    var existingToken = Ti.App.Properties.getString("X-CSRF-Token");
    if (existingToken) {
        success(existingToken);
        return;
    }

    var xhr = Ti.Network.createHTTPClient();

    xhr.onload = function() {
        Ti.App.Properties.setString("X-CSRF-Token", xhr.responseText);
        Ti.API.info('got new CSRF token ' + xhr.responseText);
        success(xhr.responseText);
    };
    xhr.onerror = function(err) {
        Ti.API.error("error getting CSRF token:");
        Ti.API.error(err);
        
        failure(err);
    };

    var tokenPath = SITE_ROOT + 'services/session/token';
    xhr.open("GET", tokenPath);

    var cookie = Ti.App.Properties.getString("Drupal-Cookie");
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
        Ti.API.error(JSON.stringify(e));

		Ti.API.error('FAILED REQUEST:');
		Ti.API.error(trace);
		Ti.API.error(config.params);

        failure(e);
    };

    xhr.onload = function() {
        if (xhr.status == 200) {
        	var responseData = JSON.parse(xhr.responseText);
            success(responseData);
        }
        else {
	        Ti.API.trace('makeAuthReq returned with status '+xhr.status);
            failure(xhr.responseText);
        }
    };


	if (!config.skipCookie) {
		var cookie = Ti.App.Properties.getString("Drupal-Cookie");
	    xhr.setRequestHeader("Cookie", cookie);
	    trace += "Cookie: " + cookie + "\n";
	}

    if (!config.skipCsrfToken) {
    	var token = Ti.App.Properties.getString("X-CSRF-Token");
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
		Ti.API.trace(trace);
		Ti.API.trace(config.params);
	}
	
    xhr.send(config.params);
}


/**
 * Attempt to register a new account. user object must include name, pass, mail properties.
 */
function createAccount(user, success, failure, headers) {

	Ti.API.info('Registering new user: '+JSON.stringify(user)+" with cookie "+Ti.App.Properties.getString("Drupal-Cookie"));	

	makeAuthenticatedRequest({
			httpMethod : 'POST',
			servicePath : 'user/register.json',
			contentType: 'application/json',
			params: JSON.stringify(user)
		}, 
		//success
		function(responseData){
			Ti.API.info('registerNewUser SUCCESS');
			success(responseData);
		},
		//fail
		function(err){
			Ti.API.error('registerNewUser FAIL');
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
            Ti.App.Properties.setString("Drupal-Cookie", cookie);
            Ti.API.debug('login saving new cookie '+cookie);

            // clear old token and get a new one for this session
            Ti.App.Properties.setString("X-CSRF-Token", null);
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
        Ti.App.Properties.setString("X-CSRF-Token", null);
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
			Ti.API.trace(JSON.stringify(response));
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

