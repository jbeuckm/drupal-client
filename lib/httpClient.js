
/**
 * This aims to make XMLHttpRequest look like the Titanium HTTP client this library was originally built to use.
 *
 * @return {*}
 */
exports.createHTTPClient = function () {
    var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
    var xhr = new XMLHttpRequest();

    xhr.setDisableHeaderCheck(true);

    xhr.addEventListener("progress", function(){

      if (xhr.ondatastream) {
        xhr.ondatastream({
          loaded: xhr.loaded
        });
      }

    });

  return xhr;
};

