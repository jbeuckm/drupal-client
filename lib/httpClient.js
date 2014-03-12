
function httpClient() {

}
httpClient.prototype.open = function(method, url) {

};


exports.createHTTPClient = function() {
    var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
    var xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function() {

        if (this.readyState == 4) {

            if (this.onload) {
                this.onload();
            }
        }
    };

    return xhr;
};

