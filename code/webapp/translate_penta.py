import urllib2
import urllib
import json
import sys
import pprint

def translate_abc(text, from_lang, to_lang):
	auth = json.loads(urllib2.urlopen('http://localhost/token.php').read())
	token = auth['access_token']

	reload(sys)
	sys.setdefaultencoding('utf-8')

	baseURL = 'http://api.microsofttranslator.com/V2/Ajax.svc/Translate?'

	data = {}
	data['appId'] = 'bearer '+token
	data['text'] = text
	data['from'] = from_lang
	data['to'] = to_lang

	params = urllib.urlencode(data)

	url = baseURL+params

	translatedText = urllib2.urlopen(url).read()

	return translatedText.split('\"')[1]

def detect(text):
	auth = json.loads(urllib2.urlopen('http://localhost/token.php').read())
	token = auth['access_token']

	reload(sys)
	sys.setdefaultencoding('utf-8')

	baseURL = 'http://api.microsofttranslator.com/V2/Ajax.svc/Detect?'
	data = {}
	data['appId'] = 'bearer '+token
	data['text'] = text
	'''
	baseURL = 'http://ws.detectlanguage.com/0.2/detect?'
	data = {}
	data['q'] = text
	data['key'] = 'e5962cf3e62e9b43ca8827d0edb7f4fd'
	'''
	params = urllib.urlencode(data)

	url = baseURL+params

	detected_lang = urllib2.urlopen(url).read()

	return detected_lang.split('\"')[1]
	'''
	pprint.pprint(detected_lang)
	dl = json.loads(detected_lang)
	languages = dl['data']['detections']
	languages.sort(key = lambda x:x['confidence'], reverse=True)

	return languages[0]['language']
	'''
