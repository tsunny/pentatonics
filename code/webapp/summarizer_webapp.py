# -*- coding: utf-8 -*-
from flask import Flask, request, jsonify
from pytldr.summarize.lsa import LsaOzsoy, LsaSteinberger
from pytldr.summarize.relevance import RelevanceSummarizer
from pytldr.summarize.textrank import TextRankSummarizer
from flask.ext.cors import CORS
import twokenize
import re
import os
from urllib import urlopen
from lxml import etree
import requests
from translate_penta import * 

app = Flask(__name__)
CORS(app)

@app.route("/test/")
def test():
    return jsonify(status='OK')


@app.route("/summary/", methods=['POST'])
def summarize():
    """
    Request JSON structure:
        {"request_url":"http://localhost:8983/solr/IR_ProjectB/select?q=text_en%3APutin&wt=json&indent=true",
        "summarizer":"lsa",
        "summaryCount": 20}
    Valid summarizers are
    lso - LSA Ozsoy
    lsa - LSA Steinberger
    rel - Relevance
    tr - TextRank

    Response JSON structure:
        {
          "summary": [
                {
                    "id": "653278474317221888",
                    "tweet": "RT @Russ_Warrior: Today another #Saudi delegation visited #Russia to lose time... No agreements on nothing, #Putin told them his plans abou..."
                }]
        }
    """

    body = request.json
    request_url = body['request_url']
    request_url += '&rows=10'
    print '### Request URL: ' + request_url + '\n'
    resp = requests.get(request_url)
    print '### Response from SOLR: ' + `resp.status_code` + '\n'

    if resp.status_code != 200:
        return jsonify(error=resp.text)

    # text_fields = ['text_en', 'text_de', 'text_ru', 'text_fr', 'text_ar']
    # text_fields = ['text_en']
    json_response = resp.json()

    search_results = json_response['response']['docs']
    if not search_results:
        return jsonify(summary='{}')

    tweetMap = dict()
    text = """ """
    firstTweet = dict()
    i = 0
    # extract the tweets and tweet id and feed it to the summarizer
    for tweets in search_results:
        temp = ''
        tweet = ''

        tweet_id = tweets['id']
        temp += tweet_id
        temp += ' | '

        tweet = tweets['text']
        
        cleanedTweet = cleanTweet(tweet)
        
        temp += cleanedTweet

        text += '\n'
        text += temp
        tweetMap[tweet_id] = tweet
        if i == 0:
           firstTweet['id'] = tweet_id
           firstTweet['tweet'] = tweet
	   i = i + 1 

    # text = text.decode('utf-8')
    summarizer = 'tr'
    if 'summarizer' in body:
        summarizer = body['summarizer']

    summaryCount = 5
    if 'summaryCount' in body:
        summaryCount = body['summaryCount']

    summary = invokeSummarizer(text, summarizer, summaryCount)
    print summary
	
    json_summary = convertToJson(summary, tweetMap)
    
    if len(json_summary) == 0:
	json_summary.append(firstTweet)

    return jsonify(summary=json_summary)


def invokeSummarizer(text, summarizer_type, count):
    if 'lso' == summarizer_type:
        summarizer = LsaOzsoy()
    if 'lsa' == summarizer_type:
        summarizer = LsaSteinberger()
    if 'rel' == summarizer_type:
        summarizer = RelevanceSummarizer()
    if 'tr' == summarizer_type:
        summarizer = TextRankSummarizer()

    summary = summarizer.summarize(text, length=count)
    return summary


def convertToJson(summary, tMap):
    list = []
    for tweet in summary:
        splits = tweet.split(" | ", 1)
        if len(splits) == 1:
            continue
        tweet_map = dict()
        tweet_map['id'] = splits[0]
        tweet_map['tweet'] = tMap[splits[0]]
        list.append(tweet_map)

    return list

def cleanTweet(tweet):
    tokens = twokenize.tokenizeRawTweetText(tweet)
    cleanedTweet = "";
    for token in tokens:
        if (not token.startswith('http')) and (not token.startswith('www')) :
            token += ' '
            cleanedTweet += token
    return cleanedTweet

@app.route("/img-scrape/", methods=['POST'])
def scrape():
	body = request.json
	print (request)
	request_url = body['request_url']

	f = urlopen(request_url).read()
	tree = etree.HTML( f )
	m = tree.xpath( "//meta" )
	im = ''
	title = ''
	for i in m:
		try:
			if i.attrib.get('name') == 'twitter:image' or i.attrib.get('property') == 'og:image':
				im = i.attrib.get('content')
				print (i.attrib.get('content'))
			if i.attrib.get('name') == 'twitter:title' or i.attrib.get('property') == 'og:title':
				title = i.attrib.get('content')
				print (i.attrib.get('content'))
		except:
			pass

	return jsonify({'image': im, 'title': title})


@app.route("/detect/", methods=['POST'])
def detect_lang():
	body = request.json
	text = body['text']
	lang  = detect(text)

	return jsonify({'lang': lang})

@app.route("/translate/", methods=['POST'])
def translate_lang():
	body = request.json
	print (request)
	text = body['text']
	from_lang = body['from']
	to_lang = body['to']
	translated_text  = translate_abc(text, from_lang, to_lang)

	return jsonify({'text': translated_text, 'to': to_lang})



if __name__ == "__main__":
    app.debug = True
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)

