
function httpClient() {

}
httpClient.prototype.open = function(method, url) {

};


exports.createHTTPClient = function() {
    var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
    return new XMLHttpRequest();
};

