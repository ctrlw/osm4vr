# osm4vr
Travel the world in Virtual Reality, using data from [OpenStreetMap](https://openstreetmap.org/) and relying on the [A-Frame framework](https://aframe.io/) to support VR in the browser.
The code in the repository can also be integrated into other projects to add a map to VR scenes and/or load buildings from OpenStreetMap.

## Demo
Open https://ctrlw.github.io/osm4vr/ in your VR device's browser and move around. With hand controllers (e.g. on the Quest) you can extend your arms and move them up and down to fly.
Moving around also works in a regular 2d web browser (even on mobile), but flapping your wings is more fun.

## Features
* Supports both static geojson assets (e.g. downloads from OSM's Overpass API) and loading data dynamically while moving around
* Components are easy to configure and can be used independently, e.g. to embed just a map or just buildings (see below)
* A search box allows to find a place by name (using OSM's nominatim service)
* Supports OSM simple 3d buildings (mostly), so e.g. the Berlin TV tower is more than just a column
* You can use hand controllers to flap your wings in VR

## Limitations
* Buildings are not full 3d models. Some use [OSM's Simple 3d buildings spec](https://wiki.openstreetmap.org/wiki/Simple_3D_buildings) but most are just the building footprint with the height taken from `building:height` if given, otherwise `building:levels` multiplied by 3 or a default value. OSM has a list of other 3d viewers at https://wiki.openstreetmap.org/wiki/3D
* The OpenStreetMap data comes from their public servers, so be gentle or setup your own servers
* There's currently no dynamic unloading of data implemented, so loading more buildings while moving around may lead to performance issues or crashes
* Controls are very rudimentary (flight is a crude approximation, other controls are partly usable)

## Integration in other projects
The A-Frame components can easily be integrated in other projects to support buildings and/or a plane with 2d map, illustrated below with basic examples.
* `osm-tiles` includes a 2d OSM map as a plane on the ground
* `osm-geojson` includes buildings (and potentially other features) from OpenStreetMap and/or a geojson file

Both components need an initial geoposition which is then mapped to A-Frame's (0,0,0) start coordinates, other parameters are optional.

| Parameters | Description | osm-tiles | osm-geojson |
| ----------- | ----------- | --- | --- |
| lat, lon | Latitude/longitude as WGS84, e.g. 52.52 and 13.41 (Berlin) | Required | Required |
| zoom | [Zoom level](https://wiki.openstreetmap.org/wiki/Zoom_levels), can differ between the components | Optional, for size and resolution of map tiles | Optional, to load more or less buildings at once |
| radius_m | Radius in meters, minimum area to load for tiles and buildings, can differ | Optional | Optional |
| trackId | `id` of camera element for dynamic data loading while moving | Optional | Optional |
| src | asset `id` to load a static geojson file | - | Optional |
| url | Base URL of map tile service, default is OSM | Optional | - |

The examples below take the latest version from github, but it's better to add the necessary files to your project directly, as there is currently no release process and future updates might break your site otherwise.

### Include map tiles as a plane
```javascript
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/ctrlw/osm4vr/osm-tiles.js"></script>
</head>
<body>
  <a-scene>
    <a-entity id="rig">
      <a-camera id="head" look-controls wasd-controls="fly: true" position="0 1.6 0"></a-camera>
      <a-entity id="leftHand" laser-controls="hand: left"></a-entity>
      <a-entity id="rightHand" laser-controls="hand: right"></a-entity>
    </a-entity>
    <a-entity osm-tiles="lat: 52.52; lon: 13.41; trackId: head" rotation="-90 0 0"></a-entity>
  </a-scene>
</body>
</html>
```

### Display a geojson file without dynamic loading from OpenStreetMap
To create a geojson file from OpenStreetMap, try the wizard at https://overpass-turbo.eu/. We use
```
[out:json][timeout:30];(
  way["building"]({{bbox}});
  relation["building"]["type"="multipolygon"]({{bbox}});
  way["building:part"]({{bbox}});
  relation["building:part"]["type"="multipolygon"]({{bbox}});
);out;>;out qt;
```

Then add the resulting geojson file as an asset and set a lat/lon within the extracted area
```javascript
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/ctrlw/osm4vr/osm-geojson.js"></script>
</head>
<body>
  <a-scene>
    <a-assets>
      <a-asset-item id="json-world" src="YOUR_FILE.geojson" />
    </a-assets>
    <a-entity id="rig">
      <a-camera id="head" look-controls wasd-controls="fly: true" position="0 1.6 0"></a-camera>
      <a-entity id="leftHand" laser-controls="hand: left"></a-entity>
      <a-entity id="rightHand" laser-controls="hand: right"></a-entity>
    </a-entity>
    <a-entity osm-geojson="lat: 52.52; lon: 13.41; src: #json-world"></a-entity>
    <a-plane color="#33aa66" height="1000" width="1000" rotation="-90 0 0"></a-plane>
  </a-scene>
</body>
</html>
```

### Dynamically load 3d buildings from OpenStreetMap
This depends on the osmtogeojson library.
```javascript
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/ctrlw/osm4vr/osm-geojson.js"></script>
  <script src="https://unpkg.com/osmtogeojson/osmtogeojson.js"></script>
</head>
<body>
  <a-scene>
    <a-entity id="rig">
      <a-camera id="head" look-controls wasd-controls="fly: true" position="0 1.6 0"></a-camera>
      <a-entity id="leftHand" laser-controls="hand: left"></a-entity>
      <a-entity id="rightHand" laser-controls="hand: right"></a-entity>
    </a-entity>
    <a-entity osm-geojson="lat: 52.52; lon: 13.41; radius_m: 500; trackId: head"></a-entity>
    <a-plane color="#33aa66" height="1000" width="1000" rotation="-90 0 0"></a-plane>
  </a-scene>
</body>
</html>
```

### Combine a geojson file, buildings and dynamic loading
```javascript
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/ctrlw/osm4vr/osm-tiles.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/ctrlw/osm4vr/osm-geojson.js"></script>
  <script src="https://unpkg.com/osmtogeojson/osmtogeojson.js"></script>
</head>
<body>
  <a-scene>
    <a-assets>
      <a-asset-item id="json-world" src="YOUR_FILE.geojson" />
    </a-assets>
    <a-entity id="rig">
      <a-camera id="head" look-controls wasd-controls="fly: true" position="0 1.6 0"></a-camera>
      <a-entity id="leftHand" laser-controls="hand: left"></a-entity>
      <a-entity id="rightHand" laser-controls="hand: right"></a-entity>
    </a-entity>
    <a-entity osm-tiles="lat: 52.52; lon: 13.41; trackId: head" rotation="-90 0 0"></a-entity>
    <a-entity osm-geojson="lat: 52.52; lon: 13.41; radius_m: 500; trackId: head; src: #json-world"></a-entity>
  </a-scene>
</body>
</html>
```

## Credits
* This project is heavily inspired by https://github.com/KaiRo-at/vrmap. While VRmap loads only a limited area, osm4vr supports loading tiles and buildings dynamically while moving around, as well as loading a geojson file. The components are also organised in separate files to simplify integration in other projects.
* [A-Frame](https://aframe.io/) is a great framework to quickly build and deploy VR experiences across different VR systems, without the hassle of learning and setting up Unity, Unreal or Godot, and without the need to publish through an app store.
* OpenStreetMap is like the Wikipedia for mapping and run by volunteers on donated servers. If you use this code in your own projects please adhere to their [usage policies for tiles](https://operations.osmfoundation.org/policies/tiles/) and [for the API](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html) which is used for building/feature data. The search box uses OSM's [nominatim service](https://operations.osmfoundation.org/policies/nominatim/). If you expect higher usage, set up your own instances of these services and/or pre-download building data as geojson from the Overpass API.
* Depends on [osm2geojson](https://github.com/tyrasd/osmtogeojson) when loading data dynamically from OSM's Overpass API
* The name osm4vr has been used before by a now abandoned project, no connection