const FEET_TO_METER = 0.3048;
const LEVEL_HEIGHT_M = 3; // default height in meters for a single building level
const BUILDING_TO_METER = {
  'church': 20,
  'water_tower': 20
}

// compute square bounding box around the given point
function boundingBox(lat, lon, radius_m) {
    const EQUATOR_M = 40075017; // equatorial circumference in meters
    const POLES_M   = 40007863; // polar circumference in meters
    let circumference_m = EQUATOR_M * Math.cos(lat * Math.PI / 180);

    // Bounding box in overpass query is (south,west,north,east)
    let bbox = [lat - radius_m / POLES_M * 180,
                lon - radius_m / circumference_m * 180,
                lat + radius_m / POLES_M * 180,
                lon + radius_m / circumference_m * 180];
    return bbox;
}

// Compute center of the given geojson features
// we ignore point features and just take the first coordinate pair of each path
// TODO: just use the bounding box center
function features2center(features) {
  let lat = 0;
  let lon = 0;
  let count = 0;
  for (let feature of features) {
    // just take the first coordinate pair of the outline, skip points
    let coords = feature.geometry.coordinates[0][0];
    if (coords && coords.length == 2) {
      lon += coords[0];
      lat += coords[1];
      count += 1;
    }
  }
  lat /= count;
  lon /= count;
  console.log("Geojson center (lat, lon): ", lat, lon);
  return [lat, lon];
}

// load OSM building data for the bounding box
// bboxArray is an array with [south,west,north,east] in degrees
async function loadOSMbuildingsBbox(bboxArray) {
  let bbox = bboxArray.join(',');
  let overpassQuery = `[out:json][timeout:30];(
      way["building"](${ bbox });
      relation["building"]["type"="multipolygon"](${ bbox });
      );out;>;out qt;
      `;
  let response = await fetch(
      "https://overpass-api.de/api/interpreter",
      {
          method: "POST",
          body: "data="+ encodeURIComponent(overpassQuery)
      }
  );
  if (response.ok) {
      let data = await response.json();
      console.log(data);
      return data;
  }
}

// load OSM building data around the given point
// e.g. loadOSMbuildings(49.16, 10.163, 100).then((data) => console.log(data));
async function loadOSMbuildings(lat, lon, radius_m) {
  let bbox = boundingBox(lat, lon, radius_m);
  return loadOSMbuildingsBbox(bbox);
}

// Convert geocoordinates into meter-based positions around the given base
// coordinates order in geojson is longitude, latitude!
// coords is a path of [lon, lat] positions, e.g. [[13.41224,52.51712],[13.41150,52.51702],...] 
function geojsonCoords2plane(coords, baseLat, baseLon) {
  const EQUATOR_M = 40075017; // equatorial circumference in meters
  const POLES_M   = 40007863; // polar circumference in meters
  let circumference_m = EQUATOR_M * Math.cos(baseLat * Math.PI / 180);
  return coords.map(([lon, lat]) => [
    (lon - baseLon) / 360 * circumference_m,
    (lat - baseLat) / 360 * POLES_M
  ]);
}

// Create the Aframe geometry by extruding building footprints to given height
// xyCoords is an array of [x,y] positions in meters, e.g. [[0, 0], [1, 0], [1, 1], [0, 1]]
// xyHoles is an optional array of paths to describe holes in the building footprint
function createGeometry(xyCoords, xyHoles, height) {
  let shape = new THREE.Shape(xyCoords.map(xy => new THREE.Vector2(xy[0], xy[1])));
  for (let hole of xyHoles) {
    shape.holes.push(new THREE.Path(hole.map(xy => new THREE.Vector2(xy[0], xy[1]))));
  }
  let geometry = new THREE.ExtrudeGeometry(shape, {depth: height, bevelEnabled: false});

  // ExtrudeGeometry expects x and y as base shape and extrudes z, rotate to match
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

// Generate a building from outline and height, both in meters
function createBuilding(xyCoords, xyHoles, height) {
  // Create a mesh with the geometry and a material
  let geometry = createGeometry(xyCoords, xyHoles, height);
  let material = new THREE.MeshBasicMaterial({color: 0xaabbcc});
  let mesh = new THREE.Mesh(geometry, material);
  let entity = document.createElement('a-entity');
  entity.setObject3D('mesh', mesh);
  return entity;
}

// Extract or estimate the height of a building
function feature2height(feature) {
  // buildings can have a height defined with optional unit (default is meter)
  // https://wiki.openstreetmap.org/wiki/Key:height
  let properties = feature.properties;
  if ('height' in properties) {
    let height = properties.height;
    if (height.indexOf("'") > 0) {
      // height given in feet and inches, convert to meter and ignore inches
      return parseFloat(height) * FEET_TO_METER;
    }
    // default unit is meters, parseFloat ignores any potentially appended " m"
    return parseFloat(height);
  }
  if ("building:levels" in properties) {
    return parseInt(properties["building:levels"]) * LEVEL_HEIGHT_M;
  }
  if (properties.building in BUILDING_TO_METER) {
    return BUILDING_TO_METER[properties.building];
  }
  if (properties.man_made in BUILDING_TO_METER) {
    return BUILDING_TO_METER[properties.man_made];
  }
  // default to single level height
  return LEVEL_HEIGHT_M;
}

// Extract or estimate building colour
function feature2color(feature) {
  let properties = feature.properties;
  if ('building:colour' in properties) {
    return properties['building:colour'];
  }
  return 'gray';
}

// Convert the geojson feature of a building into a 3d Aframe entity
// baseLat and baseLon are used as reference position to convert geocoordinates to meters on plane
function feature2building(feature, baseLat, baseLon) {
  let paths = feature.geometry.coordinates;
  let xyOutline = geojsonCoords2plane(paths[0], baseLat, baseLon);
  let xyHoles = []; // Add holes to the building if more than one path given
  for (let i = 1; i < paths.length; i++) {
    xyHoles.push(geojsonCoords2plane(paths[i], baseLat, baseLon));
  }
  let height_m = feature2height(feature);
  let building = createBuilding(xyOutline, xyHoles, height_m);

  let color = feature2color(feature);
  let material = `color: ${color}; opacity: 1.0;`;
  building.setAttribute('material', material);
  return building;
}

// Compute the bounding box of a tile at given zoom level in degrees
function tile2bbox(x, y, zoom) {
  let nTiles = 2 ** zoom;
  let north = 180 * Math.atan(Math.sinh(Math.PI * (1 - 2 * y / nTiles))) / Math.PI;
  let south = 180 * Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / nTiles))) / Math.PI;
  let west = x / nTiles * 360 - 180;
  let east = (x + 1) / nTiles * 360 - 180;
  return [south, west, north, east];
}

// load buildings for a single tile at given zoom level
function loadTile(x, y, zoom, tileBase, featuresLoaded) {
  let [south, west, north, east] = tile2bbox(x, y, zoom);
  let buildings = [];
  loadOSMbuildingsBbox([south, west, north, east]).then((json) => {
    let geojson = osmtogeojson(json);
    for (let feature of geojson.features) {
      if ('building' in feature.properties && !featuresLoaded[feature.id]) {
        featuresLoaded[feature.id] = true;
        let building = feature2building(feature, tileBase[0], tileBase[1]);
        buildings += [building];
      }
    }
    return buildings;
  });
}

AFRAME.registerComponent('osm-geojson', {
  schema: {
    lat: {type: 'number'},
    lon: {type: 'number'},
    src: {type: 'asset'},
    radius_m: {type: 'number', default: 500},
    zoom: {type: 'number', default: 16},
    trackId: {type: 'string'}
  },

  init: function () {
    this.tilesLoaded = new Set(); // contains each x,y tile id that has been loaded
    this.featuresLoaded = {}; // contains each feature id that has been added
    this.tileSize_m = lat2tileWidth_m(this.data.lat, this.data.zoom);
    this.tileBase = latlon2fractionalTileId(this.data.lat, this.data.lon, this.data.zoom);

    // for loading a geojson file from the src asset
    this.loader = new THREE.FileLoader();
    this.onSrcLoaded = this.onSrcLoaded.bind(this);

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

  update: function (oldData) {
    if (!this.data.src) {
      return;
    }
    if (this.data.src !== oldData.src) {
      this.loader.load(this.data.src, this.onSrcLoaded);
    }
  },

  onSrcLoaded: function (text) {
    let json = JSON.parse(text);
    if (this.data.lat == 0 && this.data.lon == 0) {
      let center = features2center(json.features);
      this.data.lat = center[0];
      this.data.lon = center[1];
    }
    for (let feature of json.features) {
      if ('building' in feature.properties) {
        let building = feature2building(feature, this.data.lat, this.data.lon);
        document.querySelector('a-scene').appendChild(building);
      }
    }
  },

  // Check if all tiles within the default radius around the given position are fully loaded
  // otherwise load the missing ones as a single bounding box
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
    // console.log(startX, startY, endX, endY);
    
    let bboxSWNE = []; // bounding box in [south,west,north,east] degrees
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        let xy = y << this.data.zoom + x;
        if (!this.tilesLoaded.has(xy)) {
          let bbox = tile2bbox(x, y, this.data.zoom);
          if (bboxSWNE.length == 0) {
            bboxSWNE = bbox;
          } else {
            bboxSWNE[0] = Math.min(bboxSWNE[0], bbox[0]);
            bboxSWNE[1] = Math.min(bboxSWNE[1], bbox[1]);
            bboxSWNE[2] = Math.max(bboxSWNE[2], bbox[2]);
            bboxSWNE[3] = Math.max(bboxSWNE[3], bbox[3]);
          }
          this.tilesLoaded.add(xy); // mark tile as loaded BEFORE the request to avoid multiple requests
        }
      }
    }

    if (bboxSWNE.length > 0) {
      console.log("Bounding box for missing tiles (SWNE): ", bboxSWNE);
      loadOSMbuildingsBbox(bboxSWNE).then((json) => {
        let geojson = osmtogeojson(json);
        let count = 0;
        let ignored = 0;
        for (let feature of geojson.features) {
          if ('building' in feature.properties && !this.featuresLoaded[feature.id]) {
            this.featuresLoaded[feature.id] = true;
            let building = feature2building(feature, this.data.lat, this.data.lon);
            this.el.appendChild(building);
            count += 1;
          } else {
            ignored += 1;
          }
        }
        console.log("Loaded", count, "buildings, ignored ", ignored);
      });
    }
  }
});