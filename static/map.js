String.prototype.toId = function() {
    return this.replace(/[^a-zA-Z0-9]/g, '_');
}

var url = "http://hthskingmaker.herokuapp.com/";
var socket = io.connect(url);

var editing = false;

$.fn.editElement = function (callback, inputCallback) {
    editing = true;
    var oldValue = $(this).text();
    var input;
    if (inputCallback)
        input = inputCallback(this, oldValue);
    else if ($(this).find("input").length) {
        input = false;
    } else {
        input = $("<input></input>").val(oldValue);
        input.attr("size", oldValue.length);
    }
    if (!input) {
        return;
    }
    $(this).empty();
    $(this).append(input);
    input.focus();
    var parentElt = this;
    $(input).blur(function () {
        editing = false;
        var newValue = input.val();
        $(parentElt).text(newValue);
        if (callback)
            callback(parentElt, newValue, oldValue);
    }).keydown(function (evt) {
        if (evt.which == 13) { // enter
            input.blur();
        } else if (evt.which == 27) { // escape
            input.val(oldValue);
            input.blur();
        } else if (evt.which == 9) { // tab
            var parent = input.parent();
            var next = (evt.shiftKey) ? parent.prev() : parent.next();
            if (next && $.data(next.get(0), 'events').click) {
                next.trigger("click");
                evt.preventDefault();
            }
        }
    });
    return this;
};

$.fn.makeEditable = function (callback, inputCallback) {
    $(this).click($.proxy(function () {
        if (!editing) {
            $(this).editElement(callback, inputCallback);
        }
    }, this));
    return this;
};

$.fn.setSelect = function (options, keepSelected, newSelectedValue) {
    var select = this;
    var selectedValue = (newSelectedValue) ? newSelectedValue : select.val();
    if (typeof(options) == "number") {
        options = options.numberRange();
    } else if (!options) {
        options = [];
    }
    if (select.is('select')) {
        var value = selectedValue || '';
        select.empty();
        if (keepSelected && options.indexOf(value) < 0)
            select.append($('<option></option>').text(value));
    } else {
        select = $("<select></select>");
        this.empty().append(select);
    }
    $.each(options, $.proxy(function (index, value) {
        var option = $('<option></option>').text(value);
        if (value == selectedValue)
            option.attr('selected', true);
        select.append(option);
    }, this));
    return select;
};

var preventTouchScroll = false;

$.fn.makeDraggable = function makeDraggable(args) {
    var target = args.target || this;
    this.on('mousedown touchstart', function (evt) {
	var offset = target.offset();
	var eventOffset = getEventOffset(evt);
	var dx = offset.left - eventOffset.left;
	var dy = offset.top - eventOffset.top;
	if (args.start) {
	    if (args.start()) {
		return; // don't drag if start return true
	    }
	}
	preventTouchScroll = true;
	$(document).on('mousemove.dragdrop touchmove.dragdrop', function (moveEvt) {
	    var eventOffset = getEventOffset(moveEvt);
	    var x = eventOffset.left + dx;
	    var y = eventOffset.top + dy;
	    target.offset({ left: x, top: y });
	    if (args.drag) {
		args.drag(x, y, moveEvt);
	    }
	});
	$(document).on('mouseup.dragdrop touchend.dragdrop', function (upEvt) {
	    preventTouchScroll = false;
	    $(document).unbind('.dragdrop');
	    if (args.drop) {
		args.drop(target);
	    }
	});
	evt.preventDefault();
    });
}

$.fn.transform = function transform(xform) {
    this.css({ 'transform': xform, '-moz-transform': xform, '-webkit-transform': xform, '-o-transform': xform });
};

$.fn.clip = function clip(top, right, bottom, left) {
    this.css({ 'clip': 'rect(' + top + 'px, ' + right + 'px, ' + bottom + 'px, ' + left + 'px)' });
};

var Class = {
    create: function(settings) {
        var newClass = function() {
            this.init.apply(this, arguments);
        }
        newClass.prototype.init = function() {};
        $.extend(newClass.prototype, settings);
        return newClass;
    }
};

function sanitiseURL(src) {
    if (src.indexOf('http://') != 0 && src.indexOf('https://') != 0) {
        var trimPos = (src.lastIndexOf('/') + 1) || (src.lastIndexOf('\\') + 1);
        src = src.substring(trimPos);
    }
    return src;
}

var Choices = Class.create({

    currentVersion: 1,

    init: function (name, basePrefix) {
        this.basePrefix = basePrefix || 'greenbeltMap.';
        this.name = name || '';
        this.prefix = this.basePrefix + this.name + '.';
	this.updaters = [];
        if (!this.supportsLocalStorage())
        {
            this.data = {};
            this.isLocalStorage = false;
            alert("Local storage not available in your browser - changes will be lost when you leave.");
        }
        else
        {
            this.data = localStorage;
            this.isLocalStorage = true;
        }
    },

    supportsLocalStorage: function() {
        return ('localStorage' in window && window['localStorage'] !== null);
    },

    set: function (name, value) {
        if (value instanceof Array)
            value = value.join("|");
        this.data[this.prefix + name] = value;
        $('input[name="' + name + '"]').val(value);
    },

    get: function (name) {
        return this.data[this.prefix + name];
    },

    getArray: function (name) {
        var result = this.data[this.prefix + name];
        if (result)
            return result.split("|");
        else
            return [];
    },

    clear: function (name) {
        var value = this.data[this.prefix + name];
        if (this.isLocalStorage)
            this.data.removeItem(this.prefix + name);
        else
            delete(this.data[this.prefix + name]);
        return value;
    },

    clearAll: function () {
        var keys = this.getKeys();
        $.each(keys, $.proxy(function (index, key) {
	    this.clear(key);
	}, this));
    },

    getKeys: function () {
        if (this.isLocalStorage)
        {
            var result = [];
            for (var index = 0; index < this.data.length; ++index)
            {
                var key = this.data.key(index);
                if (key.indexOf(this.prefix) == 0)
                {
                    key = key.substring(this.prefix.length);
                    result.push(key);
                }
            }
            return result;
        }
        else
            return Object.keys(this.data);
    },

    changeId: function (oldId, newId, remove) {
        var keys = this.getKeys();
        $.each(keys, $.proxy(function (index, key)
        {
            if (key.indexOf(oldId) == 0)
            {
                var value = this.clear(key)
                if (!remove)
                {
                    var newKey = newId + key.substring(oldId.length);
                    this.set(newKey, value);
                }
            }
        }, this));
    },

    setName: function (name) {
        name = name || '';
        var oldPrefix = this.name.toId() + '.';
        var newPrefix = name.toId() + '.';
        this.prefix = this.basePrefix;
        this.changeId(oldPrefix, newPrefix, false);
        this.name = name;
        this.prefix = this.basePrefix + this.name + '.';
	this.updateData();
    },

    removeName: function () {
        var oldPrefix = this.name.toId() + '.';
        this.prefix = this.basePrefix;
        this.changeId(oldPrefix, '', true);
    },

    setUpdater: function (version, updater) {
	this.updaters[version] = updater;
	if (this.currentVersion <= version) {
	    this.currentVersion = version + 1;
	}
    },

    updateData: function () {
	var loadVersion = this.get('version') || 1;
	while (loadVersion < this.currentVersion) {
	    var updater = this.updaters[loadVersion];
	    if (updater) {
		$.each(this.getKeys(), $.proxy(function (index, oldKey) {
		    var update = updater(oldKey, this.get(oldKey));
		    if (update) {
			this.clear(oldKey)
			this.set(update[0], update[1]);
		    }
		}, this));
	    }
	    loadVersion++;
	}
	this.set('version', this.currentVersion);
    }

});

