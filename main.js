'use strict';

var lsd = {
  showCanvas: undefined,
  showCtx: undefined,
  stop: true,
  lastTime: undefined,
  show: undefined,
  scene: undefined,
  init: function() {
    console.log('init');
    
    lsd.showCanvas = document.getElementById('canvas_show');
    lsd.showCtx = lsd.showCanvas.getContext('2d');
    
    lsd.timelineCanvas = document.getElementById('canvas_timeline');
    lsd.timelineCtx = lsd.timelineCanvas.getContext('2d');
    
    document.getElementById('button_start').onclick = lsd.startShow;
    document.getElementById('button_stop').onclick = lsd.stopShow;
    
    lsd.showCanvas.onclick = lsd.showCoords;
    
    
    lsd.loadShow('dth');
    
  },
  showCoords: function(e) {
    var rect = lsd.showCanvas.getBoundingClientRect();
    var x = Math.floor(e.clientX - rect.left);
    var y = Math.floor(e.clientY - rect.top);
    console.log(x + ',' + y);
  },
  loadJSON: function(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('get', url, true);
    xhr.responseType = 'json';
    xhr.onload = function() {
      if (xhr.status === 200) {
        callback(xhr.response);
      }
    };
    xhr.send();
  },
  loadIMG: function(url, callback) {
    var img = new Image();
    img.onload = callback;
    img.src = url;
  },
  loadShow: function(name) {
    lsd.loadJSON('./shows/' + name + '.json', lsd.loadShowCB);
  },
  loadShowCB: function(json) {
    lsd.show = json;
    lsd.show.audio = new Audio(json.audioURL);
    console.log(JSON.stringify(json));
    lsd.loadJSON('./scenes/' + json.scene + '.json', lsd.loadSceneCB);
  },
  loadSceneCB: function(json) {
    lsd.scene = json;
    console.log(JSON.stringify(json));
    lsd.loadIMG(json.imgURL, lsd.loadSceneImgCB);
  },
  loadSceneImgCB: function() {
    lsd.scene.img = this;
    lsd.drawTimeline();
    console.log('ready');
  },
  startShow: function() {
    if (lsd.stop) {
      lsd.stop = false;
      lsd.startTime = undefined;
      lsd.lastTime = undefined;
      lsd.eventIndex = 0;
      lsd.show.audio.currentTime = 0;
      lsd.show.audio.play();
      window.requestAnimationFrame(lsd.update);
    }
  },
  stopShow: function() {
    lsd.show.audio.pause();
    lsd.stop = true;    
  },
  update: function(timeStamp) {
    if (lsd.startTime === undefined) {
      lsd.startTime = timeStamp;
    }
    var showTime = timeStamp - lsd.startTime;
    lsd.tick(showTime);
    lsd.drawShow(showTime);
    
    if (!lsd.stop) {
      window.requestAnimationFrame(lsd.update);
    }
  },
  tick: function(showTime) {
    var e;
    while (showTime >= lsd.show.events[lsd.eventIndex].t) {
      e = lsd.show.events[lsd.eventIndex];
      console.log('event ' + lsd.eventIndex);
      for (var i = 0; i < e.states.length; i++) {
        if (i < lsd.scene.lights.length) {
          lsd.scene.lights[i].state = e.states[i];
        }
      }
      
      lsd.eventIndex++;
      if (lsd.eventIndex >= lsd.show.events.length) {
        console.log('events done');
        lsd.stop = true;
        break;
      }
    }
  },
  drawShow: function(showTime) {
    var dimming = 0.75;
    var ctx = lsd.showCtx;
    
    ctx.clearRect(0,0,600,600);
    ctx.drawImage(lsd.scene.img, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,' + dimming + ')';
    ctx.fillRect(0,0,600,600);
    
    lsd.scene.lights.forEach(function(l) {
      if (l.state === 1) {
        var points = l.polygon;
        ctx.fillStyle = l.color;
        ctx.beginPath();
        ctx.moveTo(l.polygon[0][0],l.polygon[0][1]);
        for (var i = 1; i < l.polygon.length; i++) {
          ctx.lineTo(l.polygon[i][0],l.polygon[i][1]);
        }
        ctx.closePath();
        ctx.fill();
      }
    });    
  },
  drawTimeline: function() {
    var ctx = lsd.timelineCtx;
    var rowHeight = 200 / lsd.scene.lights.length;
    
    
    ctx.clearRect(0,0,1000,200);
    
    var nextRowY = 0;
    var maxTextWidth = 0;
    var i;
    for (i = 0; i < lsd.scene.lights.length; i++) {
      ctx.strokeStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.textAlight = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(lsd.scene.lights[i].name, 2, nextRowY);
      maxTextWidth = Math.max(maxTextWidth, ctx.measureText(lsd.scene.lights[i].name).width);
      nextRowY += rowHeight;
    }
    console.log(maxTextWidth);
    nextRowY = 0;
    var events;
    var pixelsPerSecond = (1000  - (maxTextWidth + 3)) / lsd.show.audio.duration;
    var styleMap = ['#FF0000', '#00FF00'];
    for (i = 0; i < lsd.scene.lights.length; i++) {
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(maxTextWidth + 3, nextRowY, 1000, rowHeight);
      
      events = lsd.show.events;

      
      events.forEach(function(e) {
        var xpos = (e.t / 1000) * pixelsPerSecond + maxTextWidth + 3;
        var state = e.states[i];
        //ctx.fillStyle = styleMap[state];
        //ctx.fillRect(xpos, nextRowY + 8, 3, rowHeight - 16);
        ctx.strokeStyle = styleMap[state];
        ctx.beginPath();
        ctx.moveTo(xpos, nextRowY + 8);
        ctx.lineTo(xpos, nextRowY + rowHeight - 16);
        ctx.stroke();
      });
      
      nextRowY += rowHeight;
    }
    
  }
};

lsd.init();