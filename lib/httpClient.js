
function httpClient() {

}
httpClient.prototype.open = function(method, url) {

};

/**
 * This aims to make XMLHttpRequest look like the Titanium HTTP client this library was originally built to use.
 *
 * @return {*}
 */
exports.createHTTPClient = function() {
    var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
    var xhr = new XMLHttpRequest();

    xhr.setDisableHeaderCheck(true);

    xhr.onreadystatechange = function() {

        if (this.readyState == 4) {

          console.log("status = "+this.status);

            if (this.onload) {
                this.onload();
            }
        }
    };

    return xhr;
};

