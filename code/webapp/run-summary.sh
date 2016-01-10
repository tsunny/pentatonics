rm *.pid
nohup python summarizer_webapp.py &> log &
touch $$.pid