var Marker = Class.create({

    init: function (x, y, angle, src, textSide, title) {
        if (x instanceof Marker) {
            var other = x;
            x = other.x;
            y = other.y;
            angle = other.angle;
            src = other.src;
            textSide = other.textSide;
            title = other.title;
        } else if (y == undefined) {
            var data = x.split(',');
            var index = 0;
            x = data[index++];
            y = data[index++];
            var angle = data[index++];
            if (isNaN(angle)) {
                src = angle;
                angle = 0;
            } else {
                src = data[index++];
            }
            textSide = data[index++];
            if (data.length == 4 || $.inArray(textSide, ['above', 'below', 'left', 'right', 'noLabel']) < 0) {
                textSide = 'right';
                title = data.slice(index - 1).join(',');
            } else {
                title = data.slice(index).join(',');
            }
        }
        this.x = parseInt(x);
        this.y = parseInt(y);
        this.angle = angle;
        this.src = src;
        this.textSide = textSide || 'right';
        this.title = title || '';
    },

    toString: function () {
        return this.x + ',' + this.y + ',' + this.angle + ',' + this.src + ',' + this.textSide + ',' + this.title;
    },

    getElement: function () {
        if (!this.marker) {
            this.marker = $('<div />');
            var markerImg = $('<img />');
            markerImg.attr('src', this.src);
            this.marker.append(markerImg);
            this.marker.addClass('marker');
            var textSide = 'below';
            var label = $('<span />').addClass('markerText').addClass(this.textSide).html(this.title);
            this.marker.append(label);
            current.applyZoom(markerImg, this.src);
            this.setAngle(this.angle);
            this.marker.css({ left: this.x, top: this.y });
            this.marker.data('marker', this);
            console.log(this.marker);
        }
        return this.marker;
    },

    setX: function (x) {
        this.x = x;
        this.getElement().css({ left: this.x });
    },

    setY: function (y) {
        this.y = y;
        this.getElement().css({ top: this.y });
    },

    setSrc: function (src) {
        this.src = src;
        this.getElement().find('img').attr('src', this.src);
    },

    setTextSide: function (textSide) {
        this.textSide = textSide;
        var label = this.getElement().find('span');
        label.removeClass('above below left right noLabel');
        label.addClass(this.textSide);
    },

    setAngle: function (angle) {
	this.angle = angle || 0;
        var label = this.getElement().find('span');
	label.transform('rotate(' + angle + 'deg)');
    },

    setTitle: function (title) {
        this.title = title;
        this.getElement().find('span').html(this.title);
    }

});

var Campaign = Class.create({

    emptyName: '<Click to Change>',

    hexNativeHeight: 183,
    hexNativeWidth: 183,

    store: new Choices(this.emptyName),

    init: function (name) {
	this.setStoreUpdaters();
        if (!name) {
            name = this.emptyName;
        }
        this.setName(name);
        this.iconOriginal = {};
        this.revertIconImages();
        this.explored = {};
        $.each(this.store.getArray('explored'), $.proxy(function (index, hexId) {
            this.explored[hexId] = 1;
        }, this));
        markerData = this.store.getArray('markers');
        this.markerList = [];
        $.each(markerData, $.proxy(function (index, data) {
            this.markerList.push(new Marker(data));
        }, this));
        var coords = this.store.get('party');
        if (coords) {
            coords = coords.split(',');
            this.partyX = parseInt(coords[0]);
            this.partyY = parseInt(coords[1]);
        } else {
            this.partyX = 500;
            this.partyY = 150;
        }
        this.revertMapDetails();
    },

    setStoreUpdaters: function () {
	this.store.setUpdater(1, function (oldKey, value) {
	    var newKey;
	    var newValue;
	    if (oldKey == 'mapWidth') {
		newKey = 'mapMaxStraight';
	    } else if (oldKey == 'mapHeight') {
		newKey = 'mapMaxZigzag';
	    } else if (oldKey == 'hexWidth') {
		newValue = value*2;
	    } else if (oldKey == 'hexHeight') {
		newValue = value*4/3;
	    } else if (oldKey == 'explored') {
		newValue = $.map(value.split("|"), function (value) {
		    value = parseInt(value);
		    var zigzag = parseInt(value/128);
		    var straight = value - 128*zigzag;
		    if ((straight & 127) > 120) {
			zigzag++;
			straight -= 128;
		    }
		    return straight + '_' + zigzag;
		});
	    }
	    if (newKey || newValue !== undefined) {
		if (newValue === undefined) {
		    newValue = value;
		}
		return [newKey || oldKey, newValue];
	    }
	});
    },

    remove: function () {
        this.store.removeName();
    },

    setName: function (name) {
        this.name = name;
        this.store.setName(name.toId());
    },

    getHexId: function (straight, zigzag) {
        return straight + '_' + zigzag;
    },

    isExplored: function (straight, zigzag) {
        var hexId = this.getHexId(straight, zigzag);
        return this.explored[hexId];
    },

    setExplored: function (straight, zigzag, explored) {
        var hexId = this.getHexId(straight, zigzag);
        if (explored) {
            this.explored[hexId] = 1;
        } else {
            delete(this.explored[hexId]);
        }
	this.saveExplored();
    },

    saveExplored: function () {
        this.store.set('explored', Object.keys(this.explored));
    },

    addMarker: function (marker) {
        this.markerList.push(marker);
        this.saveMarkers();
    },

    prependMarker: function (marker) {
        this.markerList.splice(0, 0, marker);
        this.saveMarkers();
    },
    
    getMarker: function (marker) {
      var markerString = marker.x + ',' + marker.y + ',' + marker.angle + ',' + marker.src + ',' + marker.textSide + ',' + marker.title
      for(var i = 0; i < this.markerList.length; i++) {
        console.log(this.markerList[i].toString());
        if(this.markerList[i].toString() == markerString) {
          return this.markerList[i];
        }
      }
      if (console) {
        console.error('failed to get ' + marker);
      }
    },
    removeMarker: function (marker) {
        /*var index = $.inArray(marker, this.markerList);
        if (index >= 0) {
            this.markerList.splice(index, 1);
            this.saveMarkers();
        } else if (console) {
            console.error('failed to remove ' + marker);
        }*/
        var markerString = marker.x + ',' + marker.y + ',' + marker.angle + ',' + marker.src + ',' + marker.textSide + ',' + marker.title
        console.log(markerString);
        
        for(var i = 0; i < this.markerList.length; i++) {
          console.log(this.markerList[i].toString());
          if(this.markerList[i].toString() == markerString) {
            this.markerList.splice(i,1);
            this.saveMarkers();
            return;
          }
        }
        if (console) {
          console.error('failed to remove ' + marker);
        }
    },

    saveMarkers: function () {
        this.store.set('markers', this.markerList);
    },

    setPartyCoords: function (x, y) {
        this.store.set('party', parseInt(x) + ',' + parseInt(y));
    },

    setMapSource: function (mapSrc) {
        this.mapSrc = mapSrc;
        $('#mapImg').attr('src', mapSrc);
    },

    saveMapDetails: function () {
        this.store.set('mapSrc', this.mapSrc);
        this.store.set('mapOffsetX', this.mapOffsetX);
        this.store.set('mapOffsetY', this.mapOffsetY);
        this.store.set('verticalHexes', this.verticalHexes);
        this.store.set('halfHex', this.halfHex);
        this.store.set('hexWidth', this.hexWidth);
        this.store.set('hexHeight', this.hexHeight);
        this.store.set('mapMaxStraight', this.mapMaxStraight);
        this.store.set('mapMaxZigzag', this.mapMaxZigzag);
    },

    revertMapDetails: function () {
        this.setMapSource(this.store.get('mapSrc') || 'The_Greenbelt_sq.jpg');
        this.mapOffsetX = parseInt(this.store.get('mapOffsetX'));
        if (isNaN(this.mapOffsetX)) {
	    this.mapOffsetX = 1;
	}
        this.mapOffsetY = parseInt(this.store.get('mapOffsetY'));
        if (isNaN(this.mapOffsetY)) {
	    this.mapOffsetY = -32;
	}
	this.verticalHexes = (this.store.get('verticalHexes') == 'true') || false;
	this.halfHex = (this.store.get('halfHex') == 'true') || false;
        this.hexWidth = parseFloat(this.store.get('hexWidth')) || 183.2;
        this.hexHeight = parseFloat(this.store.get('hexHeight')) || 164.8;
        this.mapMaxStraight = parseFloat(this.store.get('mapMaxStraight')) || 14;
        this.mapMaxZigzag = parseFloat(this.store.get('mapMaxZigzag')) || 10;
        this.updateZoom();
    },

    updateZoom: function () {
        this.zoomX = this.hexWidth / this.hexNativeWidth;
        this.zoomY = this.hexHeight / this.hexNativeHeight;
        $.each(this.iconImages, $.proxy(function (index, src) {
            var selector = '.marker img[src="' + src + '"]';
            this.applyZoom(selector, src);
        }, this));
    },

    applyZoom: function (selector, src) {
        var zoom = this.iconZoom[src] || 1;
        var img = this.iconOriginal[src];
        if (img) {
            var width = zoom * this.zoomX * img.width;
            var height = zoom * this.zoomY * img.height;
            $(selector).css({ 'width': width, 'height': height });
        } else {
            this.loadIconOriginal(src);
        }
    },

    saveIconImages: function () {
        this.store.set('iconImages', this.iconImages);
        this.store.set('iconZoom', JSON.stringify(this.iconZoom));
        this.store.set('iconSnap', JSON.stringify(this.iconSnap));
    },

    revertIconImages: function () {
        this.iconImages = this.store.getArray('iconImages');
        if (!this.iconImages || this.iconImages.length == 0) {
            this.iconImages = [ 'icon_pin.png', 'icon_building.png', 'icon_POI.png', 'icon_camp.png', 'icon_monster.png', 'tick.png' ];
        }
        var zoom = this.store.get('iconZoom');
        if (zoom) {
            this.iconZoom = JSON.parse(zoom);
        } else {
            this.iconZoom = {};
        }
	var snap = this.store.get('iconSnap');
	if (snap) {
            this.iconSnap = JSON.parse(snap);
	} else {
            this.iconSnap = {};
	}
        this.preloadIconOriginal();
    },

    preloadIconOriginal: function () {
        $.each(this.iconImages, $.proxy(function (index, src) {
            if (!this.iconOriginal[src]) {
                this.loadIconOriginal(src);
            }
        }, this));
    },

    loadIconOriginal: function (src) {
        var img = new Image();
        this.iconOriginal[src] = img;
        $(img).load($.proxy(function (evt) {
            var selector = '.marker img[src="' + src + '"]';
            this.applyZoom(selector, src);
        }, this));
        img.src = src;
    },

    exportCampaign: function () {
        var text = 'Name:' + (this.name || '') + '\n';
        $.each(this.store.getKeys(), $.proxy(function (index, key)
        {
            text += key;
            text += ':';
            text += this.store.get(key);
            text += '\n';
        }, this));
        return text;
    },

    importCampaign: function (importData) {
        var name;
        this.store = undefined;
        $.each(importData.split(/[\r\n]+/), $.proxy(function (index, line) {
            var colonPos = line.indexOf(':');
            var key = line.substring(0, colonPos);
            var value = line.substring(colonPos + 1);
            if (key == 'Name') {
                name = value;
                this.store = new Choices(name.toId());
		this.store.clearAll();
            } else if (key) {
                this.store.set(key, value);
            }
        }, this));
        return name;
    }

});

