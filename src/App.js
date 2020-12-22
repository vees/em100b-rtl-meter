//import logo from './logo.svg';
import './App.css';
import ReactSpeedometer from "react-d3-speedometer";
import React from 'react';

var mqtt = require('mqtt')
var client  = mqtt.connect('mqtt://test.mosquitto.org:1884')
 
client.on('connect', function () {
  client.subscribe('home/rtl_433', function (err) {
    if (!err) {
    }
  })
})
 
client.on('message', function (topic, message) {
  // message is Buffer
  console.log(message.toString())
})

class Wattage extends React.Component
{
  render() {
			return (
				<ReactSpeedometer value={1817.6} minValue={0} maxValue={10000} />
			);
	}
}

function App() {
  return (
    <div className="App">
			<Wattage />
    </div>
  );
}

export default App;
