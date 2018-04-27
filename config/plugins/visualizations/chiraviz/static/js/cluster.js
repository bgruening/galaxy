'use strict'
var kMeansClustering = {

    Point: function(location) {
        var self = this;
        this.location = self.getterSetter(location);
        this.label = self.getterSetter();
        this.updateLabel = function(centroids) {
            var distancesSquared = centroids.map(function(centroid) {
                return self.sumOfSquareDiffs(self.location(), centroid.location());
            });
            self.label(self.mindex(distancesSquared));
        }
    },

    Centroid: function(initialLocation, label) {
        var self = this;
        this.location = self.getterSetter(initialLocation);
        this.label = self.getterSetter(label);
        this.updateLocation = function(points) {
            var pointsWithThisCentroid = points.filter(function(point) { return point.label() == self.label() });
            if (pointsWithThisCentroid.length > 0) self.location(self.averageLocation(pointsWithThisCentroid));
        };
    },

    clusters: function( k, iterations, data ) {
        var self = this;
        var pointsAndCentroids = self.kmeans( k, iterations, data );
        var points = pointsAndCentroids.points;
        var centroids = pointsAndCentroids.centroids;

        return centroids.map(function(centroid) {
            return {
                centroid: centroid.location(),
                points: points.filter(function(point) { return point.label() == centroid.label() }).map(function(point) { return point.location() }),
            };
        });
    },

    kmeans: function( k, iterations, data ) {
        // initialize point objects with data
        var self = this;
        var points = data.map(function(vector) { return self.Point(vector) });

        // intialize centroids randomly
        var centroids = [];
        for (var i = 0; i < k; i++) {
            centroids.push(self.Centroid(points[i % points.length].location(), i));
        };

        // update labels and centroid locations until convergence
        for (var iter = 0; iter < iterations; iter++) {
            points.forEach(function(point) { point.updateLabel(centroids) });
            centroids.forEach(function(centroid) { centroid.updateLocation(points) });
        };

        // return points and centroids
        return {
            points: points,
            centroids: centroids
        };
    },

    getterSetter: function(initialValue, validator) {
        var thingToGetSet = initialValue;
        var isValid = validator || function(val) { return true };
        return function(newValue) {
            if (typeof newValue === 'undefined') return thingToGetSet;
            if (isValid(newValue)) thingToGetSet = newValue;
        };
    },

    sumOfSquareDiffs: function(oneVector, anotherVector) {
        var squareDiffs = oneVector.map(function(component, i) {
            return Math.pow(component - anotherVector[i], 2);
        });
        return squareDiffs.reduce(function(a, b) { return a + b }, 0);
    },

    mindex: function(array) {
        var min = array.reduce(function(a, b) {
            return Math.min(a, b);
        });
        return array.indexOf(min);
    },

    sumVectors: function(a, b) {
        return a.map(function(val, i) { return val + b[i] });
    },

    averageLocation: function(points) {
        var self = this;
        var zeroVector = points[0].location().map(function() { return 0 });
        var locations = points.map(function(point) { return point.location() });
        var vectorSum = locations.reduce(function(a, b) { return self.sumVectors(a, b) }, zeroVector);
        return vectorSum.map(function(val) { return val / points.length });
    }
};