var manager = new Choices('', 'greenBeltMapManager');

var current = new Campaign(manager.get('campaign'));

var selectedHex = {};
var selectedMarker = null;

function cover(mapDiv, straight, zigzag) {
    var cover = $('<img />');
    var top = 0;
    var left = 0;
    var bottom = current.hexHeight;
    var right = current.hexWidth;
    var noclip = 0, strideX, strideY;
    var zigzagDelta = (current.halfHex ? 1 : 0);
    if (current.verticalHexes) {
	cover.attr('src', 'hexV.png');
	strideX = current.hexWidth*0.75;
	strideY = current.hexHeight*0.5;
	if (straight == current.mapMaxStraight)
	    bottom = strideY;
	else if (straight == -1)
	    top = strideY;
	else
	    noclip++;
	if (zigzag == zigzagDelta - 1)
	    left = strideX;
	else if (zigzag > current.mapMaxZigzag + zigzagDelta)
	    right = current.hexWidth*0.25;
	else
	    noclip++;
    } else {
	cover.attr('src', 'hex.png');
	strideX = current.hexWidth*0.5;
	strideY = current.hexHeight*0.75;
	if (straight == current.mapMaxStraight)
	    right = strideX;
	else if (straight == -1)
	    left = strideX;
	else
	    noclip++;
	if (zigzag == zigzagDelta - 1)
	    top = strideY;
	else if (zigzag > current.mapMaxZigzag + zigzagDelta)
	    bottom = current.hexHeight*0.25;
	else
	    noclip++;
    }
    cover.css({ 'width': current.hexWidth, 'height': current.hexHeight });
    if (noclip < 2) {
	cover.clip(top, right, bottom, left);
    }
    cover.addClass('cover');
    cover.attr('id', 'hex' + current.getHexId(straight, zigzag));
    $(cover).mousedown(function (evt) {
        evt.preventDefault();
    });
    $(mapDiv).append(cover);
    var xPos, yPos;
    if (current.verticalHexes) {
	xPos = zigzag * strideX + current.mapOffsetX;
	yPos = straight * strideY + current.mapOffsetY;
    } else {
	xPos = straight * strideX + current.mapOffsetX;
	yPos = zigzag * strideY + current.mapOffsetY;
    }
    cover.css({ 'left': xPos, 'top': yPos });
}

function coverMap() {
    $('#mapImg').attr('src', current.mapSrc);
    var zigzagDelta = (current.halfHex ? 1 : 0);
    for (var zigzag = zigzagDelta - 1; zigzag <= current.mapMaxZigzag + 1 + zigzagDelta; ++zigzag) {
	for (var straight = -(zigzag&1); straight <= current.mapMaxStraight; straight += 2) {
	    if (!current.isExplored(straight, zigzag))
		cover($('#map'), straight, zigzag);
	}
    }
}

function close(selector, evt) {
        $(selector).hide();
        evt.preventDefault();
        evt.stopPropagation();
}

function zoomIconPreview(zoom) {
    var scale = 'scale(' + zoom + ')';
    $('#iconPreview').transform(scale);
    var src = $('#iconPreview').attr('src');
    if (zoom <= 1) {
        $('#previewScale').val(50 * zoom);
    } else {
        $('#previewScale').val(50 * Math.sqrt(zoom));
    }
    if (zoom == 1) {
        delete(current.iconZoom[src]);
    } else if (src != 'empty.png') {
        current.iconZoom[src] = zoom;
    }
    snapIconPreview(current.iconSnap[src]);
}

