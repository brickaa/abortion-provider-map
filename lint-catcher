//Add the background map layer
// L.mapbox.map(element, id|url|tilejson, options)
var map = L.mapbox.map('map', 'texastribune.map-4xwafpgp', {
    minZoom: 5,
    maxZoom: 10,
    zoomControl: true
}).setView([31.35, -99.64], 6);
// Set the latitude and longitude of the map's starting view, and zoom level

var geoJson = L.geoJson.(geojson, {
    pointToLayer: L.mapbox.marker.style,
    style: function(feature) { 
      if feature.properties.ASC == 1 {
        "marker-color": "#fff"
      }
      else  {
        "marker-color": "#ccc"
      }
    };
});
// Add custom popups to each using our custom feature properties
map.featureLayer.on('layeradd', function(e) {
    var marker = e.layer,
        feature = marker.feature;

    // Create custom popup content
    var popupContent =  '<h1>' + feature.properties.Name + '</h1>' +
                        '<h2>' + feature.properties.ASC + '</h2>';

    // http://leafletjs.com/reference.html#popup
    marker.bindPopup(popupContent,{
        closeButton: false,
        minWidth: 320
    });
    //style marker

});

// Add features to the map
map.featureLayer.setGeoJSON(geoJson);


//Create Marker Layer
// map.markerLayer.setGeoJSON(geojson);


// Add your legend
map.legendControl.addLegend(document.getElementById('legend-content').innerHTML);
