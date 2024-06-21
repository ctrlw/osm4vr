  // calculate vertical speed in meters per second
  function vSpeed_mps(weight, surface, uplift, drag, density = 1.225) {
    const g = 9.81; // gravity in meters per second squared
    // calculate vertical speed in meters per second
    let wingLoading = weight / surface;
    return drag * Math.sqrt(2 * g * wingLoading / (density * uplift**3));
  }
  
  // calculate horizontal speed in meters per second
  function hSpeed_mps(weight, surface, uplift, drag, density = 1.225) {
    const g = 9.81; // gravity in meters per second squared
    // calculate horizontal speed in meters per second
    let wingLoading = weight / surface;
    return drag * Math.sqrt(2 * g * wingLoading / (density * uplift));
  }
  
  AFRAME.registerComponent('birdman', {
    schema: {
    },
    
    init: function() {
      this.leftWing = document.getElementById('leftHand');
      this.rightWing = document.getElementById('rightHand');
  
      this.leftHand = document.getElementById('leftHand').object3D.position;
      this.rightHand = document.getElementById('rightHand').object3D.position;
      this.rig = document.getElementById('rig').object3D.position;
      this.rigRot = document.getElementById('rig').object3D.rotation;
  
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
        let inverseControllerDir = new THREE.Vector3(0, 0, 0);
        inverseControllerDir.addVectors(leftDir, rightDir);
  
        dir.y = inverseControllerDir.y * (armWidth + 0.5);
  
        dir.x = inverseControllerDir.x;
        dir.z = inverseControllerDir.z;
      }
  
      // glide if we're above ground
      if (this.rig.y > 0) {
        const WEIGHT = 60; // kg
        const SURFACE = 4; // total wing surface in square meters
        const UPLIFT = 1.3; // uplift coefficient at sea level (made up)
        let vspeed = vSpeed_mps(WEIGHT, SURFACE, UPLIFT, 0.2);
        let hspeed = hSpeed_mps(WEIGHT, SURFACE, UPLIFT, 1.0);
  
        // glide down
        dir.y -= vspeed * timeDelta / 1000;
  
        // slow down horizontal movement with some resistance
        let slow_down_factor = 0.98;
        if (this.dir.length() * 1000 / timeDelta > hspeed) {
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
  
      // add part of the controller direction to the gliding direction
      let factor = 0.3;
      this.dir.x += dir.x * factor;
      this.dir.z += dir.z * factor;
    }    
  })
  