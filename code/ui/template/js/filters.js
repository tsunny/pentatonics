(function () {

	var app = angular.module('filter', []);

	app.filter('boldFilter', function () {
		return function (input, query) {

			var queryTerms = query.match(/\S+/g);
			var temp = input;
			angular.forEach(queryTerms, function (term) {
				var globalMatches = temp.match(new RegExp(term, "gi"));
				
				for(var match in globalMatches){
					temp = temp.replace(new RegExp(globalMatches[match]), '<b>'+globalMatches[match]+'</b>');
				}
				//original = temp.match(regEx)
				//console.log(original);
			});
			return temp;
		};
	});

	app.filter("addHtml", ['$sce', function ($sce) {
		return function (input_string) {
			temp = $sce.trustAsHtml(input_string);
			return temp;
		};
	}]);

	app.filter('titleCase', function () {
		return function (input) {
			input = input || '';
			input = input.replace(/_/g, ' ');
			return input.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
		};
	});
	
	app.filter('urlStripper', function () {
		return function (input) {
			var temp = input.replace(/http\S+/gi,"");
			temp = temp.replace(/@\w+/gi,"");
			return temp;
		};
	});
	
})();