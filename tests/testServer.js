var aws = require('aws-sdk');
var helpers = require('../server/helpers.js');
var routes = require('../server/routes.js');
var expect = require('chai').expect;
var request = require('request');
var db = new aws.DynamoDB();
var dbSchema = new aws.DynamoDB.DocumentClient();

var serverURI = 'http://localhost:' + (process.env.PORT || 8080);

aws.config.update({
  accessKeyId: "fakeAccessKey",
  secretAccessKey: "fakeSecretAccessKey",
  region: "fakeRegion",
  endpoint: new aws.Endpoint('http://localhost:8000')
});

describe("Persistent Spot and User Server", function() {
  beforeEach(function(done) {
    params = {
      TableName: 'Spots',
      Item: {
        spotId: 999999999999,
        name: "test1", 
        creator: 'Johnny', 
        category: 'entertainment',
        location: {"latitude":"44.974893","longitude":"-93.40843999999998"},
        description: 'test createSpot',
        description_lc: 'test createSpot',
        creatorId: 1,
        start: '10'
      }
    };
    dbSchema.put(params, function(err, data) {
      if (err) {console.error("Error creating Johnny's spot", err);}
      params = {
      TableName: 'Users',
      Item: {
        userId: 999999999999,
        username: 'Johnny',
        password: 'password',
        email: 'test@gmail.com',
        followers: [],
        following: [],
        spotCount: 0,
        bio: 'empty',
        img: 'fake'
        } 
      };
      dbSchema.put(params, function(err, data) {
        if (err) {console.error("Error creating Johnny", err);}
        done();
      });
    });
  });
  afterEach(function(done) {
    var params = {
    TableName: 'Spots',
    FilterExpression: "#name = (:name)",
    ExpressionAttributeNames:{
        "#name": "name"
      },
    ExpressionAttributeValues: {
        ":name": 'test1'
      }
    };
    dbSchema.scan(params, function(err, data) {
      if (err) {console.error(err);}
      //if any spots were found with name of 'test1', delete each of them
      if (data.Count > 0) {
        var deleteSpot = function(list) {
          var params = {
            TableName: "Spots",
            Key: {
              spotId: list[0].spotId
            }
          };
          dbSchema.delete(params, function(err, data) {
            list.shift();
            if (list.length) {
              deleteSpot(list);
            } else {
              params = {
                TableName: 'Users',
                FilterExpression: "#email = (:email)",
                ExpressionAttributeNames:{
                    "#email": "email"
                },
                ExpressionAttributeValues: {
                    ":email": 'test@gmail.com'
                }
              };
              dbSchema.scan(params, function(err, data) {
                if (err) {console.error(err);}
                if (data.Count > 0) {
                  var deleteUser = function(userList) {
                    params = {
                      TableName: 'Users',
                      Key: {
                        userId: userList[0].userId
                      }
                    };
                    dbSchema.delete(params, function(err, data) {
                      if (err) {console.error("Error deleting test users ", err);}
                      else {
                        userList.shift();
                        if (userList.length) {
                          deleteUser(userList);
                        } else {
                          done();
                        }
                      }
                    });
                  };
                  deleteUser(data.Items);
                } else {
                  done();
                }
              });
            }
          });
        };
        deleteSpot(data.Items);
      } else {
        params = {
          TableName: 'Users',
          FilterExpression: "#email = (:email)",
          ExpressionAttributeNames:{
              "#email": "email"
          },
          ExpressionAttributeValues: {
              ":email": 'test@gmail.com'
          }
        };
        dbSchema.scan(params, function(err, data) {
          if (err) {console.error(err);}
          if (data.Count > 0) {
            var deleteUser = function(userList) {
              params = {
                TableName: 'Users',
                Key: {
                  userId: userList[0].userId
                }
              };
              dbSchema.delete(params, function(err, data) {
                if (err) {console.error("Error deleting test users ", err);}
                else {
                  userList.shift();
                  if (userList.length) {
                    deleteUser(userList);
                  } else {
                    done();
                  }
                }
              });
            };
            deleteUser(data.Items);
          } else {
            done();
          }
        });
      }
    });
  });

  it('should return a 200 when getting a spot', function(done) {
    request({
      method: "GET",
      uri: serverURI + "/api/spot/999999999999"
    }, function (err, res, body){
      if (err) {
        console.error("Error getting Johnny's spot ", err);
      }
      body = JSON.parse(body);
      expect(res.statusCode).to.equal(200);
      expect(body.spotId).to.equal(999999999999);
      expect(body.creator).to.equal('Johnny');
      done();
    });
  });
  it('should return a 200 when getting a user\'s profile', function(done) {
    request({
      method: "GET",
      uri: serverURI + "/api/profile/999999999999"
    }, function (err, res, body){
      if (err) {
        console.error("Error getting Johnny's profile ", err);
      }
      body = JSON.parse(body);
      expect(res.statusCode).to.equal(200);
      expect(body.result.userId).to.equal(999999999999);
      expect(body.result.username).to.equal('Johnny');
      done();
    });
  });
  it('should return a 404 when user has wrong password', function(done) {
    request({
      method: "POST",
      uri: "http://localhost:8080/api/login",
      json: {
        username: "Johnny",
        password:  "wrong",
        email:  "test@gmail.com"
      }
    }, function(err, res, body) {
      if (err) {
        console.error("Error logging Johnny in ", err);
      }
      expect(res.statusCode).to.equal(404);
      expect(body).to.be.not.empty;
      done();
    });
  });
  it('should be able to serve the main page', function(done) {
    request({
      method: "GET",
      uri: serverURI
    }, function (err, res, body){
      if (err) {
        console.error("Error getting main page ", err);
      }
      expect(res.statusCode).to.equal(200);
      expect(body).to.be.not.empty;
      expect(body).to.contain('<div');
      done();
    });
  });
  it('should return a 200 when searching', function(done) {
    request({
      method: "POST",
      uri: "http://localhost:8080/api/search",
      json: {
        search: "test"
      }
    }, function(err, res, body) {
      if (err) {
        console.error("Error creating new spot ", err);
      }
      expect(res.statusCode).to.equal(200);
      expect(body).to.be.not.empty;
      done();
    });
  });
  it('should return a 200 when signing up a user and when logging in a user', function(done) {
    request({
      method: "POST",
      uri: "http://localhost:8080/api/signup",
      json: {
        username: "test",
        password:  "test",
        email:  "test@gmail.com"
      }
    }, function(err, res, body) {
      if (err) {
        console.error("Error signing up user ", err);
      }
      expect(res.statusCode).to.equal(200);
      expect(body).to.be.not.empty;
      request({
        method: "POST",
        uri: "http://localhost:8080/api/login",
        json: {
          username: "test",
          password:  "test"
        }
      }, function(err, res, body) {
        if (err) {
          console.error("Error logging Johnny in ", err);
        }
        expect(res.statusCode).to.equal(200);
        expect(body).to.be.not.empty;
        expect(body.token).to.be.not.empty;
        done();
      });
    });
  });
  //==============helper function tests==============
  it("should create spots and be able to search for spots", function(done){
    helpers.createSpot({
      name: "test1", 
      creator: 'bob',
      creatorId: 4, 
      category: 'entertainment',
      location: 'Minnesota',
      description: 'test createSpot',
      start: '10',
      addresss: 'fake',
      end: 'never'
    }, function(){
      params = {
        TableName: "Spots",
        FilterExpression: "#location = (:location)",
        ExpressionAttributeNames:{
            "#location": "location"
        },
        ExpressionAttributeValues: {
            ":location": 'Minnesota'
        }
      };
      dbSchema.scan(params, function(err, data){
        if (err) {
          console.error("Error: ", err);
        }
        else {
          var spot = data.Items[0];
          expect(spot.name).to.equal('test1');
          expect(spot.creator).to.equal('bob');
          expect(spot.location).to.equal('Minnesota');
          helpers.search('bo', function(results){
            expect(results.length).to.be.above(0);
            expect(results[0].creator).to.contain('bo');
            done();
          }, function(err){
            console.error("Failed to search for spot", err);
            //to fail test on error
            expect(1).to.equal(2);
            done();
          });
        }
      });
    }, function(err){
      console.error("Error: ", err);
      //to fail test on error
      expect(1).to.equal(2);
      done();
    });
  });
  it('should sign users up and be able to search for users', function(done) {
    helpers.signup({
      username: 'Bob',
      password: 'password',
      email: 'test@gmail.com'
    }, 
    function(user){
      helpers.search('Bob', function(users) {
        expect(user.userId).to.exist;
        done();
      }, 
      function(err) {
        console.error('Failed in search for Bob', err);
        //to fail test on error
        expect(1).to.equal(2);
        done();
      });
    }, function(err){
      console.error("Bob's Error: ", err);
      //to fail test on error
      expect(1).to.equal(2);
      done();
    });
  });
  it('should be able to get spots', function(done) {
    helpers.getSpots({"latitude":"44.974893","longitude":"-93.40843999999998"}, function(array){
      expect(array).to.be.an('array');
      expect(array.length).to.be.above(0);
      done();
    }, function(err){
      console.error('Error getting spots', err);
      //to fail test on error
      expect(1).to.equal(2);
      done();
    });
  });
  it('should get user\' profile', function(done) {
    helpers.getProfile(999999999999, function(profile){
      expect(profile.userId).to.exist;
      expect(profile.username).to.equal('Johnny');
      done();
    }, function(err){
      console.error("Error getting Johnny\'s profile", err);
      //to fail test on error
      expect(1).to.equal(2);
      done();
    });
  });
  it('should get a spot', function(done) {
    helpers.getSpot(999999999999, function(found){
      expect(found.spotId).to.equal(999999999999);
      expect(found.name).to.equal('test1');
      expect(found.category).to.equal('entertainment');
      done();
    }, function(err) {
      console.error("error getting Johnny's spot", err);
      //to fail test on error
      expect(1).to.equal(2);
      done();
    });
  });
});