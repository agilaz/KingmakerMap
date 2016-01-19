var express = require('express')
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/map'));

app.get('/', function(req, res){
  console.log(__dirname);
  res.sendFile(__dirname + '/map/map.html');
});

app.get('/map.js', function(req, res) {
  res.sendFile(__dirname + '/map.js');
});

io.on('connection', function(socket){
  console.log('user connected');
  socket.on('change', function(campaignData){
    console.log('New data:\n' + campaignData);
    socket.broadcast.emit('changing', campaignData);
  });
});

http.listen(process.env.PORT || 5000, function(){
  console.log('listening on *:' + this.address().port + ', dirname: ' + __dirname);
});

