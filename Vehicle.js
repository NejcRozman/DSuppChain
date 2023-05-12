const express = require('express');
const schedule = require('node-schedule');
const request = require('request');
const winston = require('winston');
const fs = require('fs');

const DemandTransport = require("./DemandTransport");
const Offer = require("./OfferTransport");
const OfferRsp = require("./OfferTransportRsp");
const LogisticSCI = require("./LogisticSCI");
const Bluetooth = require("./Bluetooth");

const logger = winston.createLogger({
    format:
        winston.format.combine(
            winston.format.timestamp(
                {format: 'YYYY-MM-DD hh-mm-ss'}
            ),
            winston.format.colorize(),
            winston.format.simple()
        ),
    transports: [
        new winston.transports.Console({'timestamp': true}),
        new winston.transports.File({filename: 'error.log'}),
    ]
});


class Vehicle {
    constructor(IPS) {
        this.idTransport = 0;
        this.offers = [];
        this.transports = [];
        this.loadingTime = 0;
        this.unloadingTime = 210000;
        this.gasCost = 0.0001;
        this.locations = [];
        this.timeTable = [];
        this.bluetooth = new Bluetooth();
        this.markerTable = [];
        this.currentLocation = 'B';
        this.currentState = 1;
        this.accountBalance = 0;
        this.transportJobs = [];
        this.offersJobs = [];

        this.IPS = IPS;

        this.sci = new LogisticSCI();

        this.app = express();

        this.getID();
        this.changingGasCost();

        this.bt = false;
    }


    setAPI() {
        let that = this;

        this.app.use(express.static(__dirname + '/public'));

        //if the server URL is called without and API endpoint, the warehouse web page is returned
        /**
         *
         */
        this.app.get('/', function (req, res) {
            that.logInfo("API '/' called from: " + req.headers.host);
            res.sendFile('index.html');
        });

        // GUI endpoints
        /**
         * API Endpoint for GUI to get current state of the transport node.
         * @module /init
         * @function
         * @param {Object} req request object - no parameters
         * @param {Object} res response object
         * @param {Object} res.currentState - state of the transport node
         */

        this.app.get('/getStateGui', function (req, res) {
            res.send({currentState: that.currentState});
        });

        /**
         * API Endpoint for GUI to get array of all transports.
         * @module /init
         * @function
         * @param {Object} req request object - no parameters
         * @param {Object} res response object - Array of transports
         */

        this.app.get('/getTransports', function (req, res) {

            let transportsArr = [];
            that.transports.forEach(function (element) {
                transportsArr.push([element.id, element.idPickup, element.idDelivery, element.pickupDate.getTime() - element.pickupDrivingTime, element.deliveryDate.getTime() + that.unloadingTime + element.parkingTime]);
            });
            res.send(transportsArr);
        });

        /**
         * API Endpoint for initializing the transport. Resets all the major transport parameters.
         * @module /init
         * @function
         * @param {Object} req request object - no parameters
         * @param {Object} res response object - no parameters
         */

        this.app.get('/init', function (req, res) {
            that.offers = [];
            that.transports = [];
            that.currentLocation = 'B';
            that.accountBalance = 0;
            that.logInfo('Current location: ' + that.getLocation(that.currentLocation));
            that.transportJobs.forEach(function (element) {
               element.cancel();
            });
            that.offersJobs.forEach(function (element) {
                element.cancel();
            });

            res.send({msg: 'Scenario initiated!'});
        });

        /**
         * API endpoint to check if the transport node is operational.
         * @module /getState
         * @function
         * @param {Object} req request object - no parameters
         * @param {Object} res response object - message
         */

        this.app.get('/getState', function (req, res) {
            res.send('I am here!');
        });

        /**
         * API endpoint for exiting the current transport session.
         * Saves the array of accepted offers, the array of all offers, the array of all transport and transport balance to a file.
         * @module /exit
         * @function
         * @param {Object} req request object - no parameters
         * @param {Object} res response object - all saved data
         */

        this.app.get('/exit', function (req, res) {

            fs.writeFile('results/result' + new Date().toISOString() +'.txt', JSON.stringify(that.transports), (err) => {
                if (err) throw err;
                that.logInfo('The file has been saved!');
                that.logInfo('Scenario is completed');
            });

            that.transportJobs.forEach(function (element) {
                element.cancel();
            });
            that.offersJobs.forEach(function (element) {
                element.cancel();
            });

            res.send({msg: 'Scenario finished!',balance: that.accountBalance, transports: that.transports});
        });

        /**
         * API endpoint to get the balance of transport and all transports.
         * @module /getState
         * @function
         * @param {Object} req request object - no parameters
         * @param {Object} res response object - balance and transports
         */

        this.app.get('/getStat', function (req, res) {
            res.send({balance: that.accountBalance, transports: that.transports});
        });

        /**
         * API endpoint for requesting an offer for transport.
         * @module /demandTransport
         * @function
         * @param {Object} req request object
         * @param {string} req.query.id id of the request (hexadecimal string)
         * @param {Array} req.query.pickupDateFrame a time frame for pickup
         * @param {string} req.query.idPickup id of the pickup place.
         * @param {string} req.query.idDelivery id of the delivery place.
         * @param {Date} req.query.demandEndDate demand end date (Date variable in milliseconds)
         * @param {string} req.query.idPackage id of the package (hexadecimal string)
         * @param {Date} req.query.timestamp request timestamp (Date variable in milliseconds)
         * @param {string} req.query.port port number of the package
         * @param {Object} res response object
         * @param {string} res.idDemand id of the demand (hexadecimal string)
         * @param {string} res.id id of the offer (hexadecimal string)
         * @param {string} res.idTransport id of the transport (hexadecimal string)
         * @param {Date} res.pickupDate time of pickup
         * @param {Date} res.deliveryDate time of delivery
         * @param {Date} res.timestamp timestamp of the offer (Date variable in milliseconds)
         * @param {number} res.cost cost of the offered storage (in EUR) - if an offer is not made cost is set at -1
         * @param {string} res.port port number of the package
         */

        this.app.get('/demandTransport', function (req, res) {
            // that.logInfo('Received demand for transport offer');

            let newDemand = DemandTransport.build(req.query);

            if (new Date() <= newDemand.demandEndDate) {

                that.checkSchedule(newDemand, function (data) {
                    let cost = that.calculateCost(newDemand, data.pickupDrivingTime, data.parkingTime);
                    let offerEndTime = new Date(+new Date() + 10000);

                    if (data.availability) {
                        let newOffer = new Offer(req.query.id, that.idTransport, new Date(data.pickupDate), new Date(data.deliveryDate), req.query.idPickup, req.query.idDelivery, cost, offerEndTime, data.pickupDrivingTime, data.finalLocation, data.parkingTime, req.query.port, null, null);
                        that.checkOfferSchedule(newOffer, function (rsp) {
                           if (rsp) {
                               that.offers.push(newOffer);
                               let job = schedule.scheduleJob(offerEndTime, function () {
                                   that.offers.splice(that.offers.map(function(element) { return element.id; }).indexOf(newOffer.id), 1 );
                                   // console.log('Offer ' + newOffer.id + ' has passed.');
                               });
                               that.offersJobs.push(job);
                               res.send(newOffer.toJSON());
                           }  else {
                               let newOffer = new Offer(req.query.id, that.idTransport, new Date(data.pickupDate), new Date(data.deliveryDate), req.query.idPickup, req.query.idDelivery, -1, offerEndTime, data.pickupDrivingTime, data.finalLocation, data.parkingTime, req.query.port, null, null);
                               res.send(newOffer.toJSON());
                           }
                        });


                    } else {
                        let newOffer = new Offer(req.query.id, that.idTransport, new Date(data.pickupDate), new Date(data.deliveryDate), req.query.idPickup, req.query.idDelivery, -1, offerEndTime, data.pickupDrivingTime, data.finalLocation, data.parkingTime, req.query.port, null, null);
                        res.send(newOffer.toJSON());
                    }
                });

            }
        });

        /**
         * API endpoint for sending a response to a transport offer.
         * @module /demandTransportRsp
         * @function
         * @param {Object} req request object
         * @param {string} req.query.idOffer id of the offer (hexadecimal string)
         * @param {number} req.query.acceptance acceptance status of the offer - 0 if offer was rejected, 1 if offer was accepted
         * @param {Object} res response object
         * @param {string} res.idOffer id of the offer
         * @param {number} res.aceptance aceptance status
         */
        this.app.get('/demandTransportRsp', function (req, res) {
            // console.log('Received response on our offer');
            let offerRsp = OfferRsp.build(req.query);

            if (that.checkOfferEndTime(offerRsp)) {
                if (that.toTransportList(offerRsp) === 1) {
                    that.logInfo('Offer ' + offerRsp.idOffer + ' has been accepted');
                    that.changePickupDrivingTime(offerRsp);
                    res.send(offerRsp.toJSON());
                    that.offers.splice(that.offers.map(function(element) { return element.id; }).indexOf(offerRsp.idOffer), 1 );
                } else {
                    res.send(offerRsp.toJSON());
                    that.offers.splice(that.offers.map(function(element) { return element.id; }).indexOf(offerRsp.idOffer), 1 );
                }
            } else {
                res.send({idOffer: offerRsp.idOffer, acceptance: '0'});
                that.offers.splice(that.offers.map(function(element) { return element.id; }).indexOf(offerRsp.idOffer), 1 );
            }
        });

        /**
         * API endpoint to inform transport that package is loaded on the vehicle.
         * @module /loaded
         * @function
         * @param {Object} req request object
         * @param {string} req.idOffer id of the offer
         * @param {Object} res response object returning number 1 if transport arrived at the destination or 0 if not.
         */
        this.app.get('/loaded', function (req, res) {

            that.logInfo('Transport ' + req.query.idOffer + ' - Vehicle is loaded');
            let transport = that.transports.filter(function (element) {
                return element.id === req.query.idOffer;
            });

            that.currentState = 4;

            that.transporting(transport[0].idDelivery, function (rsp) {
                if (rsp) {
                    that.logInfo('Transport ' + req.query.idOffer + ' - Arrived to unload');
                    that.logInfo('Current location: ' + that.getLocation(that.currentLocation));
                    transport[0].deliveryTimestamp = new Date();
                    that.transportArrivedToUnload(transport[0].id, transport[0].port);
                    that.currentState = 5;
                }
            });
            if (transport) {
                res.send({msg: '1'});
            } else {
                res.send({msg: '0'});
            }
        });

        /**
         * API endpoint to inform transport that package is unloaded from the vehicle.
         * @module /unloaded
         * @function
         * @param {Object} req request object
         * @param {string} req.idOffer id of the offer
         * @param {Object} res response object returning number 1 if transport arrived at the destination or 0 if not.
         */
        this.app.get('/unloaded', function (req, res) {

            that.logInfo('Transport ' + req.query.idOffer + ' - Vehicle is unloaded');
            let transport = that.transports.filter(function (element) {
                return element.id === req.query.idOffer;
            });

            that.currentState = 6;
            that.transporting(transport[0].finalLocation, function (rsp) {
                if (rsp) {
                    that.currentState = 1;
                    that.logInfo('Transport ' + req.query.idOffer + ' - Vehicle has parked!');
                    that.logInfo('Current location: ' + that.getLocation(that.currentLocation));

                    // that.transports.splice(that.transports.map(function(element) { return element.id; }).indexOf(req.query.idOffer), 1 );
                }
            });

            if (transport) {
                res.send({msg: '1'});
            } else {
                res.send({msg: '0'});
            }

        });

    }

