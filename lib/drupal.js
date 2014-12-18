/**
 * Drupal Adapter for Javascript
 * This module is adapted to the CSRF token requirement in Services 3.4.
 * Tested to work with properly configured Services 3.5. Will work with 3.8+ when released.
 */
"use strict";

var TITANIUM = 1;
var NODE = 2;
var BROWSER = 3;

var environment = null;
var Settings = null;
var createHTTPClient = null;

function Drupal() {

    this.settingsPrefix = '';

    this.REST_PATH = null;
    this.SITE_ROOT = null;
    this.SERVICES_ENDPOINT = null;

}

// running in Titanium
if (typeof Ti !== 'undefined') {
    environment = TITANIUM;
    Settings = Ti.App.Properties;
    createHTTPClient = Ti.Network.createHTTPClient;

} else if (typeof window == 'undefined') {
// running in node.js
    environment = NODE;
    var npSettings = require("node-persist");
    Settings = {
        setString:function (name, value) {
            npSettings.setItem(name, value);
        },
        getString:function (name, defaultValue) {
            var item = npSettings.getItem(name);
            if (item === undefined) {
                return defaultValue;
            }

            return item;
        }
    };
    npSettings.initSync();

    createHTTPClient = require("./httpClient.js").createHTTPClient;

} else {
// running in the browser
    environment = BROWSER;
    Settings = {
        setString:function (name, value) {
            localStorage.setItem(name, value);
        },
        getString:function (name, defaultValue) {
            var item = localStorage.getItem(name);
            if (item === undefined) {
                return defaultValue;
            }
            return item;
        }
    };

    createHTTPClient = function () {

        var xhr = new XMLHttpRequest();
        return xhr;

    }
}

Drupal.prototype.Settings = Settings;



Drupal.prototype.setupCredentials = function (xhr) {
    if (environment != BROWSER) {
        return xhr;
    }
    if ("withCredentials" in xhr) {

        xhr.withCredentials = true;

    } else if (typeof XDomainRequest != "undefined") {

        xhr = new XDomainRequest();

    } else {

        // Otherwise, CORS is not supported by the browser.
        throw new Error('CORS not supported');
        xhr = null;

    }
    return xhr;
};


/**
 * Prepare to connect to a (different) Drupal server and Services 3.4 module.
 */
Drupal.prototype.setRestPath = function (root, endpoint) {
    this.SITE_ROOT = root;
    this.SERVICES_ENDPOINT = endpoint;
    this.REST_PATH = root + endpoint + '/';
};


/**
 * Retrieve the new Services security token identifying this session with this device.
 */
Drupal.prototype.getCsrfToken = function (success, failure) {

    var existingToken = Settings.getString(this.settingsPrefix + "X-CSRF-Token");
    if (existingToken) {
        success(existingToken);
        return;
    }

    var xhr = createHTTPClient();

    var self = this;

    xhr.onload = function () {
        Settings.setString(self.settingsPrefix + "X-CSRF-Token", xhr.responseText);
        console.log('got new CSRF token ' + xhr.responseText);
        success(xhr.responseText);
    };
    xhr.onerror = function (err) {
        console.log("error getting CSRF token:");
        failure(err);
    };

    var tokenPath = this.SITE_ROOT + 'services/session/token';
    xhr.open("GET", tokenPath);
    xhr = this.setupCredentials(xhr);

    var cookie = Settings.getString(this.settingsPrefix + "Drupal-Cookie");
    if (environment != BROWSER) {
        xhr.setRequestHeader("Cookie", cookie);
    }

    xhr.send();
};


/**
 * Establish a session (or return the stored session).
 */
Drupal.prototype.systemConnect = function (success, failure) {

    var self = this;

    // if session exists, token will be required
    var token = Settings.getString(this.settingsPrefix + "X-CSRF-Token");
    if (!token) {
        console.log("will request token before systemConnect");
        self.getCsrfToken(
            function () {
                self.systemConnect(success, failure);
            },
            function (err) {
                failure(err);
            }
        );
        return;
    } else {
        console.log("will systemConnect with token "+token);
    }

    var xhr = createHTTPClient(),
        url = this.REST_PATH + 'system/connect';

    console.log("POSTing to url " + url);

    xhr.open("POST", url);
    xhr = this.setupCredentials(xhr);
    xhr.setRequestHeader("Accept", "application/json");
    
    // required for Titanium Mobile, maybe others?
	xhr.setRequestHeader('Content-Type','application/json; charset=utf-8');

    xhr.setRequestHeader("X-CSRF-Token", token);

    xhr.onload = function () {

        if (xhr.status === 200) {
            var response = xhr.responseText;
            var responseData = JSON.parse(response);

            var cookie = responseData.session_name + '=' + responseData.sessid;
            Settings.setString(self.settingsPrefix + "Drupal-Cookie", cookie);

            success(responseData);
        } else {
            console.log("systemConnect error with " + xhr.status);
            
            if (xhr.status == 401) {
                // token error - get a new one and try again
                Settings.setString(self.settingsPrefix + "X-CSRF-Token", null);
                setTimeout(function(){
                    self.systemConnect(success, failure);
                }, 0);
                return;
            }
            
            console.log(xhr.getAllResponseHeaders());
            console.log(xhr.responseText);
            failure(xhr.responseText);
        }
        
    };
    xhr.onerror = function (e) {
        console.log("There was an error calling systemConnect: ");
        console.log(e);

        // since systemConnect failed, will need a new csrf and session
        Settings.setString(self.settingsPrefix + "X-CSRF-Token", null);
        Settings.setString(self.settingsPrefix + "Drupal-Cookie", null);

        failure(e);
    };

    if (environment === TITANIUM) {
        xhr.clearCookies(this.SITE_ROOT);
    }

    xhr.send();
};


/**
 * Construct and fire arbitrary requests to the connected Drupal server.
 * @TODO: encode and append url params here for GET requests.
 *
 * @param config
 * @param success
 * @param failure
 * @param headers
 *
 * Config properties:
 *     httpMethod: GET, POST, PUT, DELETE, etc.
 *
 *     params: An object to be sent to the server
 *
 *     servicePath: Path to the resource including any url parameters like resource id
 *
 *     contentType: String to send as "Content-Type" HTTP header
 *
 *     trace (boolean): If true, echo the request summary with console.log()
 */
Drupal.prototype.makeRequest = function (config, success, failure, headers) {

    var trace = "makeRequest()\n",
        url = this.REST_PATH + config.servicePath,
        xhr = createHTTPClient();

    trace += config.httpMethod + ' ' + url + "\n";

    // optionally override timeout
    if (config.timeout) {
        xhr.timeout = config.timeout;
    }

    xhr.open(config.httpMethod, url);
    xhr = this.setupCredentials(xhr);

    xhr.onerror = function (e) {

        console.log(JSON.stringify(e));

        console.log('FAILED REQUEST:');
        console.log(trace);
        console.log(config.params);

        failure(e);
    };

    xhr.onload = function () {

        if (xhr.status === 200) {
            var responseData = JSON.parse(xhr.responseText);

            success(responseData);

        } else {
            console.log('makeRequest returned with status ' + xhr.status);
            failure(xhr.responseText);
        }
    };


    xhr.ondatastream = config.progress;

    xhr.setRequestHeader("Accept", "application/json");

    if (config.contentType) {
        xhr.setRequestHeader("Content-Type", config.contentType);
        trace += "Content-Type: " + config.contentType + "\n";
    }

    if (headers) {
        for (var key in headers) {
            trace += key + ": " + headers[key] + "\n";
            xhr.setRequestHeader(key, headers[key]);
        }
    }

    // optionally output a summary of the request
    if (config.trace) {
        console.log(trace);
        console.log(config.params);
    }

    if (config.contentType && config.contentType.replace('application/x-www-form-urlencoded', '') != config.contentType) {
        config.params = Object.keys(config.params).map(function (k) {
            return encodeURIComponent(k) + '=' + encodeURIComponent(config.params[k]);
        }).join('&');
    }

    xhr.send(config.params);
};


/**
 * Make request with the auth headers
 */
Drupal.prototype.makeAuthenticatedRequest = function (config, success, failure, _headers) {

    var headers = _headers || {};

    if (!config.skipCookie && (environment != BROWSER)) {
        var cookie = Settings.getString(this.settingsPrefix + "Drupal-Cookie");
        headers["Cookie"] = cookie;
    }

    if (!config.skipCsrfToken) {
        var token = Settings.getString(this.settingsPrefix + "X-CSRF-Token");
        headers["X-CSRF-Token"] = token;
    }

    this.makeRequest(config, success, failure, headers);
};


/**
 * Attempt to register a new account. user object must include name, pass, mail properties.
 */
Drupal.prototype.createAccount = function (user, success, failure, headers) {

    console.log('Registering new user: ' + JSON.stringify(user) + " with cookie " + Settings.getString(this.settingsPrefix + "Drupal-Cookie"));

    this.makeAuthenticatedRequest({
            httpMethod:'POST',
            servicePath:'user/register.json',
            contentType:'application/json',
            params:JSON.stringify(user)
        },
        //success
        function (responseData) {
            console.log('registerNewUser SUCCESS');
            success(responseData);
        },
        //fail
        function (err) {
            console.log('registerNewUser FAIL');
            failure(err);
        },
        headers
    );
};


