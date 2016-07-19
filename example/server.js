var fs = require('fs');
var express = require('express');
var cookieParser = require('cookie-parser');
var serveStatic = require('serve-static');

var app = express();

app.use(cookieParser());
app.use(serveStatic('../'));

app.get('/', function (req, res) {
  res.redirect('example/index.html');
});

app.get('/api/settings', function (req, res) {
  var obj = {
    buildPath: '/dist/mirador',
    tagHierarchy: {},
    endpointUrl: 'http://mirador-annotations-lotb.herokuapp.com',
    firebase: {}
  };
  res.setHeader('Content-Type', 'application/json');
  res.cookie('isEditor', 'true');
  res.cookie('settingsUrl', '');
  res.send(JSON.stringify(obj));
});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('App listening at http://%s:%s', host, port);
});