    init (cb) {
        let that = this;
        this.app.listen(8000, function (req, res) {
            that.logWarning("Listening on port 8000");
            cb(true);
        });

    }

    setBluetooth() {
        let that = this;
        this.bluetooth.connect(function (data) {
            that.logWarning(data);
        });
    }

    getWarehouses(cb) {
        let that = this;
        that.logWarning('Getting the list of warehouses from smart contract');
        this.sci.getWarehousesList(function (warehouses) {
            that.logWarning('Received list');
            //Remove last warehouse as it is not functioning
            cb(warehouses.splice(0, 2));

        });
    }

    createTimetable (warehouses) {
        let that = this;
        for (let i = 0; i < warehouses.length; i++) {
            this.locations.push(warehouses[i].id);

            this.timeTable = {
                [that.locations[0] + that.locations[0]]: 0, //AA
                [that.locations[0] + 'B']: 6500, //AB
                [that.locations[0] + that.locations[1]]: 13000, //AC
                [that.locations[0] + 'D']: 19500, //AD
                'BB': 0,
                ['B' + that.locations[1]]: 6500, //BC
                'BD': 13000,
                ['B' + that.locations[0]]: 19500, //BA
                [that.locations[1] + that.locations[1]]: 0, //CC
                [that.locations[1] + 'D']: 6500, //CD
                [that.locations[1] + that.locations[0]]: 13000, //CA
                [that.locations[1] + 'B']: 19500, //CB
                'DD': 0,
                ['D' + that.locations[0]]: 6500, //DA
                'DB': 13000,
                ['D' + that.locations[1]]: 19500 //DC
            };

            this.markerTable = {
                [that.locations[0] + that.locations[0]]: 0, //AA
                [that.locations[0] + 'B']: 1, //AB
                [that.locations[0] + that.locations[1]]: 2, //AC
                [that.locations[0] + 'D']: 3, //AD
                'BB': 0,
                ['B' + that.locations[1]]: 1, //BC
                'BD': 2,
                ['B' + that.locations[0]]: 3, //BA
                [that.locations[1] + that.locations[1]]: 0, //CC
                [that.locations[1] + 'D']: 1, //CD
                [that.locations[1] + that.locations[0]]: 2, //CA
                [that.locations[1] + 'B']: 3, //CB
                'DD': 0,
                ['D' + that.locations[0]]: 1, //DA
                'DB': 2,
                ['D' + that.locations[1]]: 3 //DC
            };
        }
    }

