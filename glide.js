function toString(pos) {
  var x = pos.x.toFixed(1);
  var y = pos.y.toFixed(1);
  var z = pos.z.toFixed(1);
  return [x, y, z].join(" ");
}

AFRAME.registerComponent('log-position', {
  schema: {
    target: {type: 'string', default: 'chud'}
  },
  
  init: function() {
    this.leftHand = document.getElementById('leftHand').object3D.position;
    this.rightHand = document.getElementById('rightHand').object3D.position;
    this.rig = document.getElementById('rig').object3D.position;
    this.rigRot = document.getElementById('rig').object3D.rotation;
    this.head = document.getElementById('head').object3D.position;
    
    // track controller movement of left and right
    this.lx = this.leftHand.x;
    this.ly = this.leftHand.y; // y is height
    this.lz = this.leftHand.z;
    this.rx = this.rightHand.x;
    this.ry = this.rightHand.y; // y is height
    this.rz = this.rightHand.z;

    this.xdir = 0;
    this.zdir = 0;
  },
  
  tick: function () {
    var rotation = this.el.getAttribute('rotation');
    var pos = this.el.getAttribute('position');
    var s = "rot: " + toString(rotation) + "\npos: " + toString(pos);
    console.log(s);
    var target = this.data.target; // log to this element
    const hud = document.getElementById(target);
    hud.setAttribute('text', 'value: ' + s);

    let isLeftController = (target == 'lhud');
    let isRightController = (target == 'rhud');
    if (isLeftController || isRightController) {
      let xd = isLeftController ? this.lx - pos.x : this.rx - pos.x;
      let yd = isLeftController ? this.ly - pos.y : this.ry - pos.y;
      let zd = isLeftController ? this.lz - pos.z : this.rz - pos.z;
      // this.rig.y = pos.y; // move height with right controller height
      
      // glide down while above start height
      let isFlying = this.rig.y > 0;
      if (isFlying) {
        this.rig.y -= 0.01;
      }
      
      // go up when moving down the controller
      let isControllerMovingDown = yd > 0;
      let xdir = 0;
      let zdir = 0;
      if (isControllerMovingDown) {
        // move up when controller is moving down, move faster with wider arm span
        var xdelta = Math.abs(this.leftHand.x - this.rightHand.x) + 0.2;
        var zdelta = Math.abs(this.leftHand.z - this.rightHand.z) + 0.2;
        var armWidth = xdelta * xdelta + zdelta * zdelta;
        this.rig.y += yd * armWidth;

        let factor = 3;
        xdir = xd * factor;
        zdir = zd * factor;
        
        this.xdir += xdir * 0.1;
        this.zdir += zdir * 0.1;
      }
      
      // add floating
      if (this.rig.y > 0.2) { // only move horizontally if we're above ground
        // slow down horizontal movement with some resistance
        let slow_down_factor = 0.98;
        if (this.xdir * this.xdir + this.zdir * this.zdir > 0.001) {
          this.xdir *= slow_down_factor;
          this.zdir *= slow_down_factor;
        }

        this.rig.x += this.xdir + xdir * 2;
        this.rig.z += this.zdir + zdir * 2;
      } else {
        // stop gliding when we're on the ground
        this.xdir = 0;
        this.zdir = 0;
      }
      
      // remember controller position
      if (isLeftController) {
        this.lx = pos.x;
        this.ly = pos.y;
        this.lz = pos.z;
      } else {
        this.rx = pos.x;
        this.ry = pos.y;
        this.rz = pos.z;
      }
    }
  }
})
