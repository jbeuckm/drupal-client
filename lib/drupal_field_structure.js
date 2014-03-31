
/**
 * Create the basic field structure for uploading a field.
 */
function structureField(value, _label) {

  // record optional label string or default to "value"
  var label = _label || "value";

  if (isArray(value)) {
    console.log("ARRAY");
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
    return {
      und: [
        { "value": value }
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
  console.log("Object.prototype.toString.call( value ) = "+Object.prototype.toString.call( value ));
  return Object.prototype.toString.call( value ) === '[object Array]';
}

/*
var node = {
  "vid": "12", "uid": "1", "title": "test", "log": "", "status": "1", "comment": "2", "promote": "1", "sticky": "0", "nid": "12", "type": "complex_content", "language": "und", "created": "1396195827", "changed": "1396224646", "tnid": "0", "translate": "0", "revision_timestamp": "1396224646", "revision_uid": "1", "body": {
    "und": [
      {"value": "body text", "summary": "", "format": "filtered_html", "safe_value": "<p>body text</p>\n", "safe_summary": ""}
    ]
  },
  "field_bool": {
    "und": [
      {"value": "1"}
    ]
  },
  "field_decimal": {
    "und": [
      {"value": "0.25"}
    ]
  },
  "field_file": {
    "und": [
      {"fid": "1", "uid": "1", "filename": "poster_sizes.txt", "uri": "public://poster_sizes.txt", "filemime": "text/plain", "filesize": "1250", "status": "1", "timestamp": "1396224646", "rdf_mapping": [], "display": "1", "description": ""}
    ]
  },
  "field_float": {
    "und": [
      {"value": "1.25"}
    ]
  },
  "field_integer": {
    "und": [
      {"value": "2"}
    ]
  },
  "field_float_list": [], "field_text_list": [], "field_term_reference": {
    "und": [
      {"tid": "1"}
    ]
  },
  "field_date": {
    "und": [
      {"value": "2014-03-30 16:15:00", "timezone": "America/Chicago", "timezone_db": "UTC", "date_type": "datetime"}
    ]
  },
  "field_iso_date": {
    "und": [
      {"value": "2014-03-30T16:15:00", "timezone": "America/Chicago", "timezone_db": "UTC", "date_type": "date"}
    ]
  },
  "rdf_mapping": {
    "rdftype": ["sioc:Item", "foaf:Document"], "title": {
      "predicates": ["dc:title"]
    },
    "created": {
      "predicates": ["dc:date", "dc:created"], "datatype": "xsd:dateTime", "callback": "date_iso8601"
    },
    "changed": {
      "predicates": ["dc:modified"], "datatype": "xsd:dateTime", "callback": "date_iso8601"
    },
    "body": {
      "predicates": ["content:encoded"]
    },
    "uid": {
      "predicates": ["sioc:has_creator"], "type": "rel"
    },
    "name": {
      "predicates": ["foaf:name"]
    },
    "comment_count": {
      "predicates": ["sioc:num_replies"], "datatype": "xsd:integer"
    },
    "last_activity": {
      "predicates": ["sioc:last_activity_date"], "datatype": "xsd:dateTime", "callback": "date_iso8601"
    }
  },
  "cid": "0", "last_comment_timestamp": "1396195827", "last_comment_name": null, "last_comment_uid": "1", "comment_count": "0", "name": "joe", "picture": "0", "data": "b:0;", "path": "http://beigerecords.com/joe-test/node/12"
};
*/
