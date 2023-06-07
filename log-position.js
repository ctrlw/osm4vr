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
    this.oldLeft = this.leftHand.clone();
    this.oldRight = this.rightHand.clone();
    // this.d = this.leftHand.clone(); // average movement of left and right
    this.lx = this.leftHand.x;
    this.ly = this.leftHand.y; // y is height
    this.lz = this.leftHand.z;
    this.rx = this.rightHand.x;
    this.ry = this.rightHand.y; // y is height
    this.rz = this.rightHand.z;

    this.xdir = 0;
    this.zdir = 0;
    
    this.VAXIS = new THREE.Vector3( 0, 1, 0 );
  },
  
  tick: function () {
    var rotation = this.el.getAttribute('rotation');
    var pos = this.el.getAttribute('position');
    var s = "rot: " + toString(rotation) + "\npos: " + toString(pos);
    console.log(s);
    var target = this.data.target; // log to this element
    const hud = document.getElementById(target);
    var sRig = "rigRot: " + toString(this.rigRot) + "\nrigPos: " + toString(this.rig);
    var chud = document.getElementById('chud');

    
    var lh = this.leftHand;
    var rh = this.rightHand;
    let ld = this.oldLeft.sub(lh);
    let rd = this.oldRight.sub(rh);

    // combine left and right hand movement
    let dir = ld.clone();
    dir.add(rd);
    // dir.negate();
    // horizontal movement
    var lxd = this.lx - lh.x;
    var rxd = this.rx - rh.x;
    var xd = (lxd + rxd) / 2;
    var lzd = this.lz - lh.z;
    var rzd = this.rz - rh.z;
    var zd = (lzd + rzd) / 2;
    var hAngle = Math.tan(xd / zd) * 180 / Math.PI;
    var sqLength = (xd * xd + zd * zd);

    // glide down and forward if we're above ground
    let isFlying = this.rig.y > 0;
    if (isFlying) {
      this.rig.y -= 0.01;
      // TODO: move horizontally
    }
    
    // go up when moving down both controllers
    // var xdelta = Math.abs(this.leftHand.x - this.rightHand.x) + 0.2;
    // var zdelta = Math.abs(this.leftHand.z - this.rightHand.z) + 0.2;
    // var armWidth = xdelta * xdelta + zdelta * zdelta;
    var armWidth = lh.distanceTo(rh);
    let areBothHandsMovingDown = ld.y > 0 && rd.y > 0;
    if (areBothHandsMovingDown) {
      // this.rig.y += vd * armWidth;
      sRig += '\nmvDir: ' + toString(dir * 100);
      chud.setAttribute('text', 'value: ' + sRig);

      dir.applyAxisAngle(this.VAXIS, this.rigRot.y / 360);
      this.rig.add(dir);
    }

    // turn when holding one hand up and the other down
    var armHeightDiff = this.leftHand.y - this.rightHand.y;
    let areHandsDifferentHeight = Math.abs(armHeightDiff) > 0.2;
    if (areHandsDifferentHeight) {
      let armAngle = Math.tan(armHeightDiff / armWidth) * 180 / Math.PI;
      // s += "\nangle: " + angle.toFixed(1) + ', org: ' + toString(this.rigRot);
      // hud.setAttribute('text', 'value: ' + s);
      this.rigRot.y = (this.rigRot.y - armAngle / 10000) % 360;
    }
    
    // show HUD info
    if (target != 'chud') {
      hud.setAttribute('text', 'value: ' + s);
    }

    // remember current controller positions
    this.oldLeft.copy(lh);
    this.oldRight.copy(rh);
    this.lx = lh.x;
    this.ly = lh.y;
    this.lz = lh.z;
    this.rx = rh.x;
    this.ry = rh.y;
    this.rz = rh.z;
    
    

    let isLeftController = (target == 'lhud');
    let isRightController = (target == 'rhud');
    if (isLeftController || isRightController) {
      // let xd = isLeftController ? this.lx - pos.x : this.rx - pos.x;
      let yd = isLeftController ? this.ly - pos.y : this.ry - pos.y;
      // let zd = isLeftController ? this.lz - pos.z : this.rz - pos.z;
      // this.rig.y = pos.y; // move height with right controller height
      
 
      let isControllerMovingDown = yd > 0;
      if (isControllerMovingDown) {
        // this.rig.y += yd * armWidth;
        // let factor = 3;
        // this.rig.x += xd * factor;
        // this.rig.z += zd * factor;
        
        // if (this.rig.y > 0.2) { // only move horizontally if we're above ground
        //   var factor = 3;
        //   var xdir = xd * factor;
        //   var zdir = zd * factor;
        //   if (Math.abs(this.xdir) > Math.abs(xdir)) {
        //     xdir += this.xdir * 0.5;
        //   }
        //   if (Math.abs(this.zdir) > Math.abs(zdir)) {
        //     xdir += this.zdir * 0.5;
        //   }
        //   this.xdir = xdir;
        //   this.zdir = zdir;
        // }
      }

      // if left and right arm have different height, turn
      // TODO: make it work
      var armHeightDiff = this.leftHand.y - this.rightHand.y;
      // hud.setAttribute('text', 'value: ' + armHeightDiff);
      let areHandsDifferentHeight = Math.abs(armHeightDiff) > 0.2;
      if (areHandsDifferentHeight) {
        // let angle = Math.tan(armHeightDiff / armWidth) * 180 / Math.PI;
        // s += "\nangle: " + angle.toFixed(1) + ', org: ' + toString(this.rigRot);
        // hud.setAttribute('text', 'value: ' + s);
        // this.rigRot.y = (this.rigRot.y - angle / 10000) % 360;

        // this.rigRot.y += angle / 10.0;
        
        // var newx = this.rigRot.x * Math.cos(angle) - this.rigRot.z * Math.sin(angle);
        // var newz = this.rigRot.x * Math.sin(angle) + this.rigRot.z * Math.cos(angle);
        // hud.setAttribute('text', 'value: ' + (angle*180/Math.PI).toFixed(1) + ', x: ' + newx.toFixed(2) + ', z: ' + newz.toFixed(2));
        // this.rigRot.x = newx;
        // this.rigRot.z = newz;
        // if (lrdelta < 0) { // left down -> turn left
        //   this.rigRot.y += 0.01;
        // } else {
        //   this.rigRot.y -= 0.01;
        // }
      }
      
//       // add floating
//       this.xdir *= 0.99;
//       this.zdir *= 0.99;
      // if (this.rig.y > 0.2) {
      //   this.rig.x += this.xdir;
      //   this.rig.z += this.zdir;
      // }
      
      // remember controller position
      // if (isLeftController) {
      //   this.lx = pos.x;
      //   this.ly = pos.y;
      //   this.lz = pos.z;
      // } else {
      //   this.rx = pos.x;
      //   this.ry = pos.y;
      //   this.rz = pos.z;
      // }
    }
  }
})