function snapIconPreview(snap) {
    var src = $('#iconPreview').attr('src');
    if (snap) {
	$('#iconPreview').css({ 'left': snap[0], 'top': snap[1] });
	$('#snapToHex').prop('checked', true);
        current.iconSnap[src] = snap;
    } else {
	var x = ($('#iconPreviewHex').width() - $('#iconPreview').width()) / 2;
	var y = ($('#iconPreviewHex').height() - $('#iconPreview').height()) / 2;
	$('#iconPreview').css({ 'left': x, 'top': y });
	$('#snapToHex').prop('checked', false);
        delete(current.iconSnap[src]);
    }
}


//Server events
//Generic events: import campaign data and reload page
socket.on('changing', function (importData) {

        var name = current.importCampaign(importData);
        manager.set('campaign', name);
        // var campaignList = manager.getArray('campaignList');
        // if ($.inArray(name, campaignList) < 0) {
            // campaignList.push(name);
            // manager.set('campaignList', campaignList);
        // }
        location.reload();
});

//Hex uncovered
socket.on('uncover hex', function(hex) {
  //Get hexId to get cover; cover does not send properly over socket.io so has to be set locally
  var hexId = current.getHexId(hex.x, hex.y);
  var cover = $('#hex' + hexId);
  console.log(hex);
  console.log(cover);
  cover.remove();
  current.setExplored(hex.x, hex.y, true);
});

//Hex covered
socket.on('cover hex', function(hex) {
  current.setExplored(hex.x, hex.y, false);
  cover($('#map'), hex.x, hex.y);
  console.log(hex);
});

//Party moved
socket.on('move party', function(partyCoords) {
  current.setPartyCoords(partyCoords.x, partyCoords.y);
  party.setAttribute("style", "top: " + String(partyCoords.y) + "px; left: " + String(partyCoords.x-$('#map').offset().left) + "px;");
  console.log(partyCoords);
});

//Marker changed
socket.on('remove marker', function(oldMarker) {
  var fixedMarker = current.getMarker(oldMarker);
  console.log(oldMarker);
  current.removeMarker(oldMarker);
  console.log(fixedMarker.getElement());
  fixedMarker.getElement().remove();
});

socket.on('add marker', function(newMarker) {
  var fixedMarker = new Marker(newMarker.x + ',' + newMarker.y + ',' + newMarker.angle + ',' + newMarker.src + ',' + newMarker.textSide + ',' + newMarker.title);
  console.log(fixedMarker);
  current.addMarker(fixedMarker);
  $('#markerDiv').append(fixedMarker.getElement());
});

function makeMenus() {
    //Make menus, send info from client
    // Top level menu
    $('#menu').click(function (evt) {
        if (!closeAnyMenu()) {
            var campaignList = manager.getArray('campaignList');
            var name = manager.get('campaign');
            if (!name || name == current.emptyName) {
                campaignList.push(current.emptyName);
            }
            var div = $('#campaignDiv');
            div.empty();
            $.each(campaignList, function (index, campaign) {
                var label = $('<a/>');
                label.text(campaign);
                label.attr('href', '#');
                label.click(function (evt) {
                    manager.set('campaign', campaign);
                    location.reload();
                });
                div.append(label);
            });
            $('#mainMenu').show();
            evt.stopPropagation();
        }
    });
    // mainMenu
    $('#newCampaign').click(function (evt) {
        manager.set('campaign', current.emptyName);
        location.reload();
    });
    $('#deleteCampaign').click(function (evt) {
        var name = manager.get('campaign');
        deleteCampaign($('#campaign'), name);
        close('#mainMenu', evt);
    });
    $('#importExport').click(function (evt) {
        var text = current.exportCampaign();
        var overlay = $('#importExportDiv');
        overlay.show();
        overlay.css({ 'min-height': $('#map').height() });
        overlay.find('textarea').val(text);
    });
    $('#configureMap').click(function (evt) {
        configureMap();
        close('#mainMenu', evt);
    });
    $('#configureIcons').click(function (evt) {
        configureIcons();
        close('#mainMenu', evt);
    });
    // unexploredMenu
    $('#reveal').click(function (evt) {
        console.log(selectedHex);
        socket.emit('uncover hex', selectedHex);
        
        selectedHex.cover.remove();
        current.setExplored(selectedHex.x, selectedHex.y, true);
        
        close('#unexploredMenu', evt);
    });
    // markerMenu
    $('#editLabel').click(function (evt) {
        showFloatingMenu('#titleEditor', getEventOffset(evt), -80, 0);
        $('#newTitle').val(selectedMarker.title.replace(/<br\/>/g, '\n'));
        $('input:radio[name=textSide][value=' + selectedMarker.textSide + ']').prop('checked', true);
        $('#labelAngle').val(selectedMarker.angle || 0);
        close('#markerMenu', evt);
    });
    $('#move').click(function (evt) {
        current.removeMarker(selectedMarker);
        socket.emit('remove marker', selectedMarker);
        console.log(selectedMarker);
        dragMarker(selectedMarker, -10, -10);
        close('#markerMenu', evt);
        //socket.emit('change', current.exportCampaign());
    });
    $('#lower').click(function (evt) {
        current.removeMarker(selectedMarker);
        current.prependMarker(selectedMarker);
        $('#markerDiv').prepend(selectedMarker.getElement());
        close('#markerMenu', evt);
        socket.emit('change', current.exportCampaign());
    });
    $('#copy').click(function (evt) {
        dragMarker(new Marker(selectedMarker), -10, -10);
        close('#markerMenu', evt);
    });
    $('#remove').click(function (evt) {
        current.removeMarker(selectedMarker);
        socket.emit('remove marker', selectedMarker);
        selectedMarker.getElement().remove();
        close('#markerMenu', evt);
    });
    // exploredMenu
    $('#cover').click(function (evt) {
        current.setExplored(selectedHex.x, selectedHex.y, false);
        cover($('#map'), selectedHex.x, selectedHex.y);
        
        socket.emit('cover hex', selectedHex);
        
        close('#exploredMenu', evt);
        //socket.emit('change', current.exportCampaign());
    });
    // importExportDiv
    $('#importExportClose').click(function (evt) {
        $('#importExportDiv').hide();
    });
    $('#importButton').click(function (evt) {
        var overlay = $('#importExportDiv');
        var importData = overlay.find('textarea').val();
        var name = current.importCampaign(importData);
        manager.set('campaign', name);
        var campaignList = manager.getArray('campaignList');
        if ($.inArray(name, campaignList) < 0) {
            campaignList.push(name);
            manager.set('campaignList', campaignList);
        }
        socket.emit('change', current.exportCampaign());
        location.reload();
    });
    // iconConfigurationDiv
    $('#addIconButton').click(function (evt) {
        var src = $('#newIconSrc').val();
        if (src) {
            addConfigIcon(sanitiseURL(src));
            refreshCurrentIconImages();
            $('#newIconSrc').val('');
        }
    });
    $('#previewScale').change(function (evt) {
        var zoom = $(evt.target).val() / 50;
        if (zoom > 1.0) {
            zoom *= zoom;
        }
        zoomIconPreview(zoom);
    });
    $('#iconSelect').change(function (evt) {
        var src = $('#iconSelect').val();
        addConfigIcon(src);
        $('#iconSelect').val('');
        refreshCurrentIconImages();
    });
    $('#finishIcon').click(function (evt) {
	$.each(current.markerList, function (index, marker) {
	    snapMarkerToHex(marker);
	});
	current.saveMarkers();
        current.saveIconImages();
        redrawIcons();
        current.updateZoom();
        $('#iconConfigurationDiv').hide();
        $('#iconPreview').attr('src', 'empty.png');
        zoomIconPreview(1);
    });
    $('#cancelIcon').click(function (evt) {
        current.revertIconImages();
        $('#iconConfigurationDiv').hide();
        $('#iconPreview').attr('src', 'empty.png');
        zoomIconPreview(1);
    });
    // titleEditor
    $('#finishLabel').click(function (evt) {
        var newTitle = $('#newTitle').val().replace(/[\r\n]+/g, '<br/>');
        socket.emit('remove marker', selectedMarker);
        selectedMarker.setTitle(newTitle);
        var textSide = $('input:radio[name=textSide]:checked').val();
        selectedMarker.setTextSide(textSide);
	var angle = $('#labelAngle').val();
        selectedMarker.setAngle(angle);
        current.saveMarkers();
        socket.emit('add marker', selectedMarker);
        close('#titleEditor', evt);
    });
    $('#cancelLabel').click(function (evt) {
        close('#titleEditor', evt);
    });
    $('#titleEditor').click(function (evt) {
        evt.stopPropagation();
    });
}