    checkSchedule(demand, cb) {

        let distance = demand.idPickup + demand.idDelivery;
        let transportTime = this.timeTable[distance];

        let availability;
        let time1;
        let time2;

        let finalLocation;

        let pickupDate;
        let deliveryDate;
        let pickupDrivingTime;
        let index;

        let deliveryDateFrame = [];

        let that = this;

        let locations = [];

        let pickupDrivingTime2;
        let wholeTime;

        let sci = new LogisticSCI();
        sci.getWarehousesList(function (warehouses) {

            for (let i = 0; i < warehouses.length; i++) {
                locations.push(warehouses[i].id);
            }

            if (demand.idDelivery === locations[0]) {
                finalLocation = 'B';
            } else {
                finalLocation = 'D';
            }

            let parkingDistance = demand.idDelivery + finalLocation;
            let parkingTime = that.timeTable[parkingDistance];

            if (that.transports.length === 0) {
                availability = true;

                let pickupDrivingDistance2 = that.currentLocation + demand.idPickup;
                pickupDrivingTime2 = that.timeTable[pickupDrivingDistance2];
                pickupDrivingTime = pickupDrivingTime2;
                wholeTime = pickupDrivingTime + that.loadingTime + transportTime + that.unloadingTime + parkingTime;
                deliveryDateFrame[0] = demand.pickupDateFrame[0].getTime() + wholeTime;
                deliveryDateFrame[1] = demand.pickupDateFrame[1].getTime() + wholeTime;
            } else {
                for (let i = 0; i < that.transports.length; i++) {
                    if (that.transports[i].pickupDate > demand.pickupDateFrame[0]) {
                        index = i;
                        break;
                    } else if ((i === that.transports.length - 1) && (that.transports[i].pickupDate < demand.pickupDateFrame[0])) {
                        index = that.transports.length;
                    }
                }

                let pickupDrivingTime1;

                if (index < that.transports.length) {
                    let pickupDrivingDistance1 = finalLocation + that.transports[index].idPickup;
                    pickupDrivingTime1 = that.timeTable[pickupDrivingDistance1];
                }

                // Calculating pickup time for this order
                if (index === 0) {
                    let pickupDrivingDistance2 = that.currentLocation + demand.idPickup;
                    pickupDrivingTime2 = that.timeTable[pickupDrivingDistance2];
                } else {
                    let pickupDrivingDistance2 = that.transports[index - 1].finalLocation + demand.idPickup;
                    pickupDrivingTime2 = that.timeTable[pickupDrivingDistance2];
                }

                pickupDrivingTime = pickupDrivingTime2;
                wholeTime = pickupDrivingTime + that.loadingTime + transportTime + that.unloadingTime + parkingTime;
                deliveryDateFrame[0] = demand.pickupDateFrame[0].getTime() + wholeTime;
                deliveryDateFrame[1] = demand.pickupDateFrame[1].getTime() + wholeTime;

                if (index === 0) {
                    if ((that.transports[index].pickupDate.getTime() - pickupDrivingTime1) < deliveryDateFrame[0] + that.unloadingTime + parkingTime) {
                        availability = false;
                    } else {
                        availability = true;
                        if (((that.transports[index].pickupDate.getTime() - pickupDrivingTime1) >= (deliveryDateFrame[0] + that.unloadingTime + parkingTime)) && ((that.transports[index].pickupDate.getTime() - pickupDrivingTime1) <= (deliveryDateFrame[1] + that.unloadingTime + parkingTime))) {
                            time2 = that.transports[index].pickupDate.getTime() - pickupDrivingTime1;
                        }
                    }

                } else if (index === that.transports.length) {
                    if ((that.transports[index - 1].deliveryDate.getTime() + that.unloadingTime + that.transports[index - 1].parkingTime) > demand.pickupDateFrame[1].getTime() - pickupDrivingTime2) {
                    availability = false;
                    } else {
                        availability = true;
                        if ((((that.transports[index - 1].deliveryDate.getTime() + that.unloadingTime + that.transports[index - 1].parkingTime) >= (demand.pickupDateFrame[0].getTime() - pickupDrivingTime2)) && ((that.transports[index - 1].deliveryDate.getTime() + that.unloadingTime + that.transports[index - 1].parkingTime) <= (demand.pickupDateFrame[1].getTime() - pickupDrivingTime2)))) {
                            time1 = that.transports[index - 1].deliveryDate.getTime() + that.unloadingTime + that.transports[index - 1].parkingTime;
                        }
                    }

                } else {
                    if ((that.transports[index - 1].deliveryDate.getTime() + that.unloadingTime + that.transports[index - 1].parkingTime) > demand.pickupDateFrame[1].getTime() - pickupDrivingTime2) {
                        availability = false;
                    } else if ((that.transports[index].pickupDate.getTime() - pickupDrivingTime1) < deliveryDateFrame[0] + that.unloadingTime + parkingTime) {
                        availability = false;
                    } else {
                        availability = true;
                        if ((((that.transports[index - 1].deliveryDate.getTime() + that.unloadingTime + that.transports[index - 1].parkingTime) >= (demand.pickupDateFrame[0].getTime() - pickupDrivingTime2)) && ((that.transports[index - 1].deliveryDate.getTime() + that.unloadingTime + that.transports[index - 1].parkingTime) <= (demand.pickupDateFrame[1].getTime() - pickupDrivingTime2)))) {
                            time1 = that.transports[index - 1].deliveryDate.getTime() + that.unloadingTime + that.transports[index - 1].parkingTime;
                        } else if (((that.transports[index].pickupDate.getTime() - pickupDrivingTime1) >= (deliveryDateFrame[0] + that.unloadingTime + parkingTime)) && ((that.transports[index].pickupDate.getTime() - pickupDrivingTime1) <= (deliveryDateFrame[1] + that.unloadingTime + parkingTime))) {
                            time2 = that.transports[index].pickupDate.getTime() - pickupDrivingTime1;
                        }
                    }
                }
            }

            if (availability === true) {

                //console.log('Time1: ' + time1 + ' Time2: ' + time2);

                //Checking if time1 or time2 is undefined
                if (time1 === undefined && time2 === undefined) {
                    time1 = demand.pickupDateFrame[0].getTime();
                    pickupDate = time1;
                    deliveryDate = time1 + transportTime;
                    let obj = {
                        availability: availability,
                        pickupDate: pickupDate,
                        deliveryDate: deliveryDate,
                        pickupDrivingTime: pickupDrivingTime,
                        finalLocation: finalLocation,
                        parkingTime: parkingTime
                    };
                    cb(obj);

                } else if (time1 === undefined) {

                    time1 = demand.pickupDateFrame[0].getTime;
                    time2 = time1 + transportTime;
                    pickupDate = time1;
                    deliveryDate = time2;
                    let obj = {
                        availability: availability,
                        pickupDate: pickupDate,
                        deliveryDate: deliveryDate,
                        pickupDrivingTime: pickupDrivingTime,
                        finalLocation: finalLocation,
                        parkingTime: parkingTime
                    };
                    cb(obj);

                } else if (time2 === undefined) {
                    time2 = time1 + wholeTime;
                    pickupDate = time1 + pickupDrivingTime2;
                    deliveryDate = time2 - that.unloadingTime - parkingTime;
                    let obj = {
                        availability: availability,
                        pickupDate: pickupDate,
                        deliveryDate: deliveryDate,
                        pickupDrivingTime: pickupDrivingTime,
                        finalLocation: finalLocation,
                        parkingTime: parkingTime
                    };
                    cb(obj);

                } else {
                    if ((time2 - time1) < wholeTime) {
                        availability = false;
                        let obj = {
                            availability: availability,
                            pickupDate: undefined,
                            deliveryDate: undefined,
                            pickupDrivingTime: undefined,
                            finalLocation: undefined,
                            parkingTime: undefined
                        };
                        cb(obj);
                    } else {
                        time2 = time1 + transportTime;
                        pickupDate = time1 + pickupDrivingTime2;
                        deliveryDate = time2;
                        let obj = {
                            availability: availability,
                            pickupDate: pickupDate,
                            deliveryDate: deliveryDate,
                            pickupDrivingTime: pickupDrivingTime,
                            finalLocation: finalLocation,
                            parkingTime: parkingTime
                        };
                        cb(obj);
                    }
                }
            } else {
                let obj = {
                    availability: availability,
                    pickupDate: undefined,
                    deliveryDate: undefined,
                    pickupDrivingTime: undefined,
                    finalLocation: undefined,
                    parkingTime: undefined
                };
                cb(obj);
            }
        });

    }

