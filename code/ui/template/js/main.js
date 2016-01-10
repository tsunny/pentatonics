(function () {
	var app = angular.module('personalPage', ['navBar','queryController','filter','services','geoTagging','googlechart']);
	

	//Controller for the whole application
	app.controller("mainController", function () {
		this.firstPage = '../html/faceted_search.html';


	});
	//To print the HTML without sanitizing
	app.filter("trustHtml", ['$sce', function ($sce) {
		return function (input_string) {
			temp = $sce.trustAsHtml(input_string.replace(/~/g, '<br><br>'));
			return temp;
		};
	}]);
})();