'use strict';
var Service, Characteristic;
let huejay = require('huejay');


module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-huesensors", "HueSensors", HueSensorsAccessory);
}


function HueSensorsAccessory(log, config) {
    this.log = log;


    this.clients = [];
    for (let bridge of config["bridges"]) {

            var newBridge = new huejay.Client({
            host: bridge.IP,
            port: 80,               // Optional
            username: bridge.username, // Optional
            timeout: 15000,            // Optional, timeout in milliseconds (15000 is the default)
        });

        this.clients.push(newBridge);
    }

}

HueSensorsAccessory.prototype = {

    getPowerState: function (callback) {

        var sensorsON = true;

        for (let client of this.clients) {

            client.sensors.getAll()
                .then(sensors => {
                    for (let sensor of sensors) {

                        if (sensor.type == "ZLLPresence") {

                            this.log(`Sensor [${sensor.id}]: ${sensor.name} On: ${sensor.config.on}`);

                            //at least one sensor is off, so return off
                            if (sensor.config.on == false) {
                                sensorsON = false;
                            }

                        }
                    }

                })
                .catch(error => {
                    console.log(error.stack);
                });
        }

        if (sensorsON) {
            callback(null, 1);
        } else {
            callback(null, 0);
        }


    },

    setPowerState: function (powerOn, callback) {
        if (powerOn) {

            for (let client of this.clients) {
                client.sensors.getAll()
                    .then(sensors => {
                        for (let sensor of sensors) {

                            if (sensor.type == "ZLLPresence") {

                                sensor.config.on = true;
                                client.sensors.save(sensor);

                                this.log(`Sensor [${sensor.id}]: ${sensor.name} On: ${sensor.config.on}`);

                            }
                        }

                    })
                    .catch(error => {
                        console.log(error.stack);
                    });
            }

            //done processing all bridges
            callback();

        } else {

            //turn off

            for (let client of this.clients) {

                client.sensors.getAll()
                    .then(sensors => {
                        for (let sensor of sensors) {

                            if (sensor.type == "ZLLPresence") {

                                sensor.config.on = false;
                                client.sensors.save(sensor);

                                this.log(`Sensor [${sensor.id}]: ${sensor.name} On: ${sensor.config.on}`);

                            }
                        }

                    })
                    .catch(error => {
                        console.log(error.stack);
                    });
            }

            //done processing all bridges
            callback();
        }
    },


    identify: function (callback) {
        this.log("Identify requested!");
        callback(); // success
    },

    getServices: function () {
        var informationService = new Service.AccessoryInformation();
        informationService
            .setCharacteristic(Characteristic.Manufacturer, "HueSensors Manufacturer")
            .setCharacteristic(Characteristic.Model, "HueSensors Model")
            .setCharacteristic(Characteristic.SerialNumber, "HueSensors Serial Number");

        var switchService = new Service.Switch(this.name);
        switchService
            .getCharacteristic(Characteristic.On)
            .on('get', this.getPowerState.bind(this))
            .on('set', this.setPowerState.bind(this));

        return [switchService];
    }
};