    checkOfferSchedule (offer, cb) {

        try {let availability;

            let index;

            let that = this;


            if (that.offers.length === 0) {
                availability = true;
                cb(availability);

            } else {
                for (let i = 0; i < that.offers.length; i++) {
                    if (that.offers[i].pickupDate > offer.pickupDate) {
                        index = i;
                        break;
                    } else if ((i === that.offers.length - 1) && (that.offers[i].pickupDate <= offer.pickupDate)) {
                        index = that.offers.length;
                    } 
                }

                let pickupDrivingDistance1;
                let pickupDrivingTime1;

                if (index < that.offers.length) {
                    pickupDrivingDistance1 = offer.finalLocation + that.offers[index].idPickup;
                    pickupDrivingTime1 = that.timeTable[pickupDrivingDistance1];
                }


                if (index === 0) {
                    if ((offer.deliveryDate.getTime() + offer.parkingTime) <= (that.offers[index].pickupDate.getTime() - pickupDrivingTime1)) {
                        availability = true;
                        cb(availability);
                    } else {
                        availability = false;
                        cb(availability);
                    }

                } else if (index === that.offers.length) {
                    if ((that.offers[index-1].deliveryDate.getTime() + that.offers[index-1].parkingTime) <= (offer.pickupDate.getTime() - offer.pickupDrivingTime)) {
                        availability = true;
                        cb(availability);
                    } else {
                        availability = false;
                        cb(availability);
                    }

                } else {
                    if (((that.offers[index-1].deliveryDate.getTime() + that.offers[index-1].parkingTime) <= (offer.pickupDate.getTime() - offer.pickupDrivingTime)) && ((offer.deliveryDate.getTime() + offer.parkingTime) <= (that.offers[index].pickupDate.getTime() - pickupDrivingTime1))) {
                        availability = true;
                        cb(availability);
                    } else {
                        availability = false;
                        cb(availability);
                    }
                }


            }
        }

        catch (e) {
            console.log(e);
	    console.error(e);
	    console.log('Index: ' + index);
	    console.log('Offers length: ' + that.offers.length);
            console.log('Offers: ' + JSON.stringify(this.offers));
            console.log('Current offer: ' + JSON.stringify(offer));
        }


    }

