/**
 * This aims to make XMLHttpRequest look like the Titanium HTTP client drupal-client was originally built to use.
 *
 * @return {*}
 */
exports.createHTTPClient = function (config) {

    var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
    var xhr = new XMLHttpRequest(config);

    xhr.setDisableHeaderCheck(true);

    return xhr;
};