function snapMarkerToHex(marker) {
    var snap = current.iconSnap[marker.src];
    if (snap) {
	var element = marker.getElement();
	var hexCoord = mapToHex(marker.x + element.width()/2 - current.mapOffsetX, marker.y + element.height()/2 - current.mapOffsetY);
	var hexX, hexY;
	if (current.verticalHexes) {
	    hexX = hexCoord.hexZigzag;
	    hexY = hexCoord.hexStraight;
	} else {
	    hexX = hexCoord.hexStraight;
	    hexY = hexCoord.hexZigzag;
	}
	marker.x = hexX * hexCoord.strideX + snap[0] * current.hexWidth / current.hexNativeWidth + current.mapOffsetX;
	marker.y = hexY * hexCoord.strideY + snap[1] * current.hexHeight / current.hexNativeHeight + current.mapOffsetY;
        var map = $('#mapImg');
        if (marker.x < 0) {
	    marker.x = 0;
	} else if (marker.x >= map.width()) {
	    marker.x = map.width() - element.width();
	}
	if (marker.y < 0) {
	    marker.y = 0;
	} else if (marker.y >= map.height()) {
	    marker.y = map.height() - element.height();
	}
	element.css({ left: marker.x, top: marker.y });
    }
}

function hideIfVisible(selector) {
    if ($(selector).is(':visible')) {
        $(selector).hide();
        return true;
    } else {
        return false;
    }
}

function closeAnyMenu() {
    var result = false;
    if (hideIfVisible('#unexploredMenu')) {
        $(selectedHex.cover).removeClass('selectedHex');
        result = true;
    }
    result |= hideIfVisible('#markerMenu');
    result |= hideIfVisible('#exploredMenu');
    result |= hideIfVisible('#mainMenu');
    return result;
}

function getEventOffset(evt) {
    var result = {};
    if (evt.type.indexOf('touch') == 0) {
        if (evt.originalEvent.targetTouches.length > 0) {
            result.left = evt.originalEvent.targetTouches[0].pageX;
            result.top = evt.originalEvent.targetTouches[0].pageY;
        }
    } else {
        result.left = evt.pageX;
        result.top = evt.pageY;
    }
    return result;
}

function dragMarker(marker, dx, dy) {
    preventTouchScroll = true;
    $('#markerDiv').append(marker.getElement());
    $(document).on('mousemove.marker touchmove.marker', function (moveEvt) {
        var eventOffset = getEventOffset(moveEvt);
        var mapOffset = $('#map').offset();
        marker.setX(parseInt(eventOffset.left + dx - mapOffset.left));
        marker.setY(parseInt(eventOffset.top + dy - mapOffset.top));
	snapMarkerToHex(marker);

    });
    $(document).on('mouseup.marker touchend.marker', function (upEvt) {
        $(document).unbind('.marker');
        var map = $('#mapImg');
        var element = marker.getElement();
        if (marker.x + element.width() >= 0 && marker.y + element.height() >= 0 && marker.x < map.width() && marker.y < map.height()) {
            current.addMarker(marker);
        } else {
            element.remove();
        }
        preventTouchScroll = false;
        socket.emit('add marker', marker);
        console.log(marker);
    });
    
    
    return marker;
}

function showFloatingMenu(selector, position, dx, dy) {
    var menu = $(selector);
    menu.show();
    menu.css({ 'display': 'inline-block' });
    var map = $('#map');
    position.left += dx;
    position.top += dy;
    menu.css(position);
    window.setTimeout(function () {
        if (position.left < 20) {
            position.left = 20;
        } else if (position.left + menu.width() > map.width() - 20) {
            position.left = map.width() - 20 - menu.width();
        }
        if (position.top < 20) {
            position.top = 20;
        } else if (position.top + menu.height() > map.height() - 20) {
            position.top = map.height() - 20 - menu.height();
        }
        menu.css(position);
    }, 100);
}

function redrawIcons() {
    var icons = $('#iconDiv');
    icons.empty();
    var mapOffset = $('#map').offset();
    $.each(current.iconImages, function (index, src) {
        var img = $('<img />');
        img.attr('src', src);
        var icon = $('<div />');
        icon.addClass('icon');
        icon.append(img);
        icons.append(icon);
        icon.on('mousedown touchstart', function (evt) {
            var offset = img.offset();
            var eventOffset = getEventOffset(evt);
            var dx = offset.left - eventOffset.left;
            var dy = offset.top - eventOffset.top;
            var marker = dragMarker(new Marker(offset.left - mapOffset.left, offset.top - mapOffset.top, 0, src), dx, dy);
            evt.preventDefault();
        });
    });
}

function makeIcons() {
    redrawIcons();
    $.each(current.markerList, function (index, marker) {
        $('#markerDiv').append(marker.getElement());
    });
    $('#markerDiv').on('click', '.marker img', function (evt) {
        if (!closeAnyMenu()) {
            showFloatingMenu('#markerMenu', getEventOffset(evt), -80, 0);
            var element = $(evt.target).parent();
            selectedMarker = element.data('marker');
            $('#markerMenuTitle').html(selectedMarker.title);
        }
        evt.stopPropagation();
    });
}

function isAboveHexDiagonal(clickStraight, clickZigzag, hexStraight, hexZigzag, hexStraightSize, hexZigzagSize)
{
    if ((hexZigzag%3) != 0) {
	return false;
    } else if ((hexStraight + hexZigzag)&1) {
	return (clickZigzag < hexZigzagSize/3*(clickStraight/hexStraightSize + hexZigzag - hexStraight));
    } else {
	return (clickZigzag < hexZigzagSize/3*(1 + hexZigzag + hexStraight - clickStraight/hexStraightSize));
    }
}

function mapToHex(mapX, mapY) {
    var strideX, strideY, hexStraight, hexZigzag, above;
    if (current.verticalHexes) {
	strideX = current.hexWidth*0.75;
	strideY = current.hexHeight*0.5;
	hexZigzag = parseInt(3 * mapX / strideX);
	hexStraight = parseInt(mapY / strideY);
	above = isAboveHexDiagonal(mapY, mapX, hexStraight, hexZigzag, strideY, strideX);
    } else {
	strideX = current.hexWidth*0.5;
	strideY = current.hexHeight*0.75;
	hexStraight = parseInt(mapX / strideX);
	hexZigzag = parseInt(3 * mapY / strideY);
	above = isAboveHexDiagonal(mapX, mapY, hexStraight, hexZigzag, strideX, strideY);
    }
    hexZigzag = parseInt(hexZigzag/3);
    if (above) {
	hexZigzag--;
    }
    if (hexZigzag&1) {
	hexStraight -= (hexStraight&1) ? 0 : 1;
    } else {
	hexStraight &= ~1;
    }
    return { hexStraight: hexStraight, hexZigzag: hexZigzag, strideX: strideX, strideY: strideY };
}

function addHandlers() {
    $(document).on('touchmove', function (evt) {
        if (preventTouchScroll) {
            evt.preventDefault();
        }
    });
    $(document).click(function (evt) {
        closeAnyMenu();
    });
    // Set up handler for map
    $('#map').click(function (evt) {
        if (!closeAnyMenu() && !$('#mapConfiguration').is(':visible')) {
            var evtOffsetX = evt.offsetX || evt.originalEvent.layerX;
            var evtOffsetY = evt.offsetY || evt.originalEvent.layerY;
            var clickX = evtOffsetX - current.mapOffsetX;
            var clickY = evtOffsetY - current.mapOffsetY;
            var target = $(evt.target);
            if (!target.is('#map')) {
                // make clickX/Y relative to #map
                var targetOffset = target.offset();
                var mapOffset = $('#map').offset();
                clickX += targetOffset.left - mapOffset.left;
                clickY += targetOffset.top - mapOffset.top;
            }
	    var hexCoord = mapToHex(clickX, clickY);
            var xPos, yPos;
	    if (current.verticalHexes) {
		xPos = hexCoord.hexZigzag * hexCoord.strideX + current.mapOffsetX;
		yPos = hexCoord.hexStraight * hexCoord.strideY + current.mapOffsetY;
	    } else {
		xPos = hexCoord.hexStraight * hexCoord.strideX + current.mapOffsetX;
		yPos = hexCoord.hexZigzag * hexCoord.strideY + current.mapOffsetY;
	    }
            var hexId = current.getHexId(hexCoord.hexStraight, hexCoord.hexZigzag);
            if (current.isExplored(hexCoord.hexStraight, hexCoord.hexZigzag)) {
                showFloatingMenu('#exploredMenu', { 'left': xPos, 'top': yPos }, 40, 50);
            } else {
                showFloatingMenu('#unexploredMenu', { 'left': xPos, 'top': yPos }, 40, 50);
                var cover = $('#hex' + hexId);
                selectedHex.cover = cover;
                cover.addClass('selectedHex');
            }
            selectedHex.x = hexCoord.hexStraight;
            selectedHex.y = hexCoord.hexZigzag;
        }
        evt.stopPropagation();
    });
    // Handler for party marker
    var party = $('#party');
    party.makeDraggable({ drag: function (x, y) { current.setPartyCoords(x, y); console.log(x + ' ' + y);
    socket.emit('move party', {x: x, y: y});} });
    party.click(function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
    });
    party.offset({ left: current.partyX, top: current.partyY });
    
}

function deleteCampaign(element, name) {
    var answer = confirm("Really delete " + name + "?");
    if (!answer) {
        element.text(name);
        return;
    }
    current.remove();
    var campaignList = manager.getArray('campaignList');
    var index = $.inArray(name, campaignList);
    campaignList.splice(index, 1);
    manager.set('campaignList', campaignList);
    manager.set('campaign', '');
    location.reload();
}

function rescaleMap() {
    var redHex = $('#redHex');
    var blueHex = $('#blueHex');
    if (current.verticalHexes) {
	redHex.attr('src', 'redhexV.png');
	blueHex.attr('src', 'bluehexV.png');
    } else {
	redHex.attr('src', 'redhex.png');
	blueHex.attr('src', 'bluehex.png');
    }
    var originPosition = redHex.position();
    current.mapOffsetX = originPosition.left;
    current.mapOffsetY = originPosition.top;
    var outerPosition = blueHex.position();
    var mapMaxStraight = current.mapMaxStraight;
    if (((current.mapMaxStraight & 1) == (current.mapMaxZigzag & 1)) == current.halfHex) {
        mapMaxStraight--;
    }
    if (current.halfHex) {
	mapMaxStraight++;
    }
    var strideX, strideY;
    if (current.verticalHexes) {
	strideX = (outerPosition.left - current.mapOffsetX)/current.mapMaxZigzag;
	strideY = (outerPosition.top - current.mapOffsetY)/mapMaxStraight;
	current.hexWidth = 4/3*strideX;
	current.hexHeight = 2*strideY;
    } else {
	strideX = (outerPosition.left - current.mapOffsetX)/mapMaxStraight;
	strideY = (outerPosition.top - current.mapOffsetY)/current.mapMaxZigzag;
	current.hexWidth = 2*strideX;
	current.hexHeight = 0.5 + 4/3*strideY;
    }
    $('.scalingHex').css({ 'width': current.hexWidth, 'height': current.hexHeight });
    if (current.halfHex) {
	if (current.verticalHexes) {
	    current.mapOffsetX -= strideX;
	    current.mapOffsetY += strideY;
	} else {
	    current.mapOffsetX += strideX;
	    current.mapOffsetY -= strideY;
	}
    }
    current.updateZoom();
    if (!current.halfHex)  {
        redHex.css({ 'clip': 'auto' });
    } else if (current.verticalHexes) {
        redHex.clip(strideY, current.hexWidth, current.hexHeight, 0);
    } else {
        redHex.clip(0, current.hexWidth, current.hexHeight, strideX);
    }
    if (((current.mapMaxStraight & 1) != (current.mapMaxZigzag & 1)) != current.halfHex) {
        blueHex.css({ 'clip': 'auto' });
    } else if (current.verticalHexes) {
        blueHex.clip(0, current.hexWidth, strideY, 0);
    } else {
        blueHex.clip(0, strideX, current.hexHeight, 0);
    }
}

function updateMapSize() {
    var newWidth = parseFloat($('#mapWidth').val());
    var newHeight = parseFloat($('#mapHeight').val());
    if (current.verticalHexes) {
	current.mapMaxZigzag = parseInt(newWidth - 1);
	current.mapMaxStraight = parseInt(newHeight*2 - 1);
    } else {
	current.mapMaxStraight = parseInt(newWidth*2 - 1);
	current.mapMaxZigzag = parseInt(newHeight - 1);
    }
    rescaleMap();
}

var originX = 0, originY = 0;

function switchShiftOrigin() {
    var shiftOrigin = $('#shiftOrigin').is(':checked');
    if (shiftOrigin) {
	$('#originHex').show();
	$('#redHex').hide();
	$('#blueHex').hide();
	// TODO Snap originHex to grid
	$('#originHex').css({ left: originX, top: originY });
    } else {
	$('#originHex').hide();
	$('#redHex').show();
	$('#blueHex').show();
    }
}

function changeHalfHex() {
    var previous = current.halfHex;
    current.halfHex = $('#halfHex').is(':checked');
    if (previous != current.halfHex) {
	var deltaRed = current.halfHex ? -1 : 0;
	var deltaBlue = (((current.mapMaxStraight & 1) == (current.mapMaxZigzag & 1)) == current.halfHex) ? -1 : 1;
	var blueHex = $('#blueHex');
	var position = blueHex.position();
	if (current.verticalHexes) {
	    $('#redHex').css({ top: current.mapOffsetY + deltaRed*current.hexHeight*0.5 });
	    blueHex.css({ top: position.top + deltaBlue*current.hexHeight*0.5 });
	} else {
	    $('#redHex').css({ left: current.mapOffsetX + deltaRed*current.hexWidth*0.5 });
	    blueHex.css({ left: position.left + deltaBlue*current.hexWidth*0.5 });
	}
    }
    rescaleMap();
}

function configureScalingHex(element) {
    element.makeDraggable({ drag: rescaleMap });
    element.click(function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
    });
}

var originX, originY;

function configureOriginHex(element) {
    element.makeDraggable({ drag: function snapToGrid(screenX, screenY, evt) {
	var eventOffset = getEventOffset(evt);
	eventOffset.left += current.mapOffsetX;
	eventOffset.top -= current.mapOffsetY;
	var hexCoord = mapToHex(eventOffset.left, eventOffset.top);
	var xPos, yPos;
	if (current.verticalHexes) {
	    originX = hexCoord.hexZigzag;
	    originY = hexCoord.hexStraight;
	} else {
	    originX = hexCoord.hexStraight;
	    originY = hexCoord.hexZigzag;
	}
	xPos = originX * hexCoord.strideX + current.mapOffsetX;
	yPos = originY * hexCoord.strideY + current.mapOffsetY;
	element.css({ left: xPos, top: yPos });
    } });
    element.click(function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
    });
}

function moveOrigin(oldHalfHex) {
    var originStraight, originZigzag, strideX, strideY;
    if (current.verticalHexes) {
	originStraight = originY;
	originZigzag = originX;
	strideX = current.hexWidth*0.75;
	strideY = current.hexHeight*0.5;
    } else {
	originStraight = originX;
	originZigzag = originY;
	strideX = current.hexWidth*0.5;
	strideY = current.hexHeight*0.75;
    }
    // Move explored hexes
    var newExplored = {};
    $.each(current.explored, function (key) {
	var coords = key.split('_');
	var hexId = current.getHexId(parseInt(coords[0]) + originStraight, parseInt(coords[1]) + originZigzag);
	newExplored[hexId] = 1;
    });
    current.explored = newExplored;
    current.saveExplored();
    // Move markers
    if (oldHalfHex != current.halfHex) {
	originY += (current.halfHex) ? -1 : 1;
    }
    $.each(current.markerList, function (index, marker) {
	marker.x += originX * strideX;
	marker.y += originY * strideY;
	marker.marker.css({ left: marker.x, top: marker.y });
    });
    current.saveMarkers();
}

function finishConfiguring(apply) {
    if (apply) {
	var oldHalfHex = (current.store.get('halfHex') == 'true') || false;
        current.saveMapDetails();
	if (originX || originY) {
	    moveOrigin(oldHalfHex);
	}
    } else {
        current.revertMapDetails();
    }
    $('#shiftOrigin').prop('checked', false);
    $('#mapConfiguration').hide();
    window.setTimeout(function () { $('#map').css({ 'overflow': 'hidden' }); }, 100);
    $('.scalingHex').hide();
    coverMap();
    $('.marker').show();
    $('#party').show();
}

function setupMapConfiguration() {
    $('#mapSrc').change(function (evt) {
        var newSource = sanitiseURL($('#mapSrc').val());
        current.setMapSource(newSource);
        $('#mapSelect').val('');
    });
    $('#mapSelect').change(function (evt) {
        var newSource = $('#mapSelect').val();
	$('#verticalHexes').prop('checked', false);
	current.verticalHexes = false;
	var rescaleY = 1;
	if (newSource == 'The_Greenbelt_sq.jpg') {
	    $('#halfHex').prop('checked', false);
	    current.halfHex = false;
	    $('#mapWidth').val('7.5');
	    $('#mapHeight').val('11');
	    $('#redHex').css({ 'left': '2px', 'top': '-31px' });
	    $('#blueHex').css({ 'left': '1284px', 'top': '1200px' });
	    if (current.mapSrc == 'The_Greenbelt.jpg') {
		rescaleY = 1 / 1.27;
	    }
	} else if (newSource == 'The_Greenbelt.jpg') {
	    $('#halfHex').prop('checked', false);
	    current.halfHex = false;
	    $('#mapWidth').val('7.5');
	    $('#mapHeight').val('11');
	    $('#redHex').css({ 'left': '2px', 'top': '-39px' });
	    $('#blueHex').css({ 'left': '1284px', 'top': '1524px' });
	    if (current.mapSrc == 'The_Greenbelt_sq.jpg') {
		rescaleY = 1.27;
	    }
	} else if (newSource == 'Greenbelt_NomenHeights.jpg') {
	    $('#halfHex').prop('checked', false);
	    current.halfHex = false;
	    $('#mapWidth').val('14.5');
	    $('#mapHeight').val('11');
	    $('#redHex').css({ 'left': '-3px', 'top': '-32px' });
	    $('#blueHex').css({ 'left': '2558px', 'top': '1200px' });
	    if (current.mapSrc == 'Greenbelt_NomenHeights_sq.jpg') {
		rescaleY = 1 / 1.27;
	    }
	} else if (newSource == 'Greenbelt_NomenHeights_sq.jpg') {
	    $('#halfHex').prop('checked', false);
	    current.halfHex = false;
	    $('#mapWidth').val('14.5');
	    $('#mapHeight').val('11');
	    $('#redHex').css({ 'left': '-3px', 'top': '-32px' });
	    $('#blueHex').css({ 'left': '2558px', 'top': '1524px' });
	    if (current.mapSrc == 'Greenbelt_NomenHeights.jpg') {
		rescaleY = 1.27;
	    }
	} else if (newSource == 'HooktongueSlough_Greenbelt_NomenHeights_sq.jpg') {
	    $('#halfHex').prop('checked', false);
	    current.halfHex = false;
	    $('#mapWidth').val('21.5');
	    $('#mapHeight').val('11');
	    $('#redHex').css({ 'left': '-3px', 'top': '-39px' });
	    $('#blueHex').css({ 'left': '3837px', 'top': '1524px' });
	} else {
	    $('#halfHex').prop('checked', true);
	    current.halfHex = true;
	    $('#mapWidth').val('7');
	    $('#mapHeight').val('11');
	    $('#redHex').css({ 'left': '-93px', 'top': '-32px' });
	    $('#blueHex').css({ 'left': '1187px', 'top': '1201px' });
	}
	if (rescaleY != 1) {
	    $.each(current.markerList, function (index, marker) {
		marker.y *= rescaleY;
		marker.marker.css({ left: marker.x, top: marker.y });
	    });
	    current.saveMarkers();
	}
        current.setMapSource(newSource);
        $('#mapSrc').val('');
	updateMapSize();
    });
    $('#verticalHexes').change(function (evt) {
	var newVertical = $('#verticalHexes').is(':checked');
	current.verticalHexes = newVertical;
	$('#dimensionsInput').removeClass(current.verticalHexes ? 'horizontalHexes' : 'verticalHexes');
	$('#dimensionsInput').addClass(current.verticalHexes ? 'verticalHexes' : 'horizontalHexes');
	updateMapSize();
    });
    $('#halfHex').change(function (evt) {
	changeHalfHex();
    });
    $('#mapWidth').change(function (evt) {
	updateMapSize();
    });
    $('#mapHeight').change(function (evt) {
	updateMapSize();
    });
    $('#shiftOrigin').change(function (evt) {
	switchShiftOrigin();
    });
    $('#finishConfiguration').click(function (evt) {
        finishConfiguring(true);
    });
    $('#cancelConfiguration').click(function (evt) {
        finishConfiguring(false);
    });
    configureScalingHex($('#redHex'));
    configureScalingHex($('#blueHex'));
    configureOriginHex($('#originHex'));
    $('#mapConfiguration .dragHandle').makeDraggable({ target: $('#mapConfiguration') });
}

function configureMap() {
    $('.cover').remove();
    $('.marker').hide();
    $('#party').hide();
    $('#mapConfiguration').show();
    $('#map').css({ 'overflow': 'visible' });
    $('#mapSrc').val(current.mapSrc);
    $('#verticalHexes').prop('checked', current.verticalHexes);
    $('#halfHex').prop('checked', current.halfHex);
    $('#mapSelect').val('');
    var redHex = $('#redHex');
    redHex.show();
    var blueHex = $('#blueHex');
    blueHex.show();
    var mapMaxStraight = current.mapMaxStraight;
    if (((current.mapMaxStraight & 1) == (current.mapMaxZigzag & 1)) == current.halfHex) {
        mapMaxStraight--;
    }
    var strideX, strideY;
    if (current.verticalHexes) {
	strideX = current.hexWidth*0.75;
	strideY = current.hexHeight*0.5;
	if (current.halfHex) {
	    current.mapOffsetX += strideX;
	}
    } else {
	strideX = current.hexWidth*0.5;
	strideY = current.hexHeight*0.75;
	if (current.halfHex) {
	    current.mapOffsetY += strideY;
	}
    }
    $('#dimensionsInput').removeClass(current.verticalHexes ? 'horizontalHexes' : 'verticalHexes');
    $('#dimensionsInput').addClass(current.verticalHexes ? 'verticalHexes' : 'horizontalHexes');
    if (current.verticalHexes) {
	redHex.css({ 'left': current.mapOffsetX, 'top': current.mapOffsetY - (current.halfHex ? strideY : 0) });
	blueHex.css({ 'left': current.mapMaxZigzag*strideX + current.mapOffsetX, 'top': mapMaxStraight*strideY + current.mapOffsetY });
	$('#mapWidth').val(current.mapMaxZigzag + 1);
	$('#mapHeight').val(current.mapMaxStraight / 2 + 0.5);
    } else {
	redHex.css({ 'left': current.mapOffsetX - (current.halfHex ? current.hexWidth*0.5 : 0), 'top': current.mapOffsetY });
	blueHex.css({ 'left': mapMaxStraight*strideX + current.mapOffsetX, 'top': current.mapMaxZigzag*strideY + current.mapOffsetY });
	$('#mapWidth').val(current.mapMaxStraight / 2 + 0.5);
	$('#mapHeight').val(current.mapMaxZigzag + 1);
    }
    rescaleMap();
}

var iconArray = [];

function configureIcons() {
    $('#iconConfigurationDiv').show();
    $('#iconConfigurationDiv').css({ 'min-height': $('#map').height() });
    $('#iconPreviewHex').css({ 'width': current.hexNativeHeight, 'height': current.hexNativeWidth });
    $('#iconPanel').empty();
    iconArray = [];
    $.each(current.iconImages, function (index, src) {
        addConfigIcon(src);
    });
    $('#iconPreview').makeDraggable({
	start: function start() {
	    return !$('#snapToHex').prop('checked');
	},
	drop: function drop() {
	    var src = $('#iconPreview').attr('src');
	    var position = $('#iconPreview').position();
	    current.iconSnap[src] = [position.left, position.top];
	}
    });
    $('#snapToHex').change(function (evt) {
	if (!$('#snapToHex').prop('checked')) {
	    snapIconPreview();
	}
    });
}

function addConfigIcon(src) {
    var img = $('<img />');
    img.attr('src', src);
    var icon = $('<div />');
    icon.addClass('icon');
    icon.append(img);
    var panel = $('#iconPanel');
    panel.append(icon);
    iconArray.push(icon);
    var size = icon.height();
    var panelPos = panel.offset();
    var oldIndex;
    icon.makeDraggable({
	start: function start() {
	    $('#iconPreview').attr('src', src);
	    zoomIconPreview(current.iconZoom[src] || 1);
	    oldIndex = $.inArray(icon, iconArray);
	},
	drag: function drag(x, y) {
            var newIndex = Math.min(parseInt((y - panelPos.top)/size + 0.5), iconArray.length - 1);
            if (newIndex != oldIndex) {
                var delta;
                if (newIndex < oldIndex) {
                    delta = -1;
                    iconArray[newIndex].before(icon);
                } else {
                    delta = 1;
                    iconArray[newIndex].after(icon);
                }
                for (var move = oldIndex; move != newIndex; move += delta) {
                    iconArray[move] = iconArray[move + delta];
                }
                iconArray[newIndex] = icon;
                oldIndex = newIndex;
            }
            if (x + size < panelPos.left || x > panelPos.left + panel.width() ||
                    y + size < panelPos.top || y > panelPos.top + panel.height()) {
                icon.addClass('pendingDeleteIcon');
            } else {
                icon.removeClass('pendingDeleteIcon');
            }
	},
	drop: function drop() {
            if (icon.hasClass('pendingDeleteIcon')) {
                icon.remove();
                iconArray.splice(oldIndex, 1);
                $('#iconPreview').attr('src', 'empty.png');
                zoomIconPreview(1);
            } else {
                icon.animate({ top: 0, left: 0}, { duration: 100 });
            }
            refreshCurrentIconImages();
	}
    });
}

function refreshCurrentIconImages() {
    current.iconImages = [];
    for (var i = 0; i < iconArray.length; ++i) {
        var src = iconArray[i].find('img').attr('src');
        current.iconImages.push(src);
    }
    current.preloadIconOriginal();
}

function setupCampaignName() {
    var name = manager.get('campaign') || current.emptyName;
    $('#campaign').text(name);
    $('#campaign').makeEditable(function (element, newValue, oldValue) {
        newValue = newValue.trim();
        if (oldValue == current.emptyName)
            oldValue = '';
        if (newValue == current.emptyName)
            newValue = '';
        var campaignList = manager.getArray('campaignList');
        if (newValue && newValue != oldValue && $.inArray(newValue, campaignList) >= 0) {
            alert('There is already a campaign named ' + newValue);
            element.text(oldValue || current.emptyName);
            return;
        } else if (!newValue && oldValue) {
            deleteCampaign(element, oldValue);
        } else {
            element.text(newValue || current.emptyName);
            var campaignList = manager.getArray('campaignList');
            var index = $.inArray(oldValue, campaignList);
            if (index >= 0) {
                campaignList.splice(index, 1, newValue);
            } else {
                campaignList.push(newValue);
            }
            current.setName(newValue);
            manager.set('campaign', newValue);
            manager.set('campaignList', campaignList);
        }
    });
}

function fixMenuX() {
    $(window).scroll(function(){
	var scroll = $(this).scrollLeft();
	$('.fixedX').each(function (index, element) {
	    $(element).css({ 'left': scroll });
	});
	$('#icons').css({ 'height': $('#map').height() });
    });
}

$(document).ready(function () {
    setupCampaignName();
    setupMapConfiguration();
    makeMenus();
    addHandlers();
    makeIcons();
    coverMap();
    fixMenuX();
    setTimeout(function () {
        $('.wait').show();
    }, 500);
});
