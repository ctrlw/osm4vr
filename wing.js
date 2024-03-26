AFRAME.registerComponent('wing', {
  schema: {
  },

  init: function() {
    this.pos = this.el.getAttribute('position').clone();

    // opposite direction of controller movement, with smoothing
    this.dir = new THREE.Vector3(0, 0, 0);
  },
  
  tick: function () {
    let rot = this.el.getAttribute('rotation');
    let pos = this.el.getAttribute('position');

    // opposite direction of controller movement, with smoothing
    // equation: invdir = invdir / 2 + oldPos - pos
    let inverseDir = this.pos.sub(pos);
    this.dir.divideScalar(2).add(inverseDir);
    this.pos.copy(pos);
  }
})
