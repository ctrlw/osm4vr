AFRAME.registerComponent('angel', {
  schema: {
  },
  
  init: function() {
    this.leftWing = document.getElementById('leftHand');
    this.rightWing = document.getElementById('rightHand');

    this.leftHand = document.getElementById('leftHand').object3D.position;
    this.rightHand = document.getElementById('rightHand').object3D.position;
    this.rig = document.getElementById('rig').object3D.position;
    this.rigRot = document.getElementById('rig').object3D.rotation;

    this.dir = new THREE.Vector3(0, 0, 0);

    this.VAXIS = new THREE.Vector3(0, 1, 0);
  },
  
  tick: function (time, timeDelta) {
    let leftDir = this.leftWing.components.wing.dir;
    let rightDir = this.rightWing.components.wing.dir;

    // direction to move the rig
    let dir = new THREE.Vector3(0, 0, 0);
    let armWidth = this.leftHand.distanceTo(this.rightHand);

    // go up when moving down both controllers
    let bothControllersMovingDown = leftDir.y >= 0 && rightDir.y >= 0;
    if (bothControllersMovingDown) {
      // move up when controller is moving down, move faster with wider arm span
      let inverseControllerDir = new THREE.Vector3(0, 0, 0);
      inverseControllerDir.addVectors(leftDir, rightDir);

      dir.y = inverseControllerDir.y * (armWidth + 0.3);

      let factor = 3;
      dir.x = inverseControllerDir.x * factor;
      dir.z = inverseControllerDir.z * factor;
    }

    // glide if we're above ground
    if (this.rig.y > 0) {
      dir.y -= 0.03; // slide down

      // slow down horizontal movement with some resistance
      let slow_down_factor = 0.98;
      if (this.dir.lengthSq() > 0.001) {
        this.dir.x *= slow_down_factor;
        this.dir.z *= slow_down_factor;
      }

      // rotate if hands are at different heights
      let armHeightDiff = this.leftHand.y - this.rightHand.y;
      let areHandsDifferentHeight = Math.abs(armHeightDiff) > 0.2;
      if (areHandsDifferentHeight) {
        let angle = Math.tan(armHeightDiff / armWidth);
        this.rigRot.y -= angle / 100;
      }      
    } else {
      // stop gliding when we're on the ground
      this.dir = new THREE.Vector3(0, 0, 0);
    }

    // rotate the direction vector with the rig rotation
    dir.applyAxisAngle(this.VAXIS, this.rigRot.y);


    this.rig.add(dir);
    this.rig.add(this.dir);

    // add 10% of the controller direction to the gliding direction
    this.dir.x += dir.x * 0.1;
    this.dir.z += dir.z * 0.1;
  }
})
