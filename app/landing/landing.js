'use strict';

var disasterData = [];
var lookup = {};

angular.module('myApp.landing', ['ngRoute', 'ngMap', 'rzModule'])

.config(['$routeProvider', '$httpProvider', function($routeProvider, $httpProvider) {
  $routeProvider.when('/', {
    templateUrl: 'landing/landing.html',
    controller: 'LandingCtrl'
  });
  $httpProvider.defaults.useXDomain = true;
}])

.controller('LandingCtrl', ['$scope', '$http', 'NgMap', function($scope, $http, NgMap) {

  $("a").click(function() {
    console.log($(this).attr("href"));
  });

  var baseUrl = 'https://sheltered-lowlands-57080.herokuapp.com/';

  $scope.message = 'Landing';

  $scope.mapClick = function(event) {
    console.log(event.latLng);
  };

  var vm = this, heatmap;

  $scope.positions = [];
  lookup = {};

  vm.onClick = function(event) {
    vm.geoType =  event.feature.getGeometry().getType();
    vm.geoArray = event.feature.getGeometry().getArray();
    console.dir('geoArray', event.feature.getGeometry().getArray());
  };

  function requestDisaster(type) {
    console.log("Requesting", type);
    if (heatmap && heatmap.setMap)
      heatmap.setMap(null)
    $http({
      method: 'GET',
      url: baseUrl + 'api/disasters?type='+type,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    }).then(function successCallback(response) {
      // this callback will be called asynchronously
      // when the response is available
      disasterData = [];
      var lon = response.data.slon;
      var lat = response.data.slat;
      for (var i = 0; i < lon.length; i++) {
        disasterData.push(new google.maps.LatLng(lat[i], lon[i]));
      }
      console.log(disasterData);
      // heatmap.setMap(vm.map);
      NgMap.getMap().then(function(map) {
        vm.map = map;
        heatmap = vm.map.heatmapLayers.weather;
        heatmap = new google.maps.visualization.HeatmapLayer({
          data: disasterData,
          map: map
        });
        heatmap.setMap(vm.map);
        vm.changeRadius = function() {
          heatmap.set('radius', 20);
        }

        vm.map.addListener('zoom_changed', mapZoom);
        vm.map.addListener('drag_end', mapZoom);
      });
    }, function errorCallback(response) {
      // called asynchronously if an error occurs
      // or server returns response with an error status.
      console.log("ERROR (requestDisaster)");
      console.log(response);
    });
  }

  /* 
    =====================
    Disasters
    =====================
  */ 
  $scope.disasters = [
    {
      "type": "Wind",
      "param": "wind"
    },
    {
      "type": "Tornado",
      "param": "tornado"
    },
    {
      "type": "Hail",
      "param": "hail"
    },
    {
      "type": "Earthquakes"
    },
    {
      "type": "Hurricane"
    },
    {
      "type": "Fire"
    }
  ];
  $scope.selectedDisaster = $scope.disasters[0];
  $scope.selectDisaster = function(d) {
    if (d == $scope.selectedDisaster) {
      if (heatmap && heatmap.setMap)
        heatmap.setMap(null)
      $scope.selectedDisaster = null;
    }
    else
      $scope.selectedDisaster = d;
  }

  $scope.slider = {
    minValue: 2000,
    maxValue: 2017,
    options: {
        floor: 2000,
        ceil: 2017,
        step: 1
    }
  };

  $scope.$watch('selectedDisaster', function() {
    if ($scope.selectedDisaster.param)
      requestDisaster($scope.selectedDisaster.param);
  });

  function mapZoom() {
    $scope.positions = [];
    if (vm.map.getZoom() >= 7) {
      var bounds = vm.map.getBounds();
      var ne = bounds.getNorthEast(); // LatLng of the north-east corner
      var sw = bounds.getSouthWest(); // LatLng of the south-west corder
      var nw = new google.maps.LatLng(ne.lat(), sw.lng());
      var se = new google.maps.LatLng(sw.lat(), ne.lng());
      // Get
      $http({
        method: 'POST',
        url: baseUrl + 'api/location',
        data: {
          lat1: se.lat(),
          lon1: se.lng(),
          lat2: nw.lat(),
          lon2: nw.lng()
        },
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
      }).then(function successCallback(response) {
        // this callback will be called asynchronously
        // when the response is available
        // console.log(response);
        var d = response.data;
        for (var i = 0; i < d.CITY.length; i++) {
          var obj = {
            pos: [d.LATITUDE[i], d.LONGITUDE[i]],
            city: d.CITY[i],
            ded: d.DED[i],
            id: d.ID[i],
            postal: d.POSTALCODE[i],
            premium: d.PREMIUM[i],
            tiv: d.TIV[i]
          }
          $scope.positions.push(obj);
          lookup[obj.id] = obj;
        }
        console.log($scope.positions);
      }, function errorCallback(response) {
        // called asynchronously if an error occurs
        // or server returns response with an error status.
        console.log("ERROR (mapZoom)");
        console.log(response);
      });
    }
  }

  $scope.selectedAccount = null;

  $scope.markerClick = function(data) {
    var tid = $(this).attr("id");

    if (lookup[tid]) {
      if ($scope.selectedAccount == lookup[tid])
        $scope.selectedAccount = null;
      else
        $scope.selectedAccount = lookup[tid];
    }
    else {
      $scope.selectedAccount = null;
    }
  }

  $scope.text = function() {
    console.log($scope.selectedAccount);
    $http({
      method: 'POST',
      url: baseUrl + 'api/txt',
      data: {
        lat: $scope.selectedAccount.pos[0],
        lon: $scope.selectedAccount.pos[1]
      },
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    }).then(function succ() {
      console.log("SUCCESS");
    }, function err(resp) {
      console.log(resp);
      console.log("ERR");
    });
  }
}]);
