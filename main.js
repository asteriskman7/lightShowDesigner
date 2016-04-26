'use strict';

var lsd = {
  showCanvas: undefined,
  showCtx: undefined,
  stop: true,
  lastTime: undefined,
  show: undefined,
  scene: undefined,
  newLightPoints: undefined,
  timelineMode: 'add',
  init: function() {
    console.log('init');
    
    //store canvas info
    lsd.showCanvas = document.getElementById('canvas_show');
    lsd.showCtx = lsd.showCanvas.getContext('2d');
    
    lsd.timelineCanvas = document.getElementById('canvas_timeline');
    lsd.timelineCtx = lsd.timelineCanvas.getContext('2d');
    
    
    //set up UI callbacks
    document.getElementById('button_start').onclick = lsd.startShow;
    document.getElementById('button_stop').onclick = lsd.stopShow;
    document.getElementById('button_save').onclick = lsd.saveToLocalStorage;
    document.getElementById('button_export').onclick = lsd.export;
    document.getElementById('button_addLight').onclick = lsd.addLight;
    document.getElementById('button_delLight').onclick = lsd.deleteLight;
    
    lsd.showCanvas.onclick = lsd.showCoords;
    lsd.timelineCanvas.onclick = lsd.timelineClick;
    
    lsd.loadFromLocalStorage();
    
    //set up configuration callbacks
    
    document.getElementById('text_backgroundURL').onchange = function() {
      lsd.scene.imgURL = this.value;
      lsd.loadIMG(lsd.scene.imgURL);
    };
    
    document.getElementById('text_audioURL').onchange = function() {
      lsd.show.audioURL = this.value;
      lsd.loadAudio(lsd.show.audioURL);
    };
      
    
  },
  saveToLocalStorage: function() {
    window.localStorage.setItem('scene', JSON.stringify(lsd.scene));
    window.localStorage.setItem('show', JSON.stringify(lsd.show));
  },
  export: function() {
    console.log('unimplemented');
  },
  initDesign: function() {
    lsd.scene = {
      imgURL: undefined,
      lights: []
    };
    lsd.show = {
      audioURL: undefined,
      events: []
    };
  },
  loadFromLocalStorage: function() {
    lsd.scene = JSON.parse(window.localStorage.getItem('scene'));
    lsd.show = JSON.parse(window.localStorage.getItem('show'));
    if (lsd.scene === null || lsd.show === null) {
      lsd.initDesign();
    }
    
    document.getElementById('text_backgroundURL').value = lsd.scene.imgURL;
    document.getElementById('text_audioURL').value = lsd.show.audioURL;
    
    lsd.loadIMG(lsd.scene.imgURL);    
    lsd.loadAudio(lsd.show.audioURL);    
  },
  showCoords: function(e) {
    var rect = lsd.showCanvas.getBoundingClientRect();
    var x = Math.floor(e.clientX - rect.left);
    var y = Math.floor(e.clientY - rect.top);
    console.log(x + ',' + y);
    if (lsd.newLightPoints !== undefined) {
      lsd.newLightPoints.push([x, y]);
    }
  },
  loadIMG: function(url) {
    if (url === undefined) {
      url = './questionMark_600x600.png';
    }
    var img = new Image();
    img.onload = lsd.loadImgCB;
    img.src = url;
  },
  loadAudio: function(url) {
    if (url === undefined) {
      url = './tone_5s.ogg';
    }
    var audio = new Audio(url);
    lsd.show.audio = audio;
    lsd.drawTimeline();
  },
  loadAudioCB: function() {
    console.log('audio loaded');
    lsd.show.audio = this;
    lsd.drawTimeline();
  },
  loadImgCB: function() {
    console.log('img loaded');
    lsd.scene.img = this;
    lsd.drawShow();

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
    lsd.drawTimeline(showTime);
    
    if (!lsd.stop) {
      window.requestAnimationFrame(lsd.update);
    }
  },
  tick: function(showTime) {
    var e;
    if (lsd.eventIndex < lsd.show.events.length) {
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
    }
  },
  drawShow: function(showTime) {
    var dimming = 0.75;
    var ctx = lsd.showCtx;
    
    ctx.clearRect(0,0,600,600);
    if (lsd.scene.img !== undefined) {
      ctx.drawImage(lsd.scene.img, 0, 0);
    }
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
  drawTimeline: function(curTime) {
    var ctx = lsd.timelineCtx;
    var rowHeight = 200 / lsd.scene.lights.length;
    if (lsd.show.audio === undefined) {
      return;
    }
    
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
        ctx.strokeStyle = styleMap[state];
        ctx.beginPath();
        ctx.moveTo(xpos, nextRowY + 8);
        ctx.lineTo(xpos, nextRowY + rowHeight - 16);
        ctx.stroke();
      });
      
      nextRowY += rowHeight;
    }
    
    if (curTime !== undefined) {
      ctx.strokeStyle = '#0000FF';
      ctx.beginPath();
      ctx.moveTo((curTime / 1000) * pixelsPerSecond + maxTextWidth + 3, 0);
      ctx.lineTo((curTime / 1000) * pixelsPerSecond + maxTextWidth + 3, 200);
      ctx.stroke();
    }
    
  },
  addLight: function() {
    if (lsd.newLightPoints === undefined) {
      window.alert('select light polygon and click button again');
      lsd.newLightPoints = [];
    } else {
      console.log('make light');
      var newName = window.prompt('New light name?', '');
      var newColor = window.prompt('New light color?', 'rgba(0,0,0,1.0)');
      var newLight = {name: newName, type: 'unknown', state:1, polygon: lsd.newLightPoints, color: newColor};
      lsd.scene.lights.push(newLight);            
      lsd.newLightPoints = undefined;
      lsd.drawTimeline();
      lsd.drawShow();
    }    
  },
  deleteLight: function() {
    window.alert('click on the light strip to delete (no undo)');
    lsd.timelineMode = 'delete';
  },
  timelineClick: function(e) {
    var rect = lsd.timelineCanvas.getBoundingClientRect();
    var x = Math.floor(e.clientX - rect.left);
    var y = Math.floor(e.clientY - rect.top);
    console.log(x + ',' + y);
    var rowHeight = 200 / lsd.scene.lights.length;
    var lightIndex = Math.floor(y / rowHeight);
    if (lsd.timelineMode === 'delete') {
      console.log('delete ' + lightIndex);
      lsd.scene.lights.splice(lightIndex,1);
      lsd.timelineMode = 'add';
      lsd.drawTimeline();
      lsd.drawShow();
    }
  },
};

lsd.init();