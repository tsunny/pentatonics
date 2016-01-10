import codecs
from twython import Twython
import pprint
import sys
import time
import json
import random
from translate import *
from alchemyapi import AlchemyAPI

CUST_KEY = 'cXCAkr4c56LTDr6alRqLk03pt'
CUST_SECRET = 'KCTBzcUkq4EJIWaopdXAygPHpRxuDMwZCMlg9v8J4aLFz1Uhqe'

class FileStore:
	
	def __init__(self, filename, language):
		self.al = AlchemyAPI('bf18ed72384724d86425c8674204039f87352870')
		self.filename = filename
		self.language = language
		self.filterKeys =  {'created_at': u'[\'created_at\']', 'id': u'[\'id\']', 'lang': u'[\'lang\']', 'tweet_urls': u'[\'entities\'][\'urls\']', 'tweet_hashtags': u'[\'entities\'][\'hashtags\']', 'user_location': u'[\'user\'][\'location\']', 'keywords': u'[\'alchemy\'][\'keywords\']',  'user_screen_name': u'[\'user\'][\'screen_name\']', 'text': u'[\'text\']', 'text_'+self.language : u'[\'text\']'}

	def extract_entity(self, rawTweet, filteredTweet):
		entities = ['City', 'Country', 'Person', 'Organization', 'PrintMedia']
		try:
			for i in rawTweet['alchemy']['entities']:
				if i['type'] in entities:
					if not filteredTweet.has_key(i['type']):
						filteredTweet[i['type']] = []
					filteredTweet[i['type']].append(i['text'])
		except:
			pass

	def extract_concepts(self, rawTweet, filteredTweet):
		try:
			filteredTweet['concepts'] = []
			for i in rawTweet['alchemy']['concepts']:
				filteredTweet['concepts'].append(i['text'])
				filteredTweet['concepts'].append(i['dbpedia'])
		except:
			pass
			#rawTweet['alchemy']



	def simplify(self, tweetObj, simplifyKeys):
		for key,field in simplifyKeys:
			if tweetObj.has_key(key):
				tempObjList = tweetObj[key]
				tweetObj[key] = [el[field] for el in tempObjList]
	
	def dateConvert(self, tweetObj):
		created_at = tweetObj['created_at']
		tweetObj['created_at'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.strptime(created_at,'%a %b %d %H:%M:%S +0000 %Y'))

	def translate(self, tweetObj):
		lang = ['ar', 'de', 'en', 'fr', 'ru']
		lang.remove(tweetObj['lang'])
		tweet_lang = tweetObj['lang']
		tweetObj['text_'+tweet_lang] = tweetObj['text']
		for i in lang:
			if not tweetObj.has_key('text_'+i):
				text_to_translate = ' '.join(tweetObj['text_'+tweet_lang].split('\n'))
				tweetObj['text_'+i] = translate(text_to_translate, tweet_lang, i)
			elif tweetObj['text_'+i].find('TranslateApiException:') != -1:
				text_to_translate = ' '.join(tweetObj['text_'+tweet_lang].split('\n'))
				tweetObj['text_'+i] = translate(text_to_translate, tweet_lang, i)

		
	def filter(self, tweet):
		
		filteredTweet = {}
		flattenedJson = {}
		lang = ['ar', 'de', 'en', 'fr', 'ru']
			
		for key in self.filterKeys:
			try:
				filteredTweet[key] = eval('tweet' + self.filterKeys[key])
			except:
				pass

		self.extract_entity(tweet, filteredTweet)
		self.extract_concepts(tweet, filteredTweet)
		self.simplify(filteredTweet, [('tweet_urls', 'expanded_url'), ('tweet_hashtags', 'text'), ('keywords', 'text')])
		try:
			self.dateConvert(filteredTweet)
		except:
			pass
		filteredTweet['date'] = filteredTweet['created_at'][:10]

		if filteredTweet.has_key('text_'+filteredTweet['lang']):
			filteredTweet['text'] = filteredTweet['text_'+filteredTweet['lang']]

		for i in lang:
			if filteredTweet.has_key('text_'+i):
				filteredTweet['text_'+i] = filteredTweet['text_'+i].replace('\\', '')
			
		return filteredTweet
	
	def storeFilteredData(self, data):
		with codecs.open(self.filename+'_tweets_filtered'+'.json', 'w', encoding="utf8") as fileHandle:
			json.dump([self.filter(tweetData) for tweetData in data], fileHandle)
		fileHandle.close()	
	
	def storeTweet(self, data):	
		with codecs.open(self.filename+'_tweets'+'.txt', 'w', encoding="utf8") as fileHandle:
			for tweet in data:
				fileHandle.write(str(tweet["id"])+'--->'+tweet['text']+'\n')
		fileHandle.close()
			
	def jsonLoad(self):
		data = []
		
		try:
			with codecs.open(self.filename+'.json', 'r', encoding="ISO-8859-1") as fileHandle:
				try: 
					data = json.load(fileHandle)
				except:
					pass
		except:
			pass
					
		return data
				
	def jsonStore(self, data):
		storedJson = self.jsonLoad()
		uniqueTweets = self.deduplicate(data + storedJson)
		
		with codecs.open(self.filename+'.json', 'w', encoding="ISO-8859-1") as fileHandle:
			json.dump(uniqueTweets, fileHandle)
		fileHandle.close()
		
		self.storeTweet(uniqueTweets)
		self.storeFilteredData(uniqueTweets)
	
	def store(self, data):
		self.jsonStore(data)

	def tag(self, tweet):
		if not tweet.has_key('alchemy'):
			if tweet['lang'] == 'de':
				tweet_text = tweet['text_de']
			else:
				tweet_text = tweet['text_en']
			tweet['alchemy'] = self.al.combined('text', tweet_text)
		elif tweet['alchemy']['status'] == 'ERROR':
			tweet_text = tweet['text']
			'''
			if tweet['lang'] == 'de':
				tweet_text = tweet['text_de']
			elif tweet['lang'] == 'en':
				tweet_text = tweet['text_en']
			'''
			tweet['alchemy'] = self.al.combined('text', tweet_text)
			#pprint.pprint( tweet['alchemy'])

		
			
	def deduplicate(self, data):
		uniqueTweets = {}
		count = 0
		try:
			for tweet in data:
				if not uniqueTweets.has_key(tweet['id']):
					print "translation and tagging: "+str(count)
					count = count+1
					self.translate(tweet)
					self.tag(tweet)
					uniqueTweets[tweet['id']] = tweet
					#print (tweet['text'])
			print(len(uniqueTweets.values()))
		except:
			pass
			
		return uniqueTweets.values()
			
	def load(self):
		data = []
		try:
			with codecs.open(self.filename+'.dat', 'rb', encoding="ISO-8859-1") as fileHandle:
				while True:
					try:
						data.append(cPickle.load(fileHandle))
					except:
						break

		except:
			pass
		
		return data		


