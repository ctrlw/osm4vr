// AFrame component to load OpenStreetMap tiles around a given lat/lon, usually on a flat plane

// Convert geocoordinates to tile coordinates for given zoom level
// See https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
// Returns floating point values where
// * the integer part is the tile id
// * the fractional part is the position within the tile
function latlon2fractionalTileId(lat, lon, zoom) {
  let nTiles = 2 ** zoom;
  let latRad = lat * Math.PI / 180;
  let x = nTiles * (lon + 180) / 360;
  let y = nTiles * (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2;
  return [x, y];
}

// Convert latitude to width in meters for given zoom level
function lat2tileWidth_m(lat, zoom) {
  const EQUATOR_M = 40075017; // equatorial circumference in meters
  let nTiles = 2 ** zoom;
  let circumference_m = EQUATOR_M * Math.cos(lat * Math.PI / 180);
  return circumference_m / nTiles;
}

// Create an Aframe plane with a given tile's image url, and size and position in meters
// The plane position sets x,y although Aframe uses x,z for 3D, so needs to be rotated later
function createTile(x_m, y_m, url, width_m, height_m) {
  console.log(x_m, y_m, width_m, height_m, url);  
  let tile = document.createElement('a-plane');
  tile.setAttribute('src', url);
  tile.setAttribute('width', width_m);
  tile.setAttribute('height', height_m);
  tile.setAttribute('position', {x: x_m, y: y_m, z: 0});
  return tile;
}

// Create an OpenStreetMap tile for given x,y tile coordinates and zoom level
// Example url for Berlin center at zoom level 14: https://tile.openstreetmap.org/14/8802/5373.png
// tileSize_m sets the width and length of the tile in meters
//  for real-world size this depends on the zoom level and the latitude of the origin
// tileBase is the (0,0) origin of the Aframe plane in tile coordinates [x,y]
//  e.g. [8802.5, 5373.5] for the middle of the Berlin center tile at zoom level 14
function loadTile(x, y, zoom, tileSize_m, tileBase) {
  let url = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
  let x_m = (x - tileBase[0] + 0.5) * tileSize_m;
  let y_m = (y - tileBase[1] + 0.5) * tileSize_m;
  let tile = createTile(x_m, -y_m, url, tileSize_m, tileSize_m);
  // let tile = createTile(x_m / tileSize_m, -y_m / tileSize_m, url, 1, 1);
  return tile;
}


AFRAME.registerComponent('osm-tiles', {
  schema: {
    lat: {type: 'number'},
    lon: {type: 'number'},
    radius_m: {type: 'number', default: 500},
    zoom: {type: 'number', default: 16}
  },

  init: function () {
    // console.log(this.data);
    this.tilesLoaded = {}; // contains each x,y tile id that has been added

    this.tileSize_m = lat2tileWidth_m(this.data.lat, this.data.zoom);

    this.tileBase = latlon2fractionalTileId(this.data.lat, this.data.lon, this.data.zoom);
    this.loadTilesAround(0, 0);
  },

  // Check if all tiles within the given radius around the position are loaded, and load them if not
  // x_m, y_m is the position in meters on the Aframe plane
  loadTilesAround: function(x_m, y_m) {
    let tileX = this.tileBase[0] + x_m / this.tileSize_m;
    let tileY = this.tileBase[1] + y_m / this.tileSize_m;

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
      this.tilesLoaded[y] = this.tilesLoaded[y] || new Set();
      for (let x = startX; x < endX; x++) {
        if (!this.tilesLoaded[y].has(x)) {
          let tile = loadTile(x, y, this.data.zoom, this.tileSize_m, this.tileBase);
          this.el.appendChild(tile);
          this.tilesLoaded[y].add(x);
        }
      }
    }
  }
});
