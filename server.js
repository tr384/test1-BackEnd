var express = require("express");
var path = require("path");
var morgan = require("morgan");
var cors = require("cors");
var fs = require("fs");
var app = express();

let propertiesReader = require("properties-reader");
let propertiesPath = path.resolve(__dirname, "conf/db.properties");
let properties = propertiesReader(propertiesPath);
let dbPprefix = properties.get("db.prefix");
//URL-Encoding of User and PWD
//for potential special characters
let dbUsername = encodeURIComponent(properties.get("db.user"));
let dbPwd = encodeURIComponent(properties.get("db.pwd"));
let dbName = properties.get("db.dbName");
let dbUrl = properties.get("db.dbUrl");
let dbParams = properties.get("db.params");
const uri = dbPprefix + dbUsername + ":" + dbPwd + dbUrl + dbParams;

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
let db = client.db(dbName);

app.set("json spaces", 3);
app.use(morgan("short"));
app.use(cors());
app.use(express.json());  //we need this to parse json received in the requests
                          //(e.g., to read json passed in req.body)

/* app.use(function (req, res, next) {
    console.log("Request URL:" + req.url);
    console.log("Request Date:" + new Date());
    next();
}); */


app.param("collectionName", function (req, res, next, collectionName) {
    req.collection = db.collection(collectionName);
    return next();
  });
  
  app.get("/", function (req, res, next) {
    res.send("choose collection e.g /collections/lessons");
    
  });
  
  app.get("/collections/:collectionName", function (req, res, next) {

    req.collection.find({}).toArray(function (err, results) {
      if (err) {
        return next(err);
      }
      res.send(results);
    });
  });

  async function searchLesson(searchTerm) { // search lesson function allows the mongodb used to search for the lessons matching in the database from the collections
    return client
      .db("project")
      .collection("lessons") 
      .find({
        topic: { $regex: searchTerm, $options: "is" },
      })
      .toArray();
    }


app.post("/collections/:collectionName", function (req, res, next) {
  xyz = req.body;
  // req.body.id = new ObjectId();
  req.collection.insertOne(xyz, function (err, results) {
    if (err) {
      return next(err);
    }
    res.send(results);
  });
});

app.put("/collections/:collectionName/:id", function (req, res, next) {
  const lesson = req.params.id;
  const space = req.body.space;
  const updateLesson = (lesson, space) => {
    req.collection.findOneAndUpdate(
      { _id: new ObjectId(lesson) },
      { $set: { space: -space } },
      (err, result) => {
        if (err) throw err;
      }
    );
  };
  updateLesson(lesson, space);

  res.send("Lesson updated successfully");
});

  app.put("/collections/:collectionName/:id", function (req, res, next) {
    var id = req.params.id;
    var space = req.body.space;
    req.collection.updateOne(
      { _id: new ObjectId(id) },
      { $inc: { space: -space } },
      function (err, results) {
        if (err) {
          return next(err);
        }
        res.send(results);
      }
    );
  });
  
  app.get(
    "/collections/:collectionName/search/:query",
    function (req, res, next) {
      //const searchText = req.query.search;
      let searchText = req.params.query;
  
      let query = {};
      query = {
        $or: [
          { topic: { $regex: searchText, $options: "i" } },
          { location: { $regex: searchText, $options: "i" } },
        ],
      };
      req.collection.find(query, {}).toArray(function (err, results) {
        if (err) {
          return next(err);
        }
        res.send(results);
      });
    }
  );
  app.get("/collections/:collectionName/search", function (req, res, next) {
    req.collection.find({}).toArray(function (err, results) {
      if (err) {
        return next(err);
      }
      res.send(results);
    });
  });
  app.post("/collections/:collectionName", function (req, res, next) {
    xyz = req.body;
    // req.body.id = new ObjectId();
    req.collection.insertOne(xyz, function (err, results) {
      if (err) {
        return next(err);
      }
      res.send(results);
    });
  });

  app.get('/collections/:collectionName/:id'
  , function(req, res, next) {
  req.collection.findOne({ _id: new ObjectId(req.params.id) }, function(err, results) {
  if (err) {
  return next(err);
  }
  res.send(results);
  });
  });

  app.post('/collections/:collectionName'
, function(req, res, next) {
// TODO: Validate req.body
req.collection.insertOne(req.body, function(err, results) {
if (err) {
return next(err);
}
res.send(results);
});
});

app.delete('/collections/:collectionName/:id'
, function(req, res, next) {
req.collection.deleteOne(
{_id: new ObjectId(req.params.id)}, function(err, result) {
if (err) {
return next(err);
} else {
res.send((result.deletedCount === 1) ? {msg: "success"} : {msg: "error"});
}
}
);
});

app.put('/collections/:collectionName/:id'
, function(req, res, next) {
// TODO: Validate req.body
req.collection.updateOne({_id: new ObjectId(req.params.id)},
{$set: req.body},
{safe: true, multi: false}, function(err, result) {
if (err) {
return next(err);
} else {
res.send((result.matchedCount === 1) ? {msg: "success"} : {msg: "error"});
}
}
);
});

app.get('/collections/:collectionName/:max/:sortAspect/:sortAscDesc'
, function(req, res, next) {
// TODO: Validate params
var max = parseInt(req.params.max, 10); // base 10
let sortDirection = 1;
if (req.params.sortAscDesc === "desc") {
sortDirection = -1;
}
req.collection.find({}, {limit: max, sort: [[req.params.sortAspect,
sortDirection]]}).toArray(function(err, results) {
if (err) {
return next(err);
}
res.send(results);
});
});


 // Logger middleware
app.use(function (req, res, next) {
    console.log("Request URL:" + req.url);
    console.log("Request Date:" + new Date());
    next();
  });
  
  // Static file middleware
  /* app.use(function(req, res, next){
    var filePath = path.join(__dirname, "images", req.url);
    fstat.stat(filePath, function(err, fileInfo){
      if (err){
        next();
        return;
      }
      if (fileInfo.isFile()) {
        res.sendFile(filePath);
      } else {
        next();
      }
    });
  });
  app.use(function(req,res) {
    res.status(404);
    res.send("file not found");
  })
 */
  app.get("http://newcw2-env.eba-sw23cwmq.eu-west-2.elasticbeanstalk.com/search/:searchTerm", async (req, res) => {  
    const result = await searchLesson(req.params.searchTerm);
    res.send(result);
  });

  var staticPath = path.join(__dirname, "images");
  app.use(express.static(staticPath));
  
  
  const port = process.env.PORT || 3000;
app.listen(port, function() {
console.log("App started on port: " + port);
});
  