    calculateCost(demand, pickupDrivingTime, parkingTime) {

        let transportTime = this.timeTable[demand.calculateDistance()];
        let drivingTime = pickupDrivingTime + transportTime + parkingTime;
        return this.gasCost * drivingTime;
    }

    toTransportList(response) {

        let that = this;

        if (response.acceptance) {
            let offer = that.offers.filter(function (element) {
                return element.id === response.idOffer;
            });

            this.transports.push(offer[0]);
            this.accountBalance += offer[0].cost;

            // console.log('Pickup date: ' + this.offers[i].pickupDate);

            let t = offer[0].pickupDate.getTime(); // - offer[0].pickupDrivingTime;

            // console.log('Start time: ' + new Date(t));
            let job = schedule.scheduleJob(t, function () {

                that.currentState = 2;
                let transport = that.transports.filter(function (element) {
                    return element.id === response.idOffer;
                });
                that.transporting(transport[0].idPickup, function (rsp) {
                    if (rsp) {
                        that.logInfo('Transport ' + transport[0].id + 'Arrived to load');
                        that.logInfo('Current location: ' + that.getLocation(that.currentLocation));
                        that.currentState = 3;
                        transport[0].pickupTimestamp = new Date();
                        that.transportArrivedToLoad(transport[0].id, transport[0].port);
                    }
                });

            });

            this.transportJobs.push(job);

            this.transports.sort(function (a, b) {
                return a.pickupDate.getTime() - b.pickupDate.getTime();
            });

            return 1;
        } else {
            return 0;
        }
    }

