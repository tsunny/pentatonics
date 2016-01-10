(function(){
	var app = angular.module('navBar',[]);
	//////////////// Navigation Bar
	//Service for passing what tab was pressed
	app.factory	("sharedTabService", function () {
		var tabData = {
			id: 0,
			name: "",
			url: ""
		};
		return tabData;
	});
	//Controller  for the right tabs
	app.controller("navRightController", function () {
		this.tabsRight = [];

	});

	//Controller for the left tabs 
	app.controller("navLeftController", function ($scope, sharedTabService) {
		var currentTab = sharedTabService;
		var self = this;
		self.tabsLeft =[];
		//  [{ name: "Faceted Search", url: "./faceted_search.html", id: 1 },{ name: "Geo-Tagging", url: "./geotagging.html", id: 2 }];



		this.setTab = function (value) {

			this.tab = value;
			currentTab.id = value;
			currentTab.url = self.tabsLeft[value - 1].url;
		};

		this.isSet = function (value) {
			return value == this.tab;
		};
	});

	//Controller for the contents
	app.controller("ContentController", function ($scope, sharedTabService) {


		this.currentTab = sharedTabService;


	});
	/////////////////////////////
})();