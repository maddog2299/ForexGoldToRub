
require('event-source-polyfill');
var EventSource = require('eventsource');
var request = require('request');
try {
  var Spooky = require('spooky');
} catch (e) {
  var Spooky = require('../lib/spooky');
}

  var spooky = new Spooky({
    child: {
      transport: 'http'
    },
    casper: {
      logLevel: 'debug',
      verbose: true
    }
  }, function (err) {
    if (err) {
      e = new Error('Failed to initialize SpookyJS');
      e.details = err;
      throw e;
    }

    spooky.start(
        'http://jq.forexpf.ru/html/htmlquotes/site.jsp');

        spooky.then(function () {

          var SID = '';

          function returnDataFromSelector(selector) {
            return document.getElementsByTagName(selector)[0].getAttribute("src");
          }

          SID = this.evaluate(returnDataFromSelector, 'iframe');
          SID = this.evaluate(function () {
            var answer;
            answer = document.getElementsByTagName("iframe")[0].getAttribute("src");
            answer = answer.split('?');
            answer = answer[1].split('&');
            return answer[0];
          });
          this.emit('pageData', SID);
        });

        spooky.run();
      });

  spooky.on('error', function (e, stack) {
    console.error(e);

    if (stack) {
      console.log(stack);
    }
  });


  spooky.on('pageData', function (SID) {

    var time = new Date().getTime();
    var query = 'http://jq.forexpf.ru/html/htmlquotes/qsse?msg=1;'+SID+';T='+time;
    var eventSource = new EventSource(query);
    var goldResBid;
    var UsdRubResBid;
    var goldResAsk;
    var UsdRubResAsk;
    eventSource.onmessage = function (event) {
      var time = new Date().getTime();
      var str = event.data || '';
      const Coef = 31.1035;
      var gold = /GOLD/gi;
      var UsdRub = /USDRUB/gi;
      if(str.match(gold)){
        var resGold = str.split(';');
        var Bid = resGold[3].slice(3);
        Bid = Bid/Coef;
        var Ask = resGold[6].slice(3);
        Ask = Ask/Coef;
        goldResBid = Bid.toFixed(3);
        goldResAsk = Ask.toFixed(3);
      }

      else if(str.match(UsdRub)){
        var resUsdRub = str.split(';');
        UsdRubResBid = resUsdRub[3].slice(3);
        UsdRubResAsk = resUsdRub[6].slice(3);
      }
      if(typeof(goldResAsk) != "undefined"){
        var bid =goldResBid*UsdRubResBid;
        var ask = goldResAsk*UsdRubResAsk;
        var output ={
          ask:ask,
          bid:bid,
          timestamp:time
        };

        request({
          url: "https://search-forexgoldtorub-r5xuznyqsqyv7vkeoidp3qztra.us-west-2.es.amazonaws.com/graphics-event/event",
          method: "POST",
          json: true,
          body: output
        }, function optionalCallback(err, httpResponse, body) {
          if (err) {
            return console.error('upload failed:', err);
          }
          console.log('Upload successful!  Server responded with:', body);
        });

        //console.log(output);
      }

    };

  });

  spooky.on('log', function (log) {
    if (log.space === 'remote') {
      console.log(log.message.replace(/ \- .*/, ''));
    }
  });
