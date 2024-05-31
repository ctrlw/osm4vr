const EQUATOR_M = 40075017; // equatorial circumference in meters
const POLES_M   = 40007863; // polar circumference in meters
const FEET_TO_METER = 0.3048;
const LEVEL_HEIGHT_M = 3; // default height in meters for a single building level
const BUILDING_TO_METER = {
  'church': 20,
  'water_tower': 20
}

// Compute square bounding box around the given point
function boundingBox(lat, lon, radius_m) {
  let circumference_m = EQUATOR_M * Math.cos(lat * Math.PI / 180);

  // Bounding box in overpass query is (south,west,north,east)
  let bbox = [lat - radius_m / POLES_M * 360,
              lon - radius_m / circumference_m * 360,
              lat + radius_m / POLES_M * 360,
              lon + radius_m / circumference_m * 360].join(',');
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

// Convert geocoordinates into meter-based positions around the given base
// coordinates order in geojson is longitude, latitude!
function coords2plane(coords, baseLat, baseLon) {
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
  let xyOutline = coords2plane(paths[0], baseLat, baseLon);
  let xyHoles = []; // Add holes to the building if more than one path given
  for (let i = 1; i < paths.length; i++) {
    xyHoles.push(coords2plane(paths[i], baseLat, baseLon));
  }
  let height_m = feature2height(feature);
  let building = createBuilding(xyOutline, xyHoles, height_m);

  let color = feature2color(feature);
  let material = `color: ${color}; opacity: 1.0;`;
  building.setAttribute('material', material);
  return building;
}

AFRAME.registerComponent('geojson', {
  schema: {
    src: {type: 'asset'}
  },

  init: function () {
    this.loader = new THREE.FileLoader();
    this.onSrcLoaded = this.onSrcLoaded.bind(this);
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
    let center = features2center(json.features);
    let baseLat = center[0];
    let baseLon = center[1];
    for (let feature of json.features) {
      if ('building' in feature.properties) {
        let coords = feature.geometry.coordinates[0];    
        let building = feature2building(feature, baseLat, baseLon);
        // console.log(building);
        document.querySelector('a-scene').appendChild(building);
      }
    }
  }
});
