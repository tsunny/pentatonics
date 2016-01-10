(function () {
	var app = angular.module('geoTagging', []);
	app.controller('geoController', ['$scope', function ($scope) {
		var chart1 = {};
		chart1.type = "GeoChart";
		chart1.data = [['Country', 'Population', 'Area'],
			['South Africs', 52192, 43.43],
			['india', 38262, 11],
			['india', 38262, 11],
			['US', 38262, 100],

		];

		chart1.options = {
			width: '100%',
			height: '100%',
			displayMode: 'regions',
		};

		chart1.formatters = {
	
		};

		$scope.chart = chart1;
	}])
})();