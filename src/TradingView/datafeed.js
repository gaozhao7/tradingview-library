import { io } from 'socket.io-client';
import moment from 'moment-timezone';
import MockDate from 'mockdate'
import { v4 as uuidv4 } from 'uuid';


const socket = io('http://192.168.1.40:3000');
const EXCHANGE = 'FTMO';
const TIMEFRAMES = ['1', '2', '3', '4', '5', '6', '10', '12', '15', '20', '30', '1H', '2H', '3H', '4H', 'D', 'W', 'M'];
const ONE_DAY = 86400
let TIMEZONE = null
let SUBSCRIPTIONS = new Map([['symbols', []]])
let BAR_REPLAY = {
   ON: false,
   STATUS: 'stop',
   FINAL: null,
   FUTURE_DATA: [],
   SPEED: 1000,
   INTERVAL: null
}

const TICK_METHOD = 'OHLC' // or 'TICK'

const configurationData = {
   supported_resolutions: TIMEFRAMES,

   exchanges: [
      {
         value: EXCHANGE,
         name: EXCHANGE,
         desc: EXCHANGE,
      },
      {
         value: 'MetaQuotes',
         name: 'MetaQuotes',
         desc: 'MetaQuotes',
      },
   ],

   symbols_types: [
      {
         name: 'All',
         value: 'All',
      },
      {
         name: 'Forex',
         value: 'Forex',
      },
      {
         name: 'Indices',
         value: 'Indices',
      },
      {
         name: 'Crypto',
         value: 'Crypto',
      },
      {
         name: 'Stocks',
         value: 'Stocks',
      }
   ],

   symbol_type: "All"
}

const log = (header = 'DEBUG', message = '', color = 'green') => {

   const colors = {
      red: 'color:#fff;padding:2px 4px;margin-right:8px;border-radius:2px;background:#ff1919;',
      green: 'color:#fff;padding:2px 4px;margin-right:8px;border-radius:2px;background:#4aa838;',
      blue: 'color:#fff;padding:2px 4px;margin-right:8px;border-radius:2px;background:#3878a8;'
   }

   const _color = colors[color] === undefined ? 'green' : colors[color]

   message = typeof (message) == 'object' ? JSON.stringify(message) : message
   console.log(`%c${header}%c${message}`, _color, '');
}

const get_timezone_seconds = (timezone) => {
   return moment().tz(timezone).utcOffset() * 60;
}

const get_next_bar_time = (barTime, timeframe) => {
   const date = new Date(barTime)
   date.setSeconds(0)

   if (timeframe === 'D') {
      date.setDate(date.getDate() + 1)
   } else if (timeframe === 'W') {
      date.setDate(date.getDate() + 7)
   } else if (timeframe === 'M') {
      date.setMonth(date.getMonth() + 1)
   } else {
      const minutes = parseInt(timeframe)
      date.setTime(date.getTime() + minutes * 60000)
   }

   const next_bar_time = date.getTime()

   return next_bar_time
}

socket.on('tick', (tick) => {

   if (TICK_METHOD == 'OHLC') {

      if (tick.status == 'error') return;
      if (tick.symbol != SUBSCRIPTIONS.get('current_symbol')) return; // Sometimes it loads previous symbol tick and this creates a conflict

      SUBSCRIPTIONS.get('callback')({
         time: tick.time * 1000,
         open: tick.open,
         high: tick.high,
         low: tick.low,
         close: tick.close
      })

   }

   if (TICK_METHOD == 'TICK') {
      const last_bar = SUBSCRIPTIONS.get(tick.symbol);
      const timeframe = SUBSCRIPTIONS.get('timeframe');
      const next_bar_time = get_next_bar_time(last_bar.time, timeframe)

      let bar;

      if (tick.time > next_bar_time) {

         bar = {
            time: tick.time,
            open: tick.bid,
            high: tick.bid,
            low: tick.bid,
            close: tick.bid
         }

      } else {

         bar = {
            ...last_bar,
            high: Math.max(tick.bid, last_bar.high),
            low: Math.min(tick.bid, last_bar.low),
            close: tick.bid
         }

      }

      SUBSCRIPTIONS.set(tick.symbol, bar)
      SUBSCRIPTIONS.get('callback')(bar)
   }

})

const getSymbols = async () => {

   const request = {
      action: "GET_SYMBOLS"
   }

   socket.send(JSON.stringify(request));

   return new Promise((resolve, reject) => {
      socket.on('symbols', (message) => {
         resolve(message);
      });
   });

}

