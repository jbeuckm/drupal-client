
(function() {
    if ( typeof Object.prototype.uniqueId == "undefined" ) {
        var id = 0;
        Object.prototype.uniqueId = function() {
            if ( typeof this.__uniqueid == "undefined" ) {
                this.__uniqueid = ++id;
            }
            return this.__uniqueid;
        };
    }
})();


/**
 * This aims to make XMLHttpRequest look like the Titanium HTTP client this library was originally built to use.
 *
 * @return {*}
 */
exports.createHTTPClient = function () {
    var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
    var xhr = new XMLHttpRequest();

    xhr.setDisableHeaderCheck(true);

    xhr.onreadystatechange = function () {

//        console.log("http client "+this.uniqueId()+" state " + this.readyState);

        if (this.readyState == 4) {
//            this.onload();
        }
    };

    return xhr;
};

