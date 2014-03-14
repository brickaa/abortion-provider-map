// helpers

function commas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// models

var Navigator = Backbone.Model.extend({});

// collections

var Navigators = Backbone.Collection.extend({
    model: Navigator,

    initialize: function() {
        this.listenTo(this, 'reset', this.buildPoints);
    },

    buildPoints: function() {
        var temp = [];

        this.each(function(model) {
            temp.push({
                position: [+model.get('lon'), +model.get('lat')],
                data: model
            });
        });

        this.points = new FindNearestPoint.Points(temp);
    },

    findPoints: function(point, numResults) {
        var nearest = this.points.findNearestPoints(point, numResults);
        activeNavigators.reset(nearest);
    }
});

var navigators = new Navigators();
var activeNavigators = new Backbone.Collection();

// views

var MapView = Backbone.View.extend({
    el: '#reset-view',
    
    events: {
        'click .reset': 'render'
    },

    map: L.mapbox.map('map'),

    baseLayer: L.mapbox.tileLayer('texastribune.map-sit023yd', {
        detectRetina: true
    }),

    markerGroup: new L.MarkerClusterGroup({
        maxClusterRadius: 10,
        iconCreateFunction: function(cluster) { 
            return  new L.divIcon({
                iconSize: [20, 20],
                className: 'navigator-div-cluster navigator-div-cluster-me',
                html: '<b> +' + cluster.getChildCount() + '</b>'
            });
        }
    }),

    initialize: function() {
        this.map.setView([31.35, -99.64], 5);
        this.map.scrollWheelZoom.disable();
        this.baseLayer.addTo(this.map);
        this.markerGroup.addTo(this.map);
        this.listenTo(this.collection, 'reset', this.addPointsToMap);
    },

    addPointsToMap: function() {
        var style = this.navigatorStyles;
        var markerGroup = this.markerGroup;

        markerGroup.clearLayers();

        this.collection.each(function(model, index) {
             var icon = L.divIcon({
                iconSize: [20, 20],
                className: 'navigator-div-icon'
            });
            // var icon = L.MakiMarkers.icon({
            //     icon: "hospital",
            //     color: "#f00",
            //     size: "l"
            // });

            var marker = L.marker([model.get('lat'), model.get('lon')], {
                icon: icon
            });

            markerGroup.addLayer(marker);
        });

    },
        render: function() {
        this.map.setView([31.35, -99.64], 5);
        activeNavigators.reset();
        FeedbackView.listenTo(activeNavigators, 'render', FeedbackView.render);

    }

});

var NavigatorsView = Backbone.View.extend({
    el: '#feedback-container',

    locationMarker: L.marker(null, {
        icon: L.divIcon({
            iconSize: [20, 20],
            className: 'navigator-div-icon navigator-div-icon-me',
            html: ''})
    }),

    markerGroup: new L.MarkerClusterGroup({
        maxClusterRadius: 10,
        iconCreateFunction: function(cluster) { 
            return  new L.divIcon({
                iconSize: [20, 20],
                className: 'navigator-div-cluster navigator-div-cluster-me',
                html: '<b> +' + cluster.getChildCount() + '</b>'
            });
        }
        
    }),
    // markerGroup: L.featureGroup(),

    initialize: function() {
        this.markerGroup.addTo(mapView.map);
        this.listenTo(activeNavigators, 'reset', this.addPointsToMap);
    },

    addPointsToMap: function() {
        var style = this.navigatorStyles;
        var markerGroup = this.markerGroup;

        markerGroup.clearLayers();

        activeNavigators.each(function(model, index) {
            var icon = L.divIcon({
                iconSize: [20, 20],
                className: 'navigator-div-icon',
                html: index + 1
            });

            var marker = L.marker([model.get('lat'), model.get('lon')], {
                icon: icon
            });

            markerGroup.addLayer(marker);
        });

        // markerGroup.addLayer(this.locationMarker);

        mapView.map.fitBounds(markerGroup.getBounds());
    }
});

var GeolocateView = Backbone.View.extend({
    el: '#geolocate',

    events: {
        'click .find-me': 'htmlGeolocate',
        'click .search': 'addressGeolocate'
    },

    initialize: function() {
        if (!navigator.geolocation) {
            this.$('.find-me').hide();
        }
    },

    locate: function(point) {
        $('#load-indicator').toggleClass('hidden');
        navigatorsView.locationMarker.setLatLng([point[1], point[0]]);
        navigators.findPoints(point, 5);
    },

    htmlGeolocate: function(e) {
        e.preventDefault();
        $('#load-indicator').toggleClass('hidden');
        var locate = this.locate;
        navigator.geolocation.getCurrentPosition(function(position) {
            locate([position.coords.longitude, position.coords.latitude]);
        });
    },

    // uses MapQuest Nominatim to geolocate an address
    addressGeolocate: function(e) {
        if (e) { e.preventDefault(); }
        $('#load-indicator').toggleClass('hidden');
        var locate = this.locate;
        var request = this.$('input[type=text]').val();

        $.ajax({
            url: '//open.mapquestapi.com/nominatim/v1/search?format=json&countrycodes=us&limit=1&addressdetails=1&q=' + request,
            cache: false,
            dataType: 'jsonp',
            jsonp: 'json_callback'
        })
        .done(function(response) {
            result = response[0];
            if (result === undefined) {
                alert('A location could not be found. Please try searching with a ZIP Code.');
                $('#load-indicator').toggleClass('hidden');
                return false;
            } else {
                var lat = result.lat;
                var lon = result.lon;
                var state = result.address.state;
                if (state !== 'Texas') {
                    alert('The address that returned is not in Texas. Please try making your query more detailed.');
                    $('#load-indicator').toggleClass('hidden');
                    return false;
                }

                locate([lon, lat]);
            }
        })
        .fail(function() {
            alert('The attempt to find your location failed. Please try again.');
        });
    }
});


var IndividualFeedbackView = Backbone.View.extend({
    tagName: 'li',

    template: _.template($('#feedback-template').html()),

    render: function() {
        this.$el.html(this.template(_.extend(this.model.toJSON(), {
            index: activeNavigators.indexOf(this.model) + 1
        })));
        return this;
    }
});

var CompiledFeedbackView = Backbone.View.extend({
    tagName: 'ul',

    render: function() {
        var payload = [];

        this.collection.each(function(model) {
            var view = new IndividualFeedbackView({model: model});
            payload.push(view.render().el);
        });

        this.$el.html(payload);
        return this;
    }
});

var FeedbackView = Backbone.View.extend({
    el: '#feedback-container',

    initialize: function() {
        this.listenTo(activeNavigators, 'reset', this.render);
    },

    render: function() {
        var compiledView = new CompiledFeedbackView({collection: activeNavigators});
        this.$el.html(compiledView.render().el);
        return this;
    }
});

// bootstrap

var mapView = new MapView({collection: navigators});
var navigatorsView = new NavigatorsView();
var geolocateView = new GeolocateView();
var feedbackView = new FeedbackView();
// var resetView = new ResetView({collection: navigators});

navigators.reset(clinic_data);

// $('#geolocate input[type=text]').val('77659');
// geolocateView.addressGeolocate();
