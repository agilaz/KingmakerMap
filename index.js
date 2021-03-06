var express = require('express')
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);


var getVersion = (campaignData) => {
    var lineIndex = campaignData.indexOf('mapVersion');
    var versionStr = campaignData.substring(campaignData.indexOf(':', lineIndex) + 1, campaignData.indexOf('\n', lineIndex));
    return parseInt(versionStr) || -1;
  };

app.use(express.static(__dirname + '/static'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/static/map.html');
});


var clients = [];
var latestData = '';
var latestVersion = -1;

io.on('connection', function(socket){
  
  
  var syncNeededData = [];
  console.log('user connected');
  socket.on('need sync', function(currentData) {
    // var helpId;
    // syncNeededData.push(currentData);
    // helpId = clients.length;
    // console.log('need sync for: ' +helpId + '\n' + syncNeededData);
    // clients.push(socket);
    // if(clients.length > 1) {
      // console.log('help from: ' + clients[0].id);
      // clients[0].emit('help sync', helpId);
    // }
    console.log('NEW CAMPAIGN DATA FROM ' + socket + '\n' + currentData + '\n');
    var version = getVersion(currentData);
    if (latestVersion > version) socket.emit('import', latestData);
    else if (latestVersion < version && latestData !== currentData){
      latestData = currentData;
      latestVersion = version;
      socket.broadcast.emit('import',currentData);
    }
    console.log('Latest data:\n' + latestData);
  });
  /* socket.on('helping', function(campaignData, helpId) {
    //console.log(syncNeededData);
    console.log('overwriting: ' + helpId + '\n' + syncNeededData[helpId]);
    console.log('sending: \n' + campaignData);
    if (campaignData != syncNeededData[helpId]) {
      console.log('sending import data to ' + helpId);
      console.log('clients:\n' + clients);
      clients[helpId].emit('import', campaignData);
    } 
  }); */
  
  socket.on('import', function(campaignData){
    console.log('New data:\n' + campaignData);
    var version = getVersion(campaignData);
    if (version > latestVersion) {
      socket.broadcast.emit('import', campaignData);
      latestData = campaignData;
      latestVersion = version;
    }
  });
  socket.on('uncover hex', function(hexInfo, campaignData) {
    latestData = campaignData;
    console.log('Hex uncovered: ' + hexInfo.x + ', ' + hexInfo.y);
    socket.broadcast.emit('uncover hex', hexInfo);
  });
  socket.on('cover hex', function(hexInfo, campaignData) {
    latestData = campaignData;
    console.log('Hex covered: ' + hexInfo.x + ', ' + hexInfo.y);
    socket.broadcast.emit('cover hex', hexInfo);
  });
  socket.on('claim hex', function(hexInfo, campaignData) {
    latestData = campaignData;
    console.log('Hex claimed: ' + hexInfo.x + ', ' + hexInfo.y);
    socket.broadcast.emit('claim hex', hexInfo);
  });
  socket.on('unclaim hex', function(hexInfo, campaignData) {
    latestData = campaignData;
    console.log('Hex unclaimed: ' + hexInfo.x + ', ' + hexInfo.y);
    socket.broadcast.emit('unclaim hex', hexInfo);
  });
  socket.on('search hex', function(hexInfo, campaignData) {
      latestData = campaignData;
      console.log('Hex searched: ' + hexInfo.x + ', ' + hexInfo.y);
      socket.broadcast.emit('search hex', hexInfo);
  });
  socket.on('unsearch hex', function(hexInfo, campaignData) {
      latestData = campaignData;
      console.log('Hex unsearched: ' + hexInfo.x + ', ' + hexInfo.y);
      socket.broadcast.emit('unsearch hex', hexInfo);
  });
  socket.on('move party', function(partyCoords) {
    console.log('Party moved: ' + partyCoords.x + ', ' + partyCoords.y);
    socket.broadcast.emit('move party', partyCoords);
  });
  socket.on('remove marker', function(oldMarker, campaignData) {
    latestData = campaignData;
    console.log('Marker removed: ' + oldMarker);
    socket.broadcast.emit('remove marker', oldMarker);
  });
  socket.on('add marker', function(newMarker, campaignData) {
    latestData = campaignData;
    console.log('Marker added: ' + newMarker);
    socket.broadcast.emit('add marker', newMarker);
  });
  socket.on('disconnect', function() {
    // var index = clients.indexOf(socket);
    // if (index != -1) clients.splice(index,1);
  })
});

http.listen(process.env.PORT || 5000, function(){
  console.log('listening on *:' + this.address().port + ', dirname: ' + __dirname);
});

