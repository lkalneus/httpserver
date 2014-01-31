var express = require('express'),
    http = require('http'),
    mongoose = require('mongoose'),
    path = require('path'),
    fs = require('fs'),
    config = require('./config'),
    app = express(),
    httpServer = http.createServer(app);

var mimeTypes = {
    "html": "text/html",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "png": "image/png",
    "js": "text/javascript",
    "css": "text/css"};

app.use(express.cookieParser());
app.use(express.bodyParser());

var dbUrl = 'mongodb://';
//dbUrl += config.get('db:username')+':'+config.get('db:password')+'@';
dbUrl += config.get('db:host')+':'+config.get('db:port');
dbUrl += '/' + config.get('db:name');
mongoose.connect(dbUrl);

var MongoStore = require('connect-mongo')(express);

app.use(express.session({
    secret: config.get('session:secret'),
    key: config.get('session:key'),
    cookie: config.get('session:cookie'),
    store: new MongoStore(
        {
	    mongoose_connection: mongoose.connection
	}//,
//        function(error) {
//            console.log(error || "connect-mongodb setup ok");
//        }
	)
    })
);

app.use(function(req, res, next) {
  req.session.numberOfVisits = req.session.numberOfVisits + 1 || 1;
  res.send("Visits: " + req.session.numberOfVisits);
});

app.use(function(req, res) {
  var uri = url.parse(req.url).pathname;
  var filename = path.join(process.cwd(), unescape(uri));
  var stats;

  try {
    stats = fs.lstatSync(filename); // throws if path doesn't exist
  } catch (e) {
    res.writeHead(404, {'Content-Type': 'text/html'});
    res.write('<h1>404 Not Found</h1>');
    res.end();
    return;
  }


  if (stats.isFile()) {
    // path exists, is a file
    var mimeType = mimeTypes[path.extname(filename).split(".")[1]];
    res.writeHead(200, {'Content-Type': mimeType} );
    var fileStream = fs.createReadStream(filename);
    fileStream.pipe(res);
  } else if (stats.isDirectory()) {
    // path exists, is a directory

    res.writeHead(200, {"Content-Type" : "text/html"});
    res.write('Index of '+uri+'<br>');
    var files = fs.readdirSync(filename);
    for (i in files) {
        res.write('<a href="'+files[i]+'">./'+files[i]+'</a><br>');
    }
    res.end();
  } else {
    // Symbolic link, other?
    // TODO: follow symlinks?  security?
    res.writeHead(500, {'Content-Type': 'text/html'});
    res.write('<h1>500 Internal server error</h1>');
    res.end();
  }
});

httpServer.listen(config.get('port'), function () {
    console.log("Express server listening on port %s.", httpServer.address().port);
});