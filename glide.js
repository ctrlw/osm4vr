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
    
    // track movement of left and right controllers and rig
    this.oldLeft = this.leftHand.clone();
    this.oldRight = this.rightHand.clone();
    this.dir = new THREE.Vector3(0, 0, 0);

    // this.VAXIS = new THREE.Vector3(0, 1, 0);
  },
  
  tick: function () {
    var rot = this.el.getAttribute('rotation');
    var pos = this.el.getAttribute('position');
    var s = "rot: " + toString(rot) + "\npos: " + toString(pos);
    console.log(s);
    var target = this.data.target; // log to this element
    const hud = document.getElementById(target);
    hud.setAttribute('text', 'value: ' + s);

    let dir = new THREE.Vector3(0, 0, 0);

    let isLeftController = (target == 'lhud');
    let isRightController = (target == 'rhud');
    if (isLeftController || isRightController) {
      let inverseControllerDir = new THREE.Vector3(0, 0, 0);
      if (isLeftController) {
        inverseControllerDir = this.oldLeft.sub(this.leftHand);
      } else {
        inverseControllerDir = this.oldRight.sub(this.rightHand);
      }

      // glide down while above start height
      let isFlying = this.rig.y > 0;
      if (isFlying) {
        dir.y -= 0.01;
      }
      
      // go up when moving down the controller
      let isControllerMovingDown = inverseControllerDir.y > 0;
      if (isControllerMovingDown) {
        // move up when controller is moving down, move faster with wider arm span
        let armWidth = this.leftHand.distanceTo(this.rightHand);
        dir.y += inverseControllerDir.y * armWidth;

        let factor = 3;
        dir.x = inverseControllerDir.x * factor;
        dir.z = inverseControllerDir.z * factor;
        
        // add 10% of the controller direction to the gliding direction
        this.dir.x += dir.x * 0.1;
        this.dir.z += dir.z * 0.1;
      }
      
      // add floating
      if (this.rig.y > 0.2) { // only move horizontally if we're above ground
        // slow down horizontal movement with some resistance
        let slow_down_factor = 0.98;
        if (this.dir.lengthSq() > 0.001) {
          this.dir.x *= slow_down_factor;
          this.dir.z *= slow_down_factor;
        }
      } else {
        // stop gliding when we're on the ground
        this.dir = new THREE.Vector3(0, 0, 0);
      }

      this.rig.add(this.dir);
      this.rig.add(dir);
      
      // remember controller position
      if (isLeftController) {
        this.oldLeft.copy(this.leftHand);
      } else {
        this.oldRight.copy(this.rightHand);
      }
    }
  }
})
