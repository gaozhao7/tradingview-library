import { useRef, useEffect } from 'react'
import './index.css'
import { widget as tv_widget } from '../charting_library/charting_library.esm'
import Datafeed from './datafeed.js'


export default function TradingView() {

   const defaultProps = {
      symbol: 'EURUSD',
      interval: '1',
      fullscreen: true,
      datafeed: Datafeed,
      libraryPath: '/charting_library/',
      chartsStorageUrl: 'http://192.168.1.40:8000',
      chartsStorageApiVersion: '1.0',
      client_id: 'test_org',
      user_id: 'test'
   }

   const ref = useRef(null)

   useEffect(() => {
      if (ref.current) {

         const widgetOptions = {
            symbol: defaultProps.symbol,
            datafeed: defaultProps.datafeed,
            interval: localStorage.getItem('timeframe') != null ? localStorage.getItem('timeframe') : defaultProps.interval,
            container: ref.current,
            library_path: defaultProps.libraryPath,
            charts_storage_api_version: defaultProps.chartsStorageApiVersion,
            fullscreen: defaultProps.fullscreen,
            charts_storage_url: defaultProps.chartsStorageUrl,
            client_id: defaultProps.client_id,
            user_id: defaultProps.user_id,
            locale: 'en',
            disabled_features: ['widget_logo', 'create_volume_indicator_by_default', 'study_templates'],
            enabled_features: ['use_localstorage_for_settings'],
            timezone: 'Europe/Moscow',

            // debug: true,

            overrides: {
               'mainSeriesProperties.showCountdown': true,

               'mainSeriesProperties.candleStyle.upColor': 'rgb(255, 255, 255)',
               'mainSeriesProperties.candleStyle.downColor': 'rgb(0, 0, 0)',
               'mainSeriesProperties.candleStyle.borderUpColor': 'rgb(0, 0, 0)',
               'mainSeriesProperties.candleStyle.borderDownColor': 'rgb(0, 0, 0)',
               'mainSeriesProperties.candleStyle.wickUpColor': 'rgb(0, 0, 0)',
               'mainSeriesProperties.candleStyle.wickDownColor': 'rgb(0, 0, 0)',
            },

            time_frames: [
               { text: '5m', resolution: '5', description: '5m', title: '5m' },
               { text: '15m', resolution: '15', description: '15m', title: '15m' },
               { text: '30m', resolution: '30', description: '30m', title: '30m' },
               { text: '1h', resolution: '60', description: '1h', title: '1h' },
               { text: '4h', resolution: '240', description: '4h', title: '4h' },
               { text: '1D', resolution: '1D', description: '1D', title: '1D' },
               { text: '1W', resolution: '1W', description: '1W', title: '1W' },
               { text: '1M', resolution: '1M', description: '1M', title: '1M' },
            ],

            load_last_chart: true,

            // save_load_adapter: Datafeed.save_load_adapter

         };

         const widget = new tv_widget(widgetOptions);
         var _widget = widget;

         widget.onChartReady(() => {
            window.widget = widget

            widget.activeChart().onIntervalChanged().subscribe(null, (interval, timeframeObj) => {
               localStorage.setItem('timeframe', interval);
            });


            widget.headerReady().then(async () => {

               // BAR REPLAY

               var bar_replay_status = 0
               var bar_replay = widget.createButton();
               bar_replay.setAttribute('title', 'Bar replay');

               bar_replay.addEventListener('click', () => {

                  if (bar_replay_status == 0) {
                     bar_replay.innerHTML = '<div data-role="button" class="button-reABrhVR" style="padding:4px"; display: inline-flex; align-items: center;"> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28"> <path fill="none" stroke="blue" d="M13.5 20V9l-6 5.5 6 5.5zM21.5 20V9l-6 5.5 6 5.5z"></path> </svg> <span style="color: blue">Replay</span> </div>'
                     widget.activeChart().requestSelectBar().then((time) => {
                        localStorage.setItem('bar_replay', time);
                        window.location.reload();
                     })
                  } else {
                     bar_replay.innerHTML = '<div data-role="button" class="button-reABrhVR" style="padding:4px"; display: inline-flex; align-items: center;"> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28"> <path fill="none" stroke="currentColor" d="M13.5 20V9l-6 5.5 6 5.5zM21.5 20V9l-6 5.5 6 5.5z"></path> </svg> <span>Replay</span> </div>'
                     widget.activeChart().cancelSelectBar();
                  }

                  bar_replay_status = bar_replay_status == 0 ? 1 : 0

               })

               bar_replay.innerHTML = '<div data-role="button" class="button-reABrhVR" style="padding:4px"; display: inline-flex; align-items: center;"> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28"> <path fill="none" stroke="currentColor" d="M13.5 20V9l-6 5.5 6 5.5zM21.5 20V9l-6 5.5 6 5.5z"></path> </svg> <span>Replay</span> </div>'

               // PLAY

               var bar_replay_controls_status = 0
               var bar_replay_controls = widget.createButton();
               bar_replay_controls.setAttribute('title', 'Play');

               bar_replay_controls.addEventListener('click', () => {

                  if (bar_replay_controls_status == 0) {
                     Datafeed.bar_replay_start()
                     bar_replay_controls.innerHTML = '<div data-role="button" class="button-reABrhVR" style="padding:4px"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28"><path fill="currentColor" fill-rule="evenodd" d="M10 6h2v16h-2V6ZM9 6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V6Zm7 0h2v16h-2V6Zm-1 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V6Z"></path></svg></div>'
                  } else {
                     Datafeed.bar_replay_stop()
                     bar_replay_controls.innerHTML = '<div data-role="button" class="button-reABrhVR" style="padding:4px"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28"><path fill="currentColor" fill-rule="evenodd" d="m10.997 6.93 7.834 6.628a.58.58 0 0 1 0 .88l-7.834 6.627c-.359.303-.897.04-.897-.44V7.37c0-.48.538-.743.897-.44Zm8.53 5.749a1.741 1.741 0 0 1 0 2.637l-7.834 6.628c-1.076.91-2.692.119-2.692-1.319V7.37c0-1.438 1.616-2.23 2.692-1.319l7.834 6.628Z"></path></svg></div>'
                  }

                  bar_replay_controls_status = bar_replay_controls_status == 0 ? 1 : 0

               })

               bar_replay_controls.innerHTML = '<div data-role="button" class="button-reABrhVR" style="padding:4px"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28"><path fill="currentColor" fill-rule="evenodd" d="m10.997 6.93 7.834 6.628a.58.58 0 0 1 0 .88l-7.834 6.627c-.359.303-.897.04-.897-.44V7.37c0-.48.538-.743.897-.44Zm8.53 5.749a1.741 1.741 0 0 1 0 2.637l-7.834 6.628c-1.076.91-2.692.119-2.692-1.319V7.37c0-1.438 1.616-2.23 2.692-1.319l7.834 6.628Z"></path></svg></div>'


               // FORWARD (STEP)

               var bar_replay_step = widget.createButton();
               bar_replay_step.setAttribute('title', 'Forward');

               bar_replay_step.addEventListener('click', () => {
                  Datafeed.bar_replay_step()
               })

               bar_replay_step.innerHTML = '<div data-role="button" class="button-reABrhVR" style="padding:4px"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28"><path fill="currentColor" fill-rule="evenodd" d="M20 6v16h1V6h-1Zm-3.908 7.628L9.834 7.996A.5.5 0 0 0 9 8.368v11.264a.5.5 0 0 0 .834.372l6.258-5.632a.5.5 0 0 0 0-.744Zm.67 1.487a1.5 1.5 0 0 0 0-2.23l-6.259-5.632C9.538 6.384 8 7.07 8 8.368v11.264c0 1.299 1.538 1.984 2.503 1.115l6.258-5.632Z"></path></svg></div>'


               // DROPDOWN

               let dropdown;

               const change_title = (new_title) => {
                  dropdown.applyOptions({
                     title: new_title
                  });
               }

               dropdown = await widget.createDropdown({
                  title: '1x',
                  tooltip: 'Replay speed',
                  items: [
                     {
                        title: '10x',
                        onSelect: () => {
                           change_title('10x')
                           Datafeed.bar_replay_set_speed('100')
                        },
                     },
                     {
                        title: '5x',
                        onSelect: () => {
                           change_title('5x')
                           Datafeed.bar_replay_set_speed('500')
                        },
                     },
                     {
                        title: '3x',
                        onSelect: () => {
                           change_title('3x')
                           Datafeed.bar_replay_set_speed('300')
                        },
                     },
                     {
                        title: '1x',
                        onSelect: () => {
                           change_title('1x')
                           Datafeed.bar_replay_set_speed('1000')
                        },
                     },
                     {
                        title: '0.5x',
                        onSelect: () => {
                           change_title('0.5x')
                           Datafeed.bar_replay_set_speed('2000')
                        },
                     },
                     {
                        title: '0.3x',
                        onSelect: () => {
                           change_title('0.3x')
                           Datafeed.bar_replay_set_speed('3000')
                        },
                     },
                     {
                        title: '0.1x',
                        onSelect: () => {
                           change_title('0.1x')
                           Datafeed.bar_replay_set_speed('10000')
                        },
                     }
                  ],
               })

            });

         });

         return () => {
            if (_widget !== null) {
               _widget.remove();
               _widget = null;
            }
         };
      }

   }, [])

   return <div ref={ref} />

}