/**
 * Construct and send the proper login request.
 */
Drupal.prototype.login = function (username, password, success, failure, headers) {

    var user = {
        username: username,
        password: password
    };

    var self = this;
    this.makeAuthenticatedRequest({
            httpMethod: 'POST',
            servicePath: 'user/login.json',
            contentType: "application/json",
            params: JSON.stringify(user)
        },
        function (responseData) {

            var cookie = responseData.session_name + '=' + responseData.sessid;
            Settings.setString(self.settingsPrefix + "Drupal-Cookie", cookie);
            console.log('login saving new cookie ' + cookie);

            // store new token for this session
            Settings.setString(self.settingsPrefix + "X-CSRF-Token", responseData.token);
            console.log('login saving new token ' + responseData.token);

            success(responseData.user);

        },
        failure, headers);
};


/**
 * Reset a user's password.
 */
Drupal.prototype.resetPassword = function (uid, success, failure, headers) {

    this.makeAuthenticatedRequest({
            httpMethod:'POST',
            servicePath:'user/' + uid + '/password_reset.json',
            contentType:"application/json"
        },
        function (responseData) {

            success(responseData);
        },
        failure, headers
    );
};


/**
 * Become user:uid=0
 */
Drupal.prototype.logout = function (success, failure, headers) {

    var self = this;

    this.makeAuthenticatedRequest({
        httpMethod:'POST',
        servicePath:'user/logout.json'
    }, function (response) {
        // session over - delete the token
        Settings.setString(self.settingsPrefix + "X-CSRF-Token", null);
        success(response);
    }, failure, headers);

};


/**
 * Requires Services Views module
 */
Drupal.prototype.getView = function (viewName, args, success, failure, headers) {
    this.makeAuthenticatedRequest({
        servicePath:"views/" + viewName + ".json?" + this.encodeUrlString(args),
        httpMethod:'GET',
        contentType:"application/json"
    }, success, failure, headers);
};

/**
 * Convenience function for GET requests
 */
Drupal.prototype.getResource = function (resourceName, args, success, failure, headers) {
    this.makeAuthenticatedRequest({
        servicePath:resourceName + ".json?" + this.encodeUrlString(args),
        httpMethod:'GET'
    }, success, failure, headers);
};

/**
 * Convenience function for POST requests
 */
Drupal.prototype.postResource = function (resourceName, object, success, failure, headers) {
    this.makeAuthenticatedRequest({
        servicePath:resourceName + ".json",
        httpMethod:'POST',
        params:JSON.stringify(object)
    }, success, failure, headers);
};

/**
 * Convenience function for PUT requests
 */
Drupal.prototype.putResource = function (resourceName, object, success, failure, headers) {
    this.makeAuthenticatedRequest({
        servicePath:resourceName + ".json",
        httpMethod:'PUT',
        contentType:'application/json',
        params:JSON.stringify(object)
    }, success, failure, headers);
};

/**
 * Convenience function for DELETE requests
 */
Drupal.prototype.deleteResource = function (resourceName, rid, success, failure, headers) {
    this.makeAuthenticatedRequest({
        servicePath:resourceName + "/" + rid + ".json",
        httpMethod:'DELETE'
    }, success, failure, headers);
};

/**
 * The fundamental act of Drupal
 */
Drupal.prototype.createNode = function (node, success, failure) {

    this.makeAuthenticatedRequest({
            servicePath:"node",
            httpMethod:"POST",
            contentType:'application/json',

            params:JSON.stringify({
                node:node
            })
        }, function (response) {
            success(response);
        }, function (response) {
            console.log(JSON.stringify(response));
            failure(response);
        }
    );
};

/**
 * Haven't tested this in a while but it was working in Services 3.2...
 */
Drupal.prototype.uploadFile = function (base64data, filename, filesize, success, failure, progress, headers) {

    var fileDescription = {
        file:base64data,
        filename:filename,
        filesize:"" + filesize
    };

    this.makeAuthenticatedRequest({
        servicePath:"file.json",
        httpMethod:"POST",
        contentType:"application/x-www-form-urlencoded; charset=utf-8",
        params:fileDescription,
        progress:progress
    }, success, failure, headers);
};


/**
 * Create a request string from an object of request parameters.
 */
Drupal.prototype.encodeUrlString = function (args) {
    var parts = [];
    for (var i in args) {
        var arg = args[i];
        parts.push(i + '=' + encodeURIComponent(arg));
    }
    return parts.join('&');
};


Drupal.prototype.setSettingsPrefix = function (p) {
    this.settingsPrefix = p;
};
Drupal.prototype.field = require("./field");

module.exports = Drupal;
