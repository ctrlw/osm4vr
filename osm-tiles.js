// AFrame component to load OpenStreetMap tiles around a given lat/lon, usually on a flat plane
//
// Internally we have to deal with 3 coordinate systems:
// * Geocoordinates (lat, lon) in degrees
//     -180                  180
//  90 +-----------+-----------+
//     |           |           |
//     |           |           |
//     +-----------+-----------+
//     |           |           |
//     |           |           |
// -90 +-----------+-----------+
//
// * Tile coordinates (x, y), i.e. 0 to 2^zoom - 1, as the map is divided into tiles
//   Tiles use the Web Mercator projection, assuming the earth is a sphere
//   See https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
//            0              2^zoom - 1
//          0 +-----------+-----------+
//            |    0,0    |    1,0    |  coordinates inside tiles for zoom level 1
//            |           |           |
//            +-----------+-----------+
//            |    0,1    |    1,1    |
//            |           |           |
// 2^zoom - 1 +-----------+-----------+
//
// * Plane coordinates (x, y) in meters, we take the start lat/lon as origin (0,0)
//      -inf                  inf
// -inf +-----------+-----------+
//      |           |   0,-1    |
//      |          -2,0 0,0 2,0 |
//      +-----------+-----------+
//      |           |           |
//      |           |           |
//  inf +-----------+-----------+


AFRAME.registerComponent('osm-tiles', {
  schema: {
    lat: {type: 'number'},
    lon: {type: 'number'},
    radius_m: {type: 'number', default: 500},
    zoom: {type: 'number', default: 16},
    trackId: {type: 'string'}, // component's id whose position we track for dynamic tile loading
    url: {type: 'string', default: 'https://tile.openstreetmap.org/'} // tileServer base url
  },

  init: function () {
    // console.log(this.data);
    this.tilesLoaded = new Set(); // contains each x,y tile id that has been added

    this.tileSize_m = this.lat2tileWidth_m(this.data.lat, this.data.zoom);

    this.tileBase = this.latlon2fractionalTileId(this.data.lat, this.data.lon);
    this.loadTilesAround(new THREE.Vector3(0, 0, 0));
    
    // if trackId attribute is given, keep track of the element's position
    if (this.data.trackId) {
      let element = document.getElementById(this.data.trackId);
      if (element && element.object3D && element.object3D.position) {
        this.trackPosition = element.object3D.position;
      }
    }
  },
  
  tick: function () {
    if (this.trackPosition) {
      this.loadTilesAround(this.trackPosition);
    }
  },

  // Convert latitude to width in meters for given zoom level
  lat2tileWidth_m: function(lat, zoom) {
    const EQUATOR_M = 40075017; // equatorial circumference in meters
    let nTiles = 2 ** zoom;
    let circumference_m = EQUATOR_M * Math.cos(lat * Math.PI / 180);
    return circumference_m / nTiles;
  },

  // Convert geocoordinates to tile coordinates for given zoom level
  // Returns floating point values where
  // * the integer part is the tile id
  // * the fractional part is the position within the tile
  latlon2fractionalTileId: function(lat, lon) {
    let nTiles = 2 ** this.data.zoom;
    let latRad = lat * Math.PI / 180;
    let x = nTiles * (lon + 180) / 360;
    let y = nTiles * (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2;
    return [x, y];
  },

  // Create an Aframe plane with a given tile's image url, and size and position in meters
  // The plane position sets x,y although Aframe uses x,z for 3D, so needs to be rotated later
  createTile: function(x_m, y_m, url) {
    // console.log(x_m, y_m, url, this.tileSize_m);  
    let tile = document.createElement('a-plane');
    tile.setAttribute('src', url);
    tile.setAttribute('width', this.tileSize_m);
    tile.setAttribute('height', this.tileSize_m);
    tile.setAttribute('position', {x: x_m, y: y_m, z: 0});
    return tile;
  },

  // Create an OpenStreetMap tile for given x,y tile coordinates and zoom level
  // Example url for Berlin center at zoom level 14: https://tile.openstreetmap.org/14/8802/5373.png
  // tileSize_m sets the width and length of the tile in meters
  //  for real-world size this depends on the zoom level and the latitude of the origin
  // tileBase is the (0,0) origin of the Aframe plane in tile coordinates [x,y]
  //  e.g. [8802.5, 5373.5] for the middle of the Berlin center tile at zoom level 14
  loadTile: function(x, y) {
    let url = this.data.url + `${this.data.zoom}/${x}/${y}.png`;
    let x_m = (x - this.tileBase[0] + 0.5) * this.tileSize_m;
    let y_m = (y - this.tileBase[1] + 0.5) * this.tileSize_m;
    let tile = this.createTile(x_m, -y_m, url);
    // let tile = this.createTile(x_m / this.tileSize_m, -y_m / this.tileSize_m, url, 1, 1);
    return tile;
  },

  // Check if all tiles within the default radius around the given position are loaded, load if not
  // pos is the position in meters on the Aframe plane, we ignore the height
  loadTilesAround: function(pos) {
    let tileX = this.tileBase[0] + pos.x / this.tileSize_m;
    let tileY = this.tileBase[1] + pos.z / this.tileSize_m;

    let radius = this.data.radius_m / this.tileSize_m;
    let nTiles = 2 ** this.data.zoom;
    let startX = Math.floor(tileX - radius);
    let startY = Math.max(0, Math.floor(tileY - radius));
    let endX = Math.ceil(tileX + radius);
    let endY = Math.min(nTiles, Math.ceil(tileY + radius));
    // using modulo for horizontal axis to wrap around the date line
    startX = (startX + nTiles) % nTiles;
    endX = (endX + nTiles) % nTiles;

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        let xy = y << this.data.zoom + x;
        if (!this.tilesLoaded.has(xy)) {
          let tile = this.loadTile(x, y);
          this.el.appendChild(tile);
          this.tilesLoaded.add(xy);
        }
      }
    }
  }
});
