describe("Drupal", function () {

  var drupal = require('../lib/drupal.js');
  var field = drupal.field;

  var timeout = 2500;
  var fid;

  try {
    var cfg = require("./config.json");
    drupal.setRestPath(cfg.SITE_ROOT, cfg.SERVICES_ENDPOINT);
    console.log("found drupal config: " + JSON.stringify(cfg));
  }
  catch (e) {
    console.log("unable to load drupal config file");
    return;
  }


  describe("can create account & login", function () {

    var username = 'drupalspec' + createRandomString(8);
    var user = {
      name: username,
      pass: createRandomString(8),
      mail: username + '@drupalspec.com',
      status: 1
    };
    var uid = 0;

    logoutIfNecessary();


    it("calls system/connect", function () {

      var connected = false;
      var done = false;

      runs(function () {

        drupal.systemConnect(
          function (responseData) {
            uid = responseData.user.uid;
            console.log("system/connect reported uid " + uid);
            connected = true;
            done = true;
          },
          function (err) {
            connected = false;
            done = true;
          }
        );
      });

      waitsFor(function () {
        return done;
      }, 'timeout connecting', timeout);

      runs(function () {
        expect(connected).toEqual(true);
      });
    });

    logoutIfNecessary();

    it("registers an account", function () {

      var done = false;
      var error = '';
      var response = '';

      runs(function () {

        drupal.createAccount(user,
          //success
          function (res) {
            response = res;
            done = true;
          },
          //failure
          function (e) {
            error = e;
            done = true;
          }
        );
      });

      waitsFor(function () {
        return done;
      }, 'timeout creating account', timeout);

      runs(function () {
        expect(error).toEqual('');
      });

    });


    it("can log in", function () {

      var loggedin = false;
      var done = false;

      // login as the previously created test user
      runs(function () {
        drupal.login(user.name, user.pass,
          function (data) {
            console.log('spec login succeeded with uid ' + data.uid);
            uid = data.uid;
            loggedin = true;
            done = true;
          },
          function (err) {
            console.log(err);
            loggedin = false;
            done = true;
          }
        );
      });

      waitsFor(function () {
        return done;
      }, 'timeout logging in', timeout);

      runs(function () {
        expect(loggedin).toEqual(true);
      });
    });


    it("can load user entity", function () {

      var done = false;
      var success = false;

      runs(function () {
        drupal.getResource('user/' + uid, null,
          function (data) {
            done = true;
            success = true;
          },
          function (err) {
            console.log(err);
            done = true;
            success = false;
          }
        );
      });

      waitsFor(function () {
        return done;
      }, 'timeout loading my user', timeout);

      runs(function () {
        expect(success).toEqual(true);
      });
    });


    it("can create a node", function () {

      var success = false;
      var done = false;

      var node = {
        type: "article",
        title: "test node title",
        body: field.structureField({"value": "test node body"})
      };

      runs(function () {
        drupal.createNode(node,
          function () {
            success = true;
            done = true;
          },
          function (err) {
            console.log(err);
            success = false;
            done = true;
          }
        );
      });

      waitsFor(function () {
        return done;
      }, 'timeout posting a node', timeout);

      runs(function () {
        expect(success).toEqual(true);
      });

    });


    it("can upload a file", function () {

      var success = false;
      var done = false;

      var filename = "image.png";
      var data = require('fs').readFileSync("./test/"+filename);
      var base64data = data.toString('base64');
      var filesize = data.length;

      runs(function () {
        drupal.uploadFile(base64data, filename, filesize,
          function (response) {
            console.log(response);
            fid = response.fid;
            success = true;
            done = true;
          },
          function (err) {
            console.log(err);
            success = false;
            done = true;
          }
        );
      });

      waitsFor(function () {
        return done;
      }, 'timeout posting a node', timeout);

      runs(function () {
        expect(success).toEqual(true);
      });

    });


    it("can create a node with field types", function () {

      var success = false;
      var done = false;

      var testDate = new Date();
      testDate.setYear(1977);
      testDate.setMonth(5);
      testDate.setDate(27);

      var node = {
        type: "complex_content",
        title: "complex test node",
        body: field.structureField("complex node body"),
        field_bool: field.structureField(1),
        field_decimal: field.structureField(.1),
        field_float: field.structureField(2.3),
        field_integer: field.structureField(4),
        field_multiple: field.structureField(["one", "two", "three"]),
        field_file: field.structureField(fid, "fid")

//        field_date: field.structureField(testDate),
//        field_iso_date: field.structureField(testDate)

      };

      console.log(JSON.stringify(node));
      runs(function () {
        drupal.createNode(node,
          function () {
            success = true;
            done = true;
          },
          function (err) {
            console.log(err);
            success = false;
            done = true;
          }
        );
      });

      waitsFor(function () {
        return done;
      }, 'timeout posting a complex node', timeout);

      runs(function () {
        expect(success).toEqual(true);
      });

    });


    it("can log out", function () {

      var loggedout = false;
      var done = false;

      runs(function () {
        if (uid != 0) {
          drupal.logout(
            function () {
              loggedout = true;
              done = true;
            },
            function (err) {
              console.log(err);
              loggedout = false;
              done = true;
            }
          );
        }
        else {
          loggedout = true;
        }
      });

      waitsFor(function () {
        return done;
      }, "timeout logging out", timeout);

    });

  });


  describe("deals with Drupal data types", function () {

    it("serializes filter parameters for drupal", function () {
      var params = {
        'arg[]': [1, 2, 3]
      };
      var request = field.serializeDrupalViewsFilter(params);

      expect(decodeURIComponent(request)).toEqual('arg[]=1&arg[]=2&arg[]=3');
    });

  });


  function logoutIfNecessary() {

    var token = drupal.Settings.getString("X-CSRF-Token");
    var cookie = drupal.Settings.getString("Drupal-Cookie");
    if (token && cookie) {

      it("logs out if necessary", function () {

        var loggedout = false;
        var done = false;

        runs(function () {

          drupal.logout(
            function () {
              drupal.Settings.setString("X-CSRF-Token", null);
              drupal.Settings.setString("Drupal-Cookie", null);
              loggedout = true;
              done = true;
            },
            function () {
              loggedout = false;
              done = true;
            }
          );
        });

        waitsFor(function () {
          return done;
        }, "timeout logging out", timeout);

      });

    }

  }


});


function createRandomString(max) {

  if (max == null) max = 20;
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < max; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}

