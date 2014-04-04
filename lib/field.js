
/**
 * Create the basic field structure for uploading a field.
 */
function structureField(value, _label) {

  // record optional label string or default to "value"
  var label = _label || "value";

  if (isArray(value)) {

    var field_array = [];
    for (var i= 0, l=value.length; i<l; i++) {
      var item = {};
      item[label] = value[i];

      field_array.push(item);
    }
    return {
      und: field_array
    };
  }

  if (value instanceof Date) {

    var ts = value.getTime();
    ts = ts - (ts % 1000);
    value.setTime(ts);

    var obj = {
      value: value.toJSON()
    };

    return {
      und: [
        obj
      ]
    };
  }

  // field value given with label(s) already built
  if (typeof value == "object") {
    return {
      und: [
        value
      ]
    }
  }


  var item = {};
  item[label] = value;

  return {
    und: [
      item
    ]
  };
}
exports.structureField = structureField;


function isArray(value) {
  return Object.prototype.toString.call( value ) === '[object Array]';
}



/**
 * Do the custom serialization for sending drupal views contextual filter settings
 *
 * @param {Object} obj
 */
function serializeDrupalViewsFilter(obj) {
  var str = [];
  for (var p in obj) {
    if (obj[p]  instanceof Array) {

      for (var i = 0, l = obj[p].length; i < l; i++) {
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p][i]));
      }
    }
    else {
      str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
    }
  }
  return str.join("&");
}

exports.serializeDrupalViewsFilter = serializeDrupalViewsFilter;


