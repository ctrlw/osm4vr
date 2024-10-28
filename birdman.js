// A-Frame component that makes the rig fly like a bird when the controllers are moved like wings
//
// leftWingId, rightWingId: ids of the left and right hand controllers, both need the wing component
// rigId: id of the rig entity, which encapsulates the camera and controllers

AFRAME.registerComponent('birdman', {
  schema: {
    leftWingId: {type: 'string', default: 'leftHand'}, // id of the left hand controller
    rightWingId: {type: 'string', default: 'rightHand'}, // id of the right hand controller
    rigId: {type: 'string', default: 'rig'}, // id of the rig
  },
  
  init: function() {
    this.leftWing = document.getElementById(this.data.leftWingId);
    this.rightWing = document.getElementById(this.data.rightWingId);

    this.leftHand = this.leftWing.object3D.position;
    this.rightHand = this.rightWing.object3D.position;
    this.rigPos = document.getElementById(this.data.rigId).object3D.position;
    this.rigRot = document.getElementById(this.data.rigId).object3D.rotation;

    this.dir = new THREE.Vector3(0, 0, 0); // horizontal movement direction

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
      dir.y = (leftDir.y + rightDir.y) * (armWidth + 0.5);
      dir.x = leftDir.x + rightDir.x;
      dir.z = leftDir.z + rightDir.z;
    }

    // glide if we're above ground
    if (this.rigPos.y > 0) {
      const WEIGHT = 60; // kg
      const SURFACE = 4; // total wing surface in square meters
      const UPLIFT = 1.3; // uplift coefficient at sea level (made up)
      let vspeed = this.vSpeed_mps(WEIGHT, SURFACE, UPLIFT, 0.2);
      let hspeed = this.hSpeed_mps(WEIGHT, SURFACE, UPLIFT, 1.0);

      // glide down
      dir.y -= vspeed * timeDelta / 1000;

      // slow down horizontal movement with some resistance
      let slow_down_factor = 0.99;
      if (this.dir.length() * 1000 / timeDelta > 2 * hspeed) {
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
      this.dir.set(0, 0, 0);
    }

    // rotate the direction vector with the rig rotation
    dir.applyAxisAngle(this.VAXIS, this.rigRot.y);

    this.rigPos.add(dir);
    this.rigPos.add(this.dir);

    // add part of the controller direction to the gliding direction
    let factor = 1;
    this.dir.x += dir.x * factor;
    this.dir.z += dir.z * factor;
  },

  // calculate vertical speed in meters per second
  vSpeed_mps: function(weight, surface, uplift, drag, density = 1.225) {
    const g = 9.81; // gravity in meters per second squared
    // calculate vertical speed in meters per second
    let wingLoading = weight / surface;
    return drag * Math.sqrt(2 * g * wingLoading / (density * uplift**3));
  },
  
  // calculate horizontal speed in meters per second
  hSpeed_mps: function(weight, surface, uplift, drag, density = 1.225) {
    const g = 9.81; // gravity in meters per second squared
    // calculate horizontal speed in meters per second
    let wingLoading = weight / surface;
    return drag * Math.sqrt(2 * g * wingLoading / (density * uplift));
  }
})
