import './App.css';
import ReactSpeedometer from "react-d3-speedometer";
import NumberEasing from 'react-number-easing';
import React from 'react';
import Moment from 'react-moment';

var mqtt = require('mqtt')

const mqtt_server = 'mqtt://test.mosquitto.org:8081'
const mqtt_topic = 'home/rtl_433'

var options = {
    protocol: 'mqtts',
};
var client  = mqtt.connect(mqtt_server, options);

client.on('connect', function () {
  client.subscribe(mqtt_topic, function (err) {
    if (!err) {
    }
    else {
      alert("Can't connect to data source, please reload page")
    }
  })
})

class WattHistory
{
  constructor(minReasonable)
  {
    this.wattHistory = []
    this.minReasonable = minReasonable
  }

  push(value)
  {
    this.wattHistory.unshift(value)
    this.wattHistory = this.wattHistory.slice(0,10)
  }

  average()
  {
    if (this.wattHistory.length >= 10)
    {
      return (this.wattHistory.reduce((a, b) => a + b, 0))/(this.wattHistory.length)
    } 
    return null
  }

  reasonable()
  {
    console.log(this.wattHistory)
    console.log(this.average(this.initial))
    return Math.max(this.average(this.initial)*3,this.minReasonable)
  }
}
 
class Wattage extends React.Component
{
  render() {
    return (
      <ReactSpeedometer value={this.props.watts} minValue={0} maxValue={6000} 
        startColor="green"
        segments={6}
        endColor="red"
        currentValueText="#{value} watts"
        currentValuePlaceholderStyle={"#{value}"}
        needleTransitionDuration={15000}
        height={300}
      />
    );
  }
}

class WattHours extends React.Component 
{
  render() {
    return (
      <div><NumberEasing value={this.props.totalWattHours} speed={31000} decimals={1} ease="linear" /> Wh consumed</div>
    );
  }
}

class Frequency extends React.Component 
{
  render() {
    var lastHeard = null;
    if (this.props.lastHeard != null)
    {
      lastHeard = new Date(this.props.lastHeard * 1000);
    }
    else 
    {
      return (<div>No signal received</div>);
    }
    return (
      <div>Last heard <Moment date={lastHeard} format="HH:mm:ss" /> on {this.props.frequency.toFixed(3)} MHz</div>
    );
  }
}

class StatusMessage extends React.Component
{
  render() {
    return (
      <div>{this.props.statusMessage}</div>
    );
  }
}

class MeterTemperature extends React.Component 
{
  render() {
    if (this.props.temperature == null)
    {
      return (<div>Waiting on temperature</div>)
    }
    var temp_c = this.props.temperature
    var temp_f = (temp_c*(9/5))+32
    return (
      <div>Latest temperature {temp_f.toFixed(1)}&deg;F</div>
    );
  }
}

class MosquittoListener extends React.Component 
{
  constructor(props) {
    super(props);
    this.state = { watts: 0, totalWattHours: 0, frequency: 433.920, lastHeard: null, statusMessage: "Initializing", temperature: null };
    this.firstReading = null;
    this.revolutions = 0;
    this.lastReading = 0;
    this.last_gap_ts = null;
    this.last_impulse_ts = null;
    this.wattHistory = new WattHistory(3000)
  }

  updateStatus(message) {
    this.setState({statusMessage: message})
    console.log(message)
  }

  componentDidMount() {
    client.on('message', (topic, message) => {
      var packet=JSON.parse(message)
      if ("gap" in packet) {
        // Up to 3 packets are sent at once, ignore anything younger than 5 seconds
        if (packet["time"]>this.last_gap_ts+5) {
          var watts = Math.round(3600000.0/packet["gap"])
          this.wattHistory.push(watts)
          if (watts>this.wattHistory.reasonable()) {
            this.updateStatus("Ignoring unlikely watt value")
            watts = this.state.watts
          }

          var seconds_since_last = 31
          if (this.last_gap_ts != null) {
            seconds_since_last = packet["time"] - this.last_gap_ts
          }
          else {
            this.updateStatus("Got first power record")
          }
          var odoupdate = (watts*seconds_since_last)/3600;
          this.setState({watts: watts, totalWattHours: this.state.totalWattHours+odoupdate})
          console.log(message.toString())
        }
        else { console.log("duplicate gap ignored") }
        this.last_gap_ts=packet["time"]
      }
      if ("impulses" in packet) {
        // Up to 2 packets are sent at once, ignore anything younger than 8 seconds
        if (packet["time"]>this.last_impulse_ts+8) {
          var reading=packet["impulses"]
          if (reading<this.lastReading) { this.revolutions++; }
          if (this.firstReading==null) { 
            this.firstReading = reading-this.state.totalWattHours; 
            this.updateStatus("Got baseline reading of " + reading)
          };
          var totalWattHours = reading+(65536*this.revolutions)-this.firstReading;
          var adjustment = totalWattHours-this.state.totalWattHours
          if (Math.abs(adjustment)>0.1){
            this.updateStatus("Adjusted by " + adjustment.toFixed(1) + " Wh")
          }
          this.lastReading = reading;
          this.setState({totalWattHours: totalWattHours})
          console.log(message.toString())
        }
        else { console.log("duplicate impulse ignored") }
        this.last_impulse_ts=packet["time"]
      }
      if ("temperature_C" in packet) {
        this.setState({temperature: packet["temperature_C"]})
      }
      this.setState({frequency: packet["freq"], lastHeard: packet["time"]})
    })
  }

  render() {
    return (
      <div className="App">
        <div className="meters">
          <Wattage watts={this.state.watts} />
        </div>
        <div className="temperature">
          <MeterTemperature temperature={this.state.temperature} />
        </div>        
        <div className="totals">
          <WattHours totalWattHours={this.state.totalWattHours} />
        </div>
        <div className="frequency">
          <Frequency frequency={this.state.frequency} lastHeard={this.state.lastHeard} />
        </div>
        <div className="statusmessage">
          <StatusMessage statusMessage={this.state.statusMessage} />
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
          <p>Code and setup instructions are available in the <a href="https://github.com/vees/em100b-rtl-meter">vees/em100b-rtl-meter</a> repository on Github.</p>
        </div>
      </div>
    );
  }
}

function App() {
  document.title = "Power meter live display proof of concept"
  return (
    <MosquittoListener />
  );
}

export default App;
