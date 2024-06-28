// A-Frame component that logs the position and rotation of an entity to a text element

AFRAME.registerComponent('log2hud', {
  schema: {
    target: {type: 'string', default: 'chud'}
  },
  
  init: function() {
    this.hud = document.getElementById(this.data.target);
  },
  
  tick: function () {
    var rotation = this.el.getAttribute('rotation');
    var pos = this.el.getAttribute('position');
    var s = "pos: " + this.toString(pos) + "\nrot: " + this.toString(rotation);
    // console.log(s);
    this.hud.setAttribute('text', 'value: ' + s);
  },

  toString: function(pos) {
    var x = pos.x.toFixed(1);
    var y = pos.y.toFixed(1);
    var z = pos.z.toFixed(1);
    return [x, y, z].join(" ");
  }  
})
