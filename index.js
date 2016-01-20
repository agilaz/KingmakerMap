var express = require('express')
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/static'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/static/map.html');
});


var clients = [];

io.on('connection', function(socket){
  //var helpId;
  console.log('user connected');
  // socket.on('need sync', function() {
    // helpId = clients.length;
    // console.log('need sync for: ' + helpId);
    // if(clients.length > 0) {
      // console.log('help from: ' + clients[0].id);
      // clients[0].emit('help sync');
    // }
    // clients.push(socket);
  // });
  // socket.on('helping', function(campaignData) {
    // if(helpId) clients[helpId].emit('import', campaignData);
  // });
  
  socket.on('import', function(campaignData){
    console.log('New data:\n' + campaignData);
    socket.broadcast.emit('import', campaignData);
  });
  socket.on('uncover hex', function(hexInfo) {
    console.log('Hex uncovered: ' + hexInfo.x + ', ' + hexInfo.y);
    socket.broadcast.emit('uncover hex', hexInfo);
  });
  socket.on('cover hex', function(hexInfo) {
    console.log('Hex covered: ' + hexInfo.x + ', ' + hexInfo.y);
    socket.broadcast.emit('cover hex', hexInfo);
  });
  socket.on('move party', function(partyCoords) {
    console.log('Party moved: ' + partyCoords.x + ', ' + partyCoords.y);
    socket.broadcast.emit('move party', partyCoords);
  });
  socket.on('remove marker', function(oldMarker) {
    console.log('Marker removed: ' + oldMarker);
    socket.broadcast.emit('remove marker', oldMarker);
  });
  socket.on('add marker', function(newMarker) {
    console.log('Marker added: ' + newMarker);
    socket.broadcast.emit('add marker', newMarker);
  });
  socket.on('disconnect', function() {
    var index = clients.indexOf(socket);
    if (index != -1) clients.splice(index,1);
  })
});

http.listen(process.env.PORT || 5000, function(){
  console.log('listening on *:' + this.address().port + ', dirname: ' + __dirname);
});

