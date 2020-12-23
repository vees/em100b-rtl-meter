# Power Meter live display proof of concept

This project is a proof of concept to connect a home power meter to a live display on the web.

The data source is a <a href="https://www.gegridsolutions.com/products/brochures/i210_family.pdf">GE I-210+c ANSI Single Phase Meter</a>. Any time 1.0 watt hours of energy passes through the meter it sends a pulse of infrared light out from an emitter on the front.  This pulse is received by a <a href="https://www.blackanddecker.com/product-repository/products/2015/02/01/00/15/em100b">Black and Decker EM100B</a> Power Monitor attached to the outside of the meter. Every 30 seconds the EM100B transmits a data packet on 433.92 MHz reporting the interval in milliseconds between the last two pulses it received.

This signal is received by an inexpensive <a href="https://www.amazon.com/EZCAP-EzTV-645-RTL2832U-FC0013-Digital/dp/B00IODM3DC/">EzTV 645 DVT-B SDR receiver</a> with a Fitipower FC0013 chip and decoded by the <a href="https://github.com/merbanan/rtl_433">rtl_433 generic data receiver software</a>. The rtl_433 decodes each packet using a <a href="https://github.com/jbrzozoski/rtl_433/commit/e04529c565591a6129098d4e3eb8b815c4feab72">recent patch</a> and immediately passes it to a <a href="https://mosquitto.org/man/mosquitto_pub-1.html">mosquitto_pub client</a> to send to the public <a href="https://mosquitto.org/">MQTT server/broker</a> at <a href="https://test.mosquitto.org/">test.mosquitto.org</a>.

When a web browser loads this page, it contacts the MQTT server and subscribes to the specific topic using a websocket. This listener stays open as long as the page is open, and any time a new message is received the current power level on the indicator is updated. This is powered by a combination of <a href="https://www.npmjs.com/package/mqtt">mqtt</a> and <a href="https://www.npmjs.com/package/react-d3-speedometer">react-d3-speedometer</a> and designed using <a href="https://reactjs.org/">ReactJS</a> to a static build.

In this way it is as close to a real time information display as can be done for free.

Repository is at [https://github.com/vees/em100b-rtl-meter](https://github.com/vees/em100b-rtl-meter)

# Setup Instructions
