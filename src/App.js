//import logo from './logo.svg';
import './App.css';
import ReactSpeedometer from "react-d3-speedometer";
import React, { useState} from 'react';
var mqtt = require('mqtt')

var options = {
    protocol: 'mqtts',
    // clientId uniquely identifies client
    // choose any string you wish
    clientId: 'vees'    
};
var client  = mqtt.connect('ws://test.mosquitto.org:8081', options);

//var client  = mqtt.connect('mqtt://test.mosquitto.org:1884')
 
client.on('connect', function () {
  client.subscribe('home/rtl_433', function (err) {
    if (!err) {
    }
  })
})
 



function Wattage()
{
  const [watts, setWatts] = useState(0);


client.on('message', function (topic, message) {
  // message is Buffer
  console.log(message.toString())
  var packet=JSON.parse(message)
  if ("gap" in packet) {
    var watts = Math.round(3600000/packet["gap"])
    setWatts(watts)
  }
})
		return (
			<ReactSpeedometer value={watts} minValue={0} maxValue={10000} 
  startColor="green"
  segments={5}
  endColor="red"
  currentValueText="#{value} watts"
  currentValuePlaceholderStyle={"#{value}"}
  // fluidWidth={true}
  height={300}
      />
		);
}

function App() {
  return (
    <div className="App">
      <div className="meters">
  			<Wattage />
      </div>
      <div className="readme">
        <p>This page is a proof of concept to connect a home power meter to a live display on the web.</p>
        <p>The data source is a <a href="https://www.gegridsolutions.com/products/brochures/i210_family.pdf">GE I-210+c ANSI Single Phase Meter</a>.
        Any time 1.0 watt hours of energy passes through the meter it sends a pulse of infrared light out from an emitter on the front. 
        This pulse is received by a <a href="https://www.blackanddecker.com/product-repository/products/2015/02/01/00/15/em100b">Black and Decker EM100B</a> Power Monitor
        attached to the outside of the meter. Every 30 seconds the EM100B transmits a data packet on 433.92 MHz reporting the interval in milliseconds between the last two pulses it received.</p>
        <p>This signal is received by an inexpensive <a href="https://www.amazon.com/EZCAP-EzTV-645-RTL2832U-FC0013-Digital/dp/B00IODM3DC/">EzTV 645 DVT-B SDR receiver</a> with a Fitipower FC0013 chip and decoded by the <a href="https://github.com/merbanan/rtl_433">rtl_433 generic data receiver software</a>.
        The rtl_433 decodes each packet using a <a href="https://github.com/jbrzozoski/rtl_433/commit/e04529c565591a6129098d4e3eb8b815c4feab72">recent patch</a> and immediately passes it to a <a href="https://mosquitto.org/man/mosquitto_pub-1.html">mosquitto_pub client</a> to send to the public <a href="https://mosquitto.org/">MQTT server/broker</a> at <a href="https://test.mosquitto.org/">test.mosquitto.org</a>.</p>
        <p>When a web browser loads this page, it contacts the MQTT server and subscribes to the specific topic using a websocket. This listener stays open as long as the page is open, and any time a new message is received the current power level on the indicator is updated. This is powered by a combination of <a href="https://www.npmjs.com/package/mqtt">mqtt</a> and <a href="https://www.npmjs.com/package/react-d3-speedometer">react-d3-speedometer</a> and designed using <a href="https://reactjs.org/">ReactJS</a> to a static build.</p>
        <p>In this way it is as close to a real time information display as can be done for free.</p>
      </div>
    </div>
  );
}

export default App;