class TwitterAPI:
	

	def __init__(self):
		self.apiHandle = Twython(CUST_KEY, CUST_SECRET)
		
	def search(self, keyword, language='en', upto=time.strftime('%Y-%m-%d')):
		#print "======="+keyword
		#print "-------"+language
		apiResponse = self.apiHandle.search(q=keyword, lang=language, count=200)
		#response = [self.filter(tweet) for tweet in apiResponse['statuses']]
		#apiResponse = self.apiHandle.search(q='syria', lang='en')
		print (len(apiResponse['statuses']))	
		return apiResponse['statuses']


def getSearchKey(filename):
	data = json.load(open(filename+'.json'))
	hashtags = [' '.join([y['text'] for y in x['entities']['hashtags']]) for x in data]
	dictionary = {}
	for i in hashtags:
		if not dictionary.has_key(i):
			dictionary[i] = 1
		else:
			dictionary[i] = dictionary[i]+1
	it = dictionary.items()
	it.sort(key = lambda x:x[1],reverse=True)

	return it[random.randint(0, len(it)-1)][0]

if __name__ == "__main__":
	reload(sys)
	sys.setdefaultencoding('ISO-8859-1')
	
	if(len(sys.argv) >= 5):
		persistentFileStore = sys.argv[1]
		searchTerm = sys.argv[2]
		language = sys.argv[3]
		upto = sys.argv[4]
	elif(len(sys.argv) < 5):
		language = 'en'
		upto = time.strftime('%Y-%m-%d') 
	else:
		print("Insufficent arguments")
		exit()
	
	twitterAPI = TwitterAPI()
	fileStore = FileStore(persistentFileStore, language)

	#upto = str(random.randint(2010,2015))+'-'+str(random.randint(1,12))+'-'+str(random.randint(1,31))
	
	#searchTerm = getSearchKey(persistentFileStore)
	
	print searchTerm+'--'+language+'--'+'--'+upto	
	response = twitterAPI.search(searchTerm, language, upto)
	
	fileStore.store(response)
	
	data = fileStore.jsonLoad()

	'''
	for i in data:
		try:
			print i['text']
		except:
			pass
	
	print(len(data))		
	'''
