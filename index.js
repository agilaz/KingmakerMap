var express = require('express')
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/static'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/static/map.html');
});



io.on('connection', function(socket){
  console.log('user connected');
  socket.on('change', function(campaignData){
    console.log('New data:\n' + campaignData);
    socket.broadcast.emit('changing', campaignData);
  });
  socket.on('hexUncover', function(hexInfo) {
    console.log('Hex uncovered:\n' + hexInfo.x + ', ' + hexInfo.y);
    socket.broadcast.emit('hexUncover', hexInfo);
  });
});

http.listen(process.env.PORT || 5000, function(){
  console.log('listening on *:' + this.address().port + ', dirname: ' + __dirname);
});