const getSymbol = async (symbol) => {

   const request = {
      action: "GET_SYMBOL",
      symbol: symbol
   }

   socket.send(JSON.stringify(request));

   return new Promise((resolve, reject) => {
      socket.on('symbol', (message) => {
         resolve(message);
      });
   });

}

const getBarsHistory = async (symbol, timeframe, from, to) => {

   const request = {
      action: "GET_BARS",
      symbol: symbol,
      timeframe: timeframe,
      from: from,
      to: to
   }

   socket.send(JSON.stringify(request));

   return new Promise((resolve, reject) => {
      socket.on('bars', (message) => {
         resolve(message);
      });
   });

}

export default {

   onReady: (callback) => {
      // log("ON_READY")
      setTimeout(() => callback(configurationData));
   },

   searchSymbols: async (userInput, exchange, symbolType, onResultReadyCallback) => {
      // log("SEARCH_SYMBOLS")
      const symbols = await getSymbols();

      const filtered_symbols = symbols.filter(symbol => {
         const emptyUserInput = userInput === '';
         const symbolMatch = symbol.full_name.toLowerCase().indexOf(userInput.toLowerCase()) !== -1;
         const isExchangeValid = exchange === '' || symbol.exchange === exchange;
         const isTypeValid = symbolType == 'All' || symbol.type === symbolType;

         return (emptyUserInput || symbolMatch) && isExchangeValid && isTypeValid;
      });


      onResultReadyCallback(filtered_symbols);
   },

   resolveSymbol: async (_symbol, onSymbolResolvedCallback, onResolveErrorCallback, extension) => {
      // log("RESOLVE_SYMBOL")

      const symbol = _symbol.includes(':') ? await getSymbol(_symbol.split(':')[1]) : await getSymbol(_symbol)

      const symbolInfo = {
         name: symbol.name,
         description: symbol.description,
         exchange: symbol.exchange,
         type: symbol.type,
         format: 'price',
         session: '24x7',
         timezone: 'Europe/Moscow',
         pricescale: parseInt(symbol.pricescale),
         minmovement: 1,
         has_intraday: true,
         has_daily: true,
         has_weekly_and_monthly: true,
         supported_resolutions: TIMEFRAMES,
         data_status: 'streaming'
      };

      TIMEZONE = get_timezone_seconds(symbolInfo.timezone);

      onSymbolResolvedCallback(symbolInfo);
   },

   getBars: async (symbol, timeframe, periods, onHistoryCallback, onErrorCallback) => {
      // log("GET_BARS")
      // console.log(periods)

      const firstDataRequest = periods.firstDataRequest
      var from = periods.from
      var to = periods.to

      if (firstDataRequest && localStorage.getItem('bar_replay')) {

         BAR_REPLAY.ON = true
         BAR_REPLAY.FINAL = Math.floor(new Date().getTime() / 1000);

         to = parseInt(localStorage.getItem('bar_replay'))

         MockDate.set(to * 1000);

         from = from > to ? to - 86400 : from

         // GETTING ALL FUTURE DATA
         BAR_REPLAY.FUTURE_DATA = await getBarsHistory(symbol.name, timeframe, to + TIMEZONE, BAR_REPLAY.FINAL + TIMEZONE);
      }

      localStorage.removeItem('bar_replay')

      const data = await getBarsHistory(symbol.name, timeframe, from + TIMEZONE, to + TIMEZONE);

      if (data.length == 0) {
         onHistoryCallback([], { nextTime: from + TIMEZONE - ONE_DAY });
         return;
      }

      let bars = [];

      data.forEach(bar => {
         bars = [...bars, {
            time: bar.time * 1000,
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
         }];
      });

      if (firstDataRequest) {
         SUBSCRIPTIONS.set(symbol.name, { ...bars[bars.length - 1] })
         SUBSCRIPTIONS.get(symbol.name).time += TIMEZONE
      }

      onHistoryCallback(bars, { noData: false });

   },

   subscribeBars: (symbol, timeframe, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback) => {
      // log("SUBSCRIBE")

      if (!BAR_REPLAY.ON) {
         SUBSCRIPTIONS.get('symbols').push(symbol.name);
         SUBSCRIPTIONS.set('current_symbol', symbol.name);
         SUBSCRIPTIONS.set('timeframe', timeframe);
         SUBSCRIPTIONS.set('callback', onRealtimeCallback);

         const request = {
            action: "SUBSCRIBE",
            symbol: symbol.name
         }

         socket.send(JSON.stringify(request));
      } else {
         SUBSCRIPTIONS.set('callback', onRealtimeCallback);
      }

   },

   unsubscribeBars: (subscriberUID) => {
      // log("UNSUBSCRIBE")

      if (!BAR_REPLAY.ON) {
         const symbol = SUBSCRIPTIONS.get('symbols').shift()
         SUBSCRIPTIONS.delete(symbol)

         const request = {
            action: "UNSUBSCRIBE",
            symbol: symbol.name
         }

         socket.send(JSON.stringify(request));

      }

   },

   // BAR_REPLAY

   bar_replay_start: () => {
      log('BAR_REPLAY_START')

      BAR_REPLAY.STATUS = 'start'

      BAR_REPLAY.INTERVAL = setInterval(() => {
         const candle = BAR_REPLAY.FUTURE_DATA.shift();

         if (candle) {
            SUBSCRIPTIONS.get('callback')({
               time: candle.time * 1000,
               open: candle.open,
               high: candle.high,
               low: candle.low,
               close: candle.close
            })
         } else {
            BAR_REPLAY.ON = false
         }

      }, BAR_REPLAY.SPEED)
   },

   bar_replay_stop: () => {
      log('BAR_REPLAY_STOP')

      BAR_REPLAY.STATUS = 'stop'
      clearInterval(BAR_REPLAY.INTERVAL)
   },

   bar_replay_step: () => {
      log('BAR_REPLAY_STEP')
      clearInterval(BAR_REPLAY.INTERVAL)

      const candle = BAR_REPLAY.FUTURE_DATA.shift();

      if (candle) {
         SUBSCRIPTIONS.get('callback')({
            time: candle.time * 1000,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close
         })
      }

   },

   bar_replay_set_speed: (speed) => {
      log('BAR_REPLAY_SET_SPEED')
      if (BAR_REPLAY.ON) {
         BAR_REPLAY.SPEED = speed
         clearInterval(BAR_REPLAY.INTERVAL)

         if (BAR_REPLAY.STATUS == 'start') {
            BAR_REPLAY.INTERVAL = setInterval(() => {
               const candle = BAR_REPLAY.FUTURE_DATA.shift();

               if (candle) {
                  SUBSCRIPTIONS.get('callback')({
                     time: candle.time * 1000,
                     open: candle.open,
                     high: candle.high,
                     low: candle.low,
                     close: candle.close
                  })
               } else {
                  BAR_REPLAY.ON = false
               }

            }, BAR_REPLAY.SPEED)
         }

      }

   },

   // SAVE/LOAD CHART

   save_load_adapter: {
      charts: [],
      drawingTemplates: [],

      // CHARTS

      getAllCharts: function () {
         log('GET ALL CHARTS')

         return Promise.resolve(this.charts);
      },

      removeChart: function (id) {
         log('REMOVE CHART')

         this.charts = this.charts.filter(chart => chart.id !== id)

         return Promise.resolve()
      },

      saveChart: function (chartData) {
         log('SAVE CHART')


         if (chartData.id === null || typeof chartData.id === undefined) {
            chartData.id = uuidv4()
         } else {
            this.removeChart(chartData.id);
         }

         chartData.timestamp = Math.floor(Date.now() / 1000);
         this.charts.push(chartData);

         return Promise.resolve(chartData.id);
      },

      getChartContent: function (id) {
         log('GET CHART CONTENT')

         const chart = this.charts.find(chart => chart.id === id)

         if (chart) {
            return Promise.resolve(chart.content)
         }

         return Promise.reject()

      },


      // DRAWINGS

      removeDrawingTemplate: function (toolName, templateName) {
         log('REMOVE DRAWING TEMPLATE')

         this.drawingTemplates = this.drawingTemplates.filter(drawingTemplate => drawingTemplate.name !== templateName)

         return Promise.resolve()
      },

      loadDrawingTemplate: function (toolName, templateName) {
         return Promise.reject()
      },

      saveDrawingTemplate: function (toolName, templateName, content) {
         return Promise.resolve();
      },

      getDrawingTemplates: function () {
         log('GET DRAWING TEMPLATE')

         return Promise.resolve(this.drawingTemplates.map(function (template) {
            return template.name;
         }));
      },

   }
}