    changePickupDrivingTime(response) {

        for (let i = 0; i < this.transports.length; i++) {
            if (response.idOffer === this.transports[i].id) {
                if (i < this.transports.length - 1) {
                    let pickupDrivingDistance = this.transports[i].idDelivery + this.transports[i + 1].idPickup;
                    this.transports[i + 1].pickupDrivingTime = this.timeTable[pickupDrivingDistance];
                }
            }
        }
    }

    checkOfferEndTime(response) {

        let offer = this.offers.filter(function (element) {
            return element.id === response.idOffer;
        });
        return (offer[0].offerEndDate >= new Date());
    }

    transporting(endTransportLocation, cb) {

        this.logInfo('Transporting');

        let that = this;

        let distance;
        distance = this.markerTable[this.currentLocation + endTransportLocation];
        // console.log('Current location: ' + this.currentLocation);

        this.bluetooth.command(distance, function (rsp) {
            // console.log('Response: ' + rsp);
            if (rsp) {
                // console.log('Vehicle has arrived at the destination!');
                // console.log('End location: ' + endTransportLocation);
                that.currentLocation = endTransportLocation;
                cb(true);
            } else {
                cb(false);
            }
        });


    }

    transportArrivedToLoad(idOffer, port) {
        let that = this;

        let uri = this.IPS['PACKAGE'] + port + '/transportArrivedToLoad?idOffer=' + idOffer;
        request({url: uri, timeout: 5000}, function (err, response, body) {
            // console.log('Request arrivedToLoad');
            if (err) {
                that.logError(err);
            }
            else {
                that.logInfo('Transport ' + idOffer +' - Load me!');
            }

        });

    }

    transportArrivedToUnload(idOffer, port) {
        let that = this;

        let uri = this.IPS['PACKAGE'] + port + '/transportArrivedToUnload?idOffer=' + idOffer;
        // console.log(uri);
        request({url: uri, timeout: 5000}, function (err, response, body) {
            if (err) {
                that.logError(err);
            }
            else {
                that.logInfo('Transport ' + idOffer +' - Unload me!');
            }

        });
    }

    getID() {
        let that = this;
        this.logWarning('Getting ID from smart contract');
        this.sci.getTransportsList(function (transports) {
            that.idTransport = transports[0].id;
            that.logWarning('ID: ' + that.idTransport);
        });
    }

    changingGasCost() {
        let that = this;
        setInterval(function () {
            //changing cost of gas

            // that.gasCost = ((Math.random()/10) + 1)/10000;

        }, 60000);
    }

    getLocation (loc) {
        this.locationTable = {
            '0x596f42720f07e7fbf7fb23cd2666ca01a8189a54' : 'A',
            'B' : 'B',
            '0xcb22ebed5a5422ee304fc9bc17a042c2204db57e' : 'C',
            'D' : 'D'
        };

        return this.locationTable[loc];
    }

    logInfo(msg) {
        logger.info(msg);
    }

    logError(msg) {
        logger.error(msg);
    }

    logWarning(msg) {
        logger.warn(msg);
    }


}

module.exports = Vehicle;