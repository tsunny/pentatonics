(function () {
	var app = angular.module('queryController', ['filter', 'checklist-model']);

	app.controller('queryController', ['$scope', '$http', '$q', function ($scope, $http, $q) {

		$scope.suggestion = "";

		
		$scope.handleSpellCheck = function(){
			query = $scope.suggestion;
			$scope.go($scope.newOptions,0);
		};
			
		var idCounter = 0;
		var query = "";
		var ready = false;
		$scope.initial = false;
		//Object of type facet
		var facet = function (fieldName, Count) {
			this.fieldName = fieldName;
			this.count = Count;
			this.id = idCounter++;
		};
		//Object og type hashtag for trends
		var hashtag = function (Tag, Count) {
			this.hashTag = Tag;
			this.count = Count;
		};
		$scope.documents = [];
		$scope.numDocs = 0;
		$scope.currentPage = 0;
		$scope.numberOfPages = 0;
		$scope.newOptions = '';
		$scope.tweetsPerPage = 10;
		//This list contains the facets needed to be added
		$scope.checked = [''];

		//Basic query object with getter/setter
		$scope.query = {
			str: function (_query) {
				return ($scope.query1 = (arguments.length ? (query = _query) : query));
			}
		};

		//Watch the list and see if new elements added/removed
		$scope.$watchCollection('checked', function (checkedArray) {
			if (ready) {
				if (checkedArray.length == 1) {
					$scope.newOptions = '';
				}
				else {

					var temp=[];
					angular.forEach(checkedArray,function(element){
						var attr = element.substr(element.indexOf(':')+1);
						element = element.replace(attr,"\""+attr+"\"");
						console.log(element);
						temp.push(element);
					});
					$scope.newOptions = temp.join("+AND+");
					$scope.newOptions = $scope.newOptions.replace("\"\"","");
					console.log($scope.newOptions);
					$scope.newOptions = encodeURI($scope.newOptions);						}
					$scope.newOptions = $scope.newOptions.replace(/#/g,'%23');

				$scope.go($scope.newOptions,0);
			}
		});



		//Function to handle response and update the views
		var handleResponse = function (queryResponse) {

			// List to store the retrieved documents
			$scope.documents = [];

			//Facet fields
			$scope.facets = [];

			//Number of documents retrieved
			$scope.numDocs = queryResponse.data.response.numFound;
			$scope.numberOfPages = Math.floor($scope.numDocs/$scope.tweetsPerPage);

			//Push all documents into the documents list
			var documentData = queryResponse.data.response.docs;
			angular.forEach(documentData, function (value, key) {
				var temporary = value.tweet_urls; 
				if(temporary != undefined && temporary.length>0 ){
							$http.post('http://ec2-52-11-40-131.us-west-2.compute.amazonaws.com/img-scrape/',{request_url:temporary[0]}).then(function(successResponse){
								//console.log(successResponse);
								value.img = successResponse.data.image;
								value.title = successResponse.data.title;
					
				},function(failureResponse){
					console.log(failureResponse);
				});
				}
				else{
					value.img = '';
					value.title ='';
				}
				console.log(value.img + "image");
				$scope.documents.push(value);

			});

			guardian_summary(queryResponse.data.response.docs);
			
			//Get the facets details from response
			var facetData = queryResponse.data.facet_counts.facet_fields;

			angular.forEach(facetData, function (field, key) {
				var fcount = 0;
				var list = [];
				for (var index = 0; index < field.length; index += 2) {
					if(fcount++ > 5)
					break;
					if (field[index + 1] == 0)
						continue;
					var element = new facet(field[index], field[index + 1]);
					list.push(element);
				}
				var facetFields = {
					field: key,
					id: idCounter++,
					values: list
				};
				$scope.facets.push(facetFields);
			});

			//Hashtag trends
			var hashTagList = [];
			var hashTags = facetData.tweet_hashtags;
			for (var index = 0; index < hashTags.length; index+=2) {
				if (hashTags[index + 1] == 0)
						continue;
					var element = new hashtag(hashTags[index], hashTags[index + 1]);
					hashTagList.push(element);
			}
			drawTrends(hashTagList);


			if(queryResponse.data.spellcheck.suggestions == undefined || queryResponse.data.spellcheck.suggestions.length==0){
                    		$scope.suggestion = "";
                	}
                	else{
                    		var collation = queryResponse.data.spellcheck.collations;
		                $scope.suggestion = collation[1];
                	}

		};



		//Display the chart
		var drawTrends = function(data){
		var chart = {};
		chart.type = "PieChart";
			chart.data = [['Hashtag', 'Count']
		];

		angular.forEach(data,function(tag){
			var temp = [];

			temp.push(tag.hashTag);
			temp.push(tag.count);
			chart.data.push(temp);
		});

		chart.options = {
		legend: 'bottom',
		width:400,
		height:450,
        pieStartAngle: 0,
		title:'#tag trends',
		backgroundColor: { fill:'transparent' }
		};

		chart.formatters = {

		};


		$scope.chart = chart;
		}

		var detect_lang = function(text, successCallback, errorCallback){
			var detectAPIURL = 'http://ec2-52-11-40-131.us-west-2.compute.amazonaws.com/detect/';
			$http.post(detectAPIURL, {'text': text}).then(successCallback, errorCallback);
		};
		var translate_lang = function(text, from){
			var lang = ['ar', 'de', 'en', 'fr', 'ru'];
			var translateAPIURL = 'http://ec2-52-11-40-131.us-west-2.compute.amazonaws.com/translate/';
			var promises = [];
			var key = 'text_'+from;

			var translated = {'from': from};
			translated[key] = text;

			var deferredTranslate = $q.defer();
			var deferred = $q.defer();
			for (var to in lang){
				var obj = {'lang': 'text_'+lang[to]};
				if(from != lang[to]){
					var data = {'text': text, 'from': from, 'to': lang[to]};
					console.log(data)
					var promise = $http.post(translateAPIURL, data).then(function successCbck(response){
									translated['text_'+response['data']['to']] = response['data']['text'];
								} 
								, function errorCbck(){});
					promises.push(promise);
				}
			}
			$q.all(promises).then(function(){
				console.log(translated);
				deferred.resolve(translated);
			}, function(){
				deferred.reject();
			});

			return deferred.promise;
		};

		var guardian_summary = function(queryResponse){
			var keywords = '';
			var kc = 0;
			for(var tweetNum in queryResponse){
				if(typeof(queryResponse[tweetNum].keywords) != 'undefined'){
					for(var i in queryResponse[tweetNum].keywords){
						if(queryResponse[tweetNum].keywords[i].match(/[^a-zA-Z0-9]+/) === null){
							keywords = keywords + ' ' + queryResponse[tweetNum].keywords[i];
						}
					}
					kc = kc+1;
					if(kc === 3){
						break;
					}
				}	
			}

			if(keywords === ''){
				keywords = $scope.query.str();
			}

			console.log(keywords);
			//Guardian Summary
			var summarizerGuardianUrl = "http://content.guardianapis.com/search?q="+encodeURI(keywords)+"&page-size=3&api-key=test";
			$http.get(summarizerGuardianUrl).then(function(summaryResponse){
				console.log(summaryResponse);

				$scope.summaries = summaryResponse.data.response.results;
				$scope.finalGuardianSummary = [];
				angular.forEach($scope.summaries,function(summary){
					$http.post('http://ec2-52-11-40-131.us-west-2.compute.amazonaws.com/img-scrape/',{request_url:summary.webUrl}).then(function(successResponse){
						console.log(successResponse);
						summary.img = successResponse.data.image;
						summary.title = successResponse.data.title;
						$scope.finalGuardianSummary.push(summary);
					},function(failureResponse){
						console.log(failureResponse);
					});
				});
			}, function(errorResponse){
					//alert('Summarizer Failed');
					console.log(errorResponse);
			});


		};
		
		var search = function(queryOptions, pageNo, translatedData){

			var lang = ['ar', 'de', 'en', 'fr', 'ru'];
			var qf = '';
			var boost = 5;
			var query_str = '';

			console.log(queryOptions);
			console.log(translatedData);
			for(var i in lang){
				if(lang[i] === translatedData['from']){
					qf = qf + ' text_'+lang[i]+'^'+boost;
				}
				else{
					qf = qf + ' text_'+lang[i];
				}
				query_str = query_str + translatedData['text_'+lang[i]]+' ';
			}
			console.log(qf);
			/*
			var _url = "http://ec2-52-34-44-130.us-west-2.compute.amazonaws.com:8983/solr/pentatonics/select?q="
					+ encodeURI("("+query_str+")") 
					+ queryOptions + "&start="+(pageNo)*$scope.tweetsPerPage+"&rows="+$scope.tweetsPerPage
					+ "&fl=*,score"
					+ "&defType=edismax"
					+ "&qf="+encodeURI(qf) // boost here
					+ "&bq=lang%3a" + translatedData['from'] + '^10' // TODO
					+ "&text_"+translatedData['from']	
					+ "&bf=recip(ms(NOW%2ccreated_at)%2c3.16e-11%2c1%2c1)"
					+ "&stopwords=true&lowercaseOperators=true"
					+ "&wt=json&indent=true&facet=true&facet.field=lang&facet.field=tweet_hashtags&facet.field=Country&facet.field=Person&facet.field=date"					
		  			+ "&group=true&group.field=text_en&group.main=true";
			*/

			console.log('----------------------'+$scope.query.str());
			var _url = "http://ec2-52-11-40-131.us-west-2.compute.amazonaws.com:8983/solr/pentatonics/select?q="
				+ encodeURI("("+query_str+")") 
				+ queryOptions + "&start="+(pageNo)*$scope.tweetsPerPage+"&rows="+$scope.tweetsPerPage
				+ "&fl=*,score"
				+ "&defType=edismax"
				+ "&qf="+encodeURI(qf) // boost here
				+ "&bq=lang%3a" + translatedData['from'] + '^30' // TODO
				+ "&bq=%28*:*%20-RT%29^10"
				+ "&text_"+translatedData['from']    
				+ "&bf=recip(ms(NOW%2ccreated_at)%2c3.16e-11%2c1%2c1)"
				+ "&stopwords=true&lowercaseOperators=true"
				+ "&wt=json&indent=true&facet=true&facet.field=lang&facet.field=tweet_hashtags&facet.field=Country&facet.field=Person&facet.field=date"                    
				//+ "&group=true&group.field=text_en&group.main=true"
				+ "&spellcheck=true&spellcheck.collate=true"
				+ "&spellcheck.q="+encodeURI($scope.query.str())
 				+ "&spellcheck.maxCollations=1"
				+ "&spellcheck.maxCollationTries=1";

			//if($scope.query.str())

			$http.get(_url).then(function successCallback(queryResponse) {
				console.log(queryResponse);

				handleResponse(queryResponse);
				$scope.initial = true;

			}, function errorCallback(queryResponse) {
				console.log(queryResponse);
				$scope.initial = true;
				//alert("HTTP request failed");
			});

			
 			
 			// Sunny's Summarizer
			 var summarizerUrl = "http://ec2-52-11-40-131.us-west-2.compute.amazonaws.com:8983/solr/pentatonics/select?q=" + encodeURI("("+$scope.query.str()+")")+ queryOptions + "&wt=json";
			var summaryData = {request_url:summarizerUrl,
 summarizer:"rel",
 summaryCount: 5};
 			$http.post('http://ec2-52-11-40-131.us-west-2.compute.amazonaws.com:5000/summary/',summaryData).then(function(successResponse){
				 console.log(successResponse);
				 $scope.tweetSummaries = successResponse.data.summary;
			 },
			 function(failureResponse){
				 console.log(failureResponse);
				 //alert('Summarizer Failed');
			 });
			 
			 
		
	

		};
	
		//Query Solr and fetch data. 'queryOptions' are the various options to be added to the query. 'page' specifies which page to retrieve.
		$scope.go = function (queryOptions, pageNo) {
			console.log('GO:'+ pageNo)
			$scope.query2 = $scope.query1;
			
			$scope.documents = [];
			ready = true;
			$scope.currentPage = pageNo;
			
			detect_lang($scope.query.str(), function successCallback(response){
				var lang = response['data']['lang'];
				console.log(lang)
				var promise = translate_lang($scope.query.str(), lang);
				promise.then(function(translatedData){
					console.log(translatedData);
					console.log(queryOptions);
					search(queryOptions, pageNo, translatedData);
				}, function(data){
					console.log('Translate error:'+JSON.stringify(data));
				});

			}, function(){

				var promise = translate_lang($scope.query.str(), 'en');
				promise.then(function(translatedData){
					console.log(translatedData);
					search(queryOptions, pageNo, translatedData);
				}, function(data){
					console.log('Translate error:'+JSON.stringify(data));
				});

			})
					
			
		};
		
		
		

	}]);
	// controller End
})();
