'use strict';

var lsd = {
  showCanvas: undefined,
  showCtx: undefined,
  stop: true,
  lastTime: undefined,
  show: undefined,
  scene: undefined,
  newLightPoints: undefined,
  timelineMode: '',
  recordLight: undefined,
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
    document.getElementById('button_record').onclick = lsd.recordShow;
    document.getElementById('button_clear').onclick = lsd.clearShow;
    document.getElementById('button_save').onclick = lsd.saveToLocalStorage;
    document.getElementById('button_export').onclick = lsd.export;
    document.getElementById('button_addLight').onclick = lsd.addLight;
    document.getElementById('button_delLight').onclick = lsd.deleteLight;
    document.getElementById('range_rate').oninput = lsd.changeRate;
    
    lsd.eRange = document.getElementById('range_rate');
    
    //set up keyboard handler
    document.onkeydown = lsd.keyDown;
    document.onkeyup = lsd.keyUp;
    
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
    //need to use the callback because metadata, specifically duration, isn't
    //immediately available and would cause drawing problems with drawTimeline
    lsd.show.audio.onloadedmetadata = lsd.drawTimeline;
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
      lsd.scene.lights.forEach(function(l) {
        l.state = 0;
        l.curIndex = 0;
      });
      lsd.show.audio.currentTime = 0;
      lsd.show.audio.play();
      lsd.eRange.disabled = true;
      
      window.requestAnimationFrame(lsd.update);      
    }
  },
  stopShow: function() {
    lsd.show.audio.pause();
    lsd.stop = true;    
    lsd.eRange.disabled = false;
    if (lsd.recordLight !== undefined) {
      lsd.mergeEvents();
      lsd.recordLight = undefined;
      lsd.drawTimeline();
    }
  },
  recordShow: function() {
    window.alert('select the light to record for in the timeline');
    lsd.timelineMode = 'recordSelect';
    lsd.newEvents = [];
  },
  clearShow: function() {
    window.alert('select the light to clear in the timeline');
    lsd.timelineMode = 'clearSelect';    
  },
  update: function(timeStamp) {
    if (lsd.startTime === undefined) {
      lsd.startTime = timeStamp;
    }
    var showTime = (timeStamp - lsd.startTime) * lsd.show.audio.playbackRate;
    lsd.showTime = showTime;
    lsd.tick();
    lsd.drawShow();
    lsd.drawTimeline();
    
    if (lsd.show.audio.currentTime >= lsd.show.audio.duration) {
      lsd.stopShow();
    }
    
    if (!lsd.stop) {
      window.requestAnimationFrame(lsd.update);
    }
  },
  tick: function() {
    var e;
    lsd.scene.lights.forEach(function(l){
      while (l.curIndex < l.events.length && l.events[l.curIndex].t <= lsd.showTime) {
        //eval action
        switch (l.events[l.curIndex].action) {
          case 'on':
            l.state = 1;
            break;
          case 'off':
            l.state = 0;
            break;
          case 'toggle':
            l.state = !(l.state)|0;
            break;
        }
        l.curIndex += 1;
      }
    });
    /*
    if (lsd.eventIndex < lsd.show.events.length) {
      while (lsd.showTime >= lsd.show.events[lsd.eventIndex].t) {
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
          //lsd.stop = true;
          lsd.stopShow();
          break;
        }
      }
    }
    */
  },
  drawShow: function() {
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
  drawTimeline: function() {
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
    var pixelsPerSecond = (1000  - (maxTextWidth + 3)) / lsd.show.audio.duration;
    var styleMap = {'on': '#00FF00', 'off': '#FF0000', 'toggle': '#0000FF'};
    for (i = 0; i < lsd.scene.lights.length; i++) {
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(maxTextWidth + 3, nextRowY, 1000, rowHeight);          
      
      lsd.scene.lights[i].events.forEach(function(e) {
        var xpos = (e.t / 1000) * pixelsPerSecond + maxTextWidth + 3;
        var action = e.action;
        ctx.strokeStyle = styleMap[action];
        ctx.beginPath();
        ctx.moveTo(xpos, nextRowY + 8);
        ctx.lineTo(xpos, nextRowY + rowHeight - 16);
        ctx.stroke();
      });
      
      nextRowY += rowHeight;
    }
    
    if (lsd.showTime !== undefined) {
      ctx.strokeStyle = '#0000FF';
      ctx.beginPath();
      ctx.moveTo((lsd.showTime / 1000) * pixelsPerSecond + maxTextWidth + 3, 0);
      ctx.lineTo((lsd.showTime / 1000) * pixelsPerSecond + maxTextWidth + 3, 200);
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
      var newLight = {name: newName, type: 'unknown', state:0, polygon: lsd.newLightPoints, color: newColor, events: [{t: 0, action: 'off'}], curIndex: 0};
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
    switch (lsd.timelineMode) {
      case 'delete':
        lsd.scene.lights.splice(lightIndex,1);
        lsd.drawTimeline();
        lsd.drawShow();
        break;
      case 'recordSelect':
        lsd.recordLight = lightIndex;
        lsd.startShow();
        break;
      case 'clearSelect':
        lsd.scene.lights[lightIndex].events = [{t: 0, action: 'off'}];
        lsd.drawTimeline();
        break;
    }
    lsd.timelineMode = '';
  },
  changeRate: function() {
    document.getElementById('span_rate').innerHTML = this.value + '%';
    lsd.show.audio.playbackRate = this.value / 100;
  },
  mergeEvents: function() {
    //merge lsd.newEvents into events for lsd.recordLight
    var newPointer = 0;
    var oldPointer = 0;
    var oldEvents = lsd.scene.lights[lsd.recordLight].events;
    var mergedEvents = [];
    var newEvent;
    var oldEvent;
    //merge events in order
    while (newPointer < lsd.newEvents.length && oldPointer < oldEvents.length) {
      newEvent = lsd.newEvents[newPointer];
      oldEvent = oldEvents[oldPointer];
      if (newEvent.t < oldEvent.t) {
        mergedEvents.push(newEvent);
        newPointer++;
      } else {
        mergedEvents.push(oldEvent);
        oldPointer++;
      }
    }
    //add unmerged new events
    while (newPointer < lsd.newEvents.length) {
      mergedEvents.push(lsd.newEvents[newPointer]);
      newPointer++;
    }
    //add unmerged old events
    while (oldPointer < oldEvents.length) {
      mergedEvents.push(oldEvents[oldPointer]);
      oldPointer++;
    }
    lsd.scene.lights[lsd.recordLight].events = mergedEvents;
  },
  keyDown: function(e) {
    var key = String.fromCharCode(e.keyCode);
    
    var keyMap = {0: 'off', 1: 'on', T: 'toggle'};
    
    if (lsd.stop === false && lsd.recordLight !== undefined) {
      console.log('@' + lsd.showTime + ' record light ' + lsd.recordLight + ' + ' + key);
      lsd.newEvents.push({t: lsd.showTime, action: keyMap[key]});
    }
  },
  keyUp: function(e) {
    
  }
};

lsd.init();