let resultsFileName = "./scenario_p10_d3h_2018_11_12_1.json";
let data = require("./" + resultsFileName);

const fs = require('fs');

console.log('');
console.log("*******************************Storage global error****************************************************************************************************************************************************************************************");
console.log('');

let storageGlobalStartToEarlyArr = [];
let storageGlobalStartToLateArr = [];
let storageGlobalEndToEarlyArr = [];
let storageGlobalEndToLateArr = [];

let storageStartToEarlyAvg = 0;
let storageStartToLateAvg = 0;
let storageEndToEarlyAvg = 0;
let storageEndToLateAvg = 0;

let storageCostArr = [];

let start;

for (let id in data.warehouses) {

    data.warehouses[id].acceptedOffers.forEach(function (offer) {
        checkStorageStartEndDate(offer);
        getStorageCost(offer);
    });

    storageCostArr.sort(function (a,b) {
        return a.date - b.date
    });

    let x = [];
    for (let i in storageCostArr) {
        if (x.length) {
            x.push(storageCostArr[i].cost + x[i - 1]);
        } else {
            x.push(storageCostArr[i].cost);
        }
    }

    let y = [];
    for (let i in storageCostArr) {
        if (y.length) {
            y.push((storageCostArr[i].date - storageCostArr[0].date)/1000);
        } else {
            y.push(0);
        }
    }

    start = storageCostArr[0].date;

    console.log('Storage ' + id + ' cost array: ' + JSON.stringify(storageCostArr));
    storageCostArr = [];
    console.log('Cost: ' + x);
    x = [];
    console.log('Time: ' + y);
    y = [];
    console.log('');

}

calculateStorageAverage();

console.log("Storage global errors --> " +
    "startToEarly: " + storageStartToEarlyAvg/10 +
    " startToLate: " + storageStartToLateAvg/10 +
    " endToEarly: " + storageEndToEarlyAvg/10 +
    " endToLate: " + storageEndToLateAvg/10
);

console.log('');
console.log("*******************************Transport global error****************************************************************************************************************************************************************************************");
console.log('');

let transportGlobalStartToEarlyArr = [];
let transportGlobalStartToLateArr = [];
let transportGlobalEndToEarlyArr = [];
let transportGlobalEndToLateArr = [];

let transportStartToEarlyAvg = 0;
let transportStartToLateAvg = 0;
let transportEndToEarlyAvg = 0;
let transportEndToLateAvg = 0;

let counter1 = 2;
let counter2 = 8;

let warehouse1Arr = [];
let warehouse2Arr = [];

let timestampArr = [];

let transportCostArr = [];

warehouse1Arr.push(counter1);
warehouse2Arr.push(counter2);

for (let id in data.transports) {
    data.transports[id].transports.forEach(function (offer) {
        checkTransportStartEndDate(offer);
        calculatePackageDistribution(offer);
        getTransportCost(offer);
    });
}

storageCostArr.sort(function (a,b) {
    return a.date - b.date
});

let x = [];
for (let i in transportCostArr) {
    if (x.length) {
        x.push(transportCostArr[i].cost + x[i - 1]);
    } else {
        x.push(transportCostArr[i].cost);
    }
}

let y = [];
for (let i in transportCostArr) {
        y.push((transportCostArr[i].date - start)/1000);
}




console.log('Transport cost array: ' + JSON.stringify(transportCostArr));
console.log('Cost: ' + x);
x = [];
console.log('Time: ' + y);
y = [];
console.log('');
transportCostArr = [];

console.log('Package distribution in warehouse1: ' + warehouse1Arr);
console.log('Package distribution in warehouse2: ' + warehouse2Arr);
console.log('');

console.log('Timestamp array: ' + timestampArr);
console.log('');



calculateTransportAverage();

console.log("Transport global errors --> " +
    "startToEarly: " + transportStartToEarlyAvg/10 +
    " startToLate: " + transportStartToLateAvg/10 +
    " endToEarly: " + transportEndToEarlyAvg/10 +
    " endToLate: " + transportEndToLateAvg/10
);

console.log('');
console.log("*******************************Local errors****************************************************************************************************************************************************************************************");
console.log('');

let storageLocalStartToEarlyArr = [];
let storageLocalStartToLateArr = [];
let storageLocalEndToEarlyArr = [];
let storageLocalEndToLateArr = [];

let transportLocalStartToEarlyArr = [];
let transportLocalStartToLateArr = [];
let transportLocalEndToEarlyArr = [];
let transportLocalEndToLateArr = [];

let storageLocalStartToEarlyAvg = 0;
let storageLocalStartToLateAvg = 0;
let storageLocalEndToEarlyAvg = 0;
let storageLocalEndToLateAvg = 0;

let transportLocalStartToEarlyAvg = 0;
let transportLocalStartToLateAvg = 0;
let transportLocalEndToEarlyAvg = 0;
let transportLocalEndToLateAvg = 0;

let packageCostArr = [];


for (let id in data.packages) {

    let p = data.packages[id];

    //Find first service
    let t = new Date();
    let id1 = "";
    for (let ids in p.services) {
        if (p.services[ids].startTimestamp !== null) {
            if (new Date(p.services[ids].startTimestamp) < t) {
                t = new Date(p.services[ids].startTimestamp);
                id1 = ids;
            }
        }
    }
    //console.log("Package: " + id + " service: " + id1);

    //loop through services and calculate errors
    let service1 = p.services[id1];
    while (service1.nextServiceId !== null) {

        let service2 = p.services[service1.nextServiceId];
        if (service1.type === "Storage") {
            packageCostArr.push({cost: service1.offer.cost, date: service1.demand.startDate});
            if (service2.type === "Storage") {
                //Storage -> Storage

            } else {
                //Storage -> Transport
                let warehouse = findWarehouseRecord(service1.id);
                let transport = findTransportRecord(service2.id);

                if (warehouse.realStorageEndDate !== undefined && transport.deliveryTimestamp !== null && transport.pickupTimestamp !== null) {
                    let d2 = transport.pickupTimestamp - warehouse.realStorageEndDate;

                    if (Math.abs(d2) > 100) {
                        if (d2 > 0) {
                            storageLocalEndToEarlyArr.push(Math.floor(d2 / 100));
                        } else {
                            storageLocalEndToLateArr.push(Math.floor(-d2 / 100));
                        }
                    }

                    let d3 = transport.pickupDate - transport.pickupTimestamp;

                    if (Math.abs(d3) > 100) {
                        if (d3 > 0) {
                            transportLocalStartToEarlyArr.push(Math.floor(d3 / 100));
                        } else {
                            transportLocalStartToLateArr.push(Math.floor(-d3 / 100));
                        }
                    }

                    let d4 = (transport.deliveryDate + (warehouse.realStorageEndDate - transport.pickupDate)) - transport.deliveryTimestamp;

                    if (Math.abs(d4) > 100) {
                        if (d4 > 0) {
                            transportLocalEndToEarlyArr.push(Math.floor(d4 / 100));
                        } else {
                            transportLocalEndToLateArr.push(Math.floor(-d4 / 100));
                        }
                    }
                }
            }

        } else {
            packageCostArr.push({cost: service1.offer.cost, date: service1.offer.pickupDate});
            if (service2.type==="Storage"){
                //Transport -> Storage

                let warehouse = findWarehouseRecord(service2.id);
                let transport = findTransportRecord(service1.id);

                if (warehouse.realStorageStartDate !== undefined) {
                    let d1 = transport.deliveryTimestamp - warehouse.realStorageStartDate;

                    if (Math.abs(d1) > 100) {
                        if (d1 > 0) {
                            storageLocalStartToEarlyArr.push(Math.floor(d1 / 100));
                        } else {
                            storageLocalStartToLateArr.push(Math.floor(-d1 / 100));
                        }
                    }
                }

            } else{
                //Transport -> Transport
            }
        }


        //go to next service
        service1 = service2;
    }
    let x = [];
    for (let i in packageCostArr) {
        if (x.length) {
            x.push(packageCostArr[i].cost + x[i - 1]);
        } else {
            x.push(packageCostArr[i].cost);
        }
    }

    let y = [];
    for (let i in packageCostArr) {
        y.push((packageCostArr[i].date - start)/1000);
    }

    console.log('Package ' + id + ' cost array: ' + JSON.stringify(packageCostArr));
    console.log('Cost: ' + x);
    x = [];
    console.log('Time: ' + y);
    y = [];
    console.log('');
    packageCostArr = [];

}
calculateLocalStorageAverage();
calculateLocalTransportAverage();

console.log("Warehouses: " +
    " startToEarlAvg: " + storageLocalStartToEarlyAvg/10 +
    "; startToLateAvg: " + storageLocalStartToLateAvg/10 +
    "; endToEarlAvg: " + storageLocalEndToEarlyAvg/10 +
    "; endToLateAvg: " + storageLocalEndToLateAvg/10);

console.log('');

console.log('Storage local error array StartToEarly: ' + storageLocalStartToEarlyArr);
console.log('Storage local error array StartToLate: ' + storageLocalStartToLateArr);
console.log('Storage local error array EndToEarly: ' + storageLocalEndToEarlyArr);
console.log('Storage local error array EndToLate: ' + storageLocalEndToLateArr);
console.log('');

console.log("Transport: " +
    " startToEarlAvg: " + transportLocalStartToEarlyAvg/10 +
    "; startToLateAvg: " + transportLocalStartToLateAvg/10 +
    "; endToEarlAvg: " + transportLocalEndToEarlyAvg/10 +
    "; endToLateAvg: " + transportLocalEndToLateAvg/10);

console.log('');

console.log('Transport local error array StartToEarly: ' + transportLocalStartToEarlyArr);
console.log('Transport local error array StartToLate: ' + transportLocalStartToLateArr);
console.log('Transport local error array EndToEarly: ' + transportLocalEndToEarlyArr);
console.log('Transport local error array EndToLate: ' + transportLocalEndToLateArr);
console.log('');



/*fs.writeFile("report_" + resultsFileName.split(".")[0] + ".json", JSON.stringify({
    storage:
        {
            startDateErrorAvg: startDateErrorAvg,
            endDateErrorAvg: endDateErrorAvg,
            warehouses: warehouses
        },
    transport: {
        pickupDateErrorAvg: pickupDateErrorAvg,
        deliveryDateErrorAvg: deliveryDateErrorAvg,
        transports: transports
    }
}), 'utf8', function () {
    console.log("Final report saved to: " + "report_" + resultsFileName.split(".")[0] + ".json");
    // logger.info("Scenario ended");
    // res.send("Scenario ended. Results saved to: " + config.reportFileName);
});*/

function checkStorageStartEndDate(offer) {
    if (offer.realStorageStartDate && offer.storageStartDate && offer.realStorageEndDate && offer.storageEndDate) {

        let d1 = offer.storageStartDate - offer.realStorageStartDate;

        if (Math.abs(d1) > 100) {
            if (d1 > 0) {
                storageGlobalStartToEarlyArr.push(Math.floor(d1 / 100));
            } else {
                storageGlobalStartToLateArr.push(Math.floor(-d1 / 100));
            }
        }

        let d2 = offer.storageEndDate - offer.realStorageEndDate;

        if (Math.abs(d2) > 100) {
            if (d2 > 0) {
                storageGlobalEndToEarlyArr.push(Math.floor(d2 / 100));
            } else {
                storageGlobalEndToLateArr.push(Math.floor(-d2 / 100));
            }
        }
    }
}

function calculateStorageAverage() {
    if (storageGlobalStartToEarlyArr.length) {
        let sum = 0;
        storageGlobalStartToEarlyArr.forEach(function (element) {
            sum += element;
        });
        storageStartToEarlyAvg = sum / storageGlobalStartToEarlyArr.length;
    }
    if (storageGlobalStartToLateArr.length) {
        let sum = 0;
        storageGlobalStartToLateArr.forEach(function (element) {
            sum += element;
        });
        storageStartToLateAvg = sum / storageGlobalStartToLateArr.length;
    }
    if (storageGlobalEndToEarlyArr.length) {
        let sum = 0;
        storageGlobalEndToEarlyArr.forEach(function (element) {
            sum += element;
        });
        storageEndToEarlyAvg = sum / storageGlobalStartToEarlyArr.length;
    }
    if (storageGlobalEndToLateArr.length) {
        let sum = 0;
        storageGlobalEndToLateArr.forEach(function (element) {
            sum += element;
        });
        storageEndToLateAvg = sum / storageGlobalEndToLateArr.length;
    }
}

function getStorageCost(offer) {
    storageCostArr.push({cost: offer.cost, date: offer.realStorageStartDate});
}

function checkTransportStartEndDate(offer) {

    if (offer.pickupDate && offer.pickupTimestamp && offer.deliveryDate && offer.deliveryTimestamp) {
        let d1 = offer.pickupDate - offer.pickupTimestamp;

        if (Math.abs(d1) > 100) {
            if (d1 > 0) {
                transportGlobalStartToEarlyArr.push(Math.floor(d1 / 100));
            } else {
                transportGlobalStartToLateArr.push(Math.floor(-d1 / 100));
            }
        }
        let d2 = offer.deliveryDate - offer.deliveryTimestamp;

        if (Math.abs(d2) > 100) {
            if (d2 > 0) {
                transportGlobalEndToEarlyArr.push(Math.floor(d2 / 100));
            } else {
                transportGlobalEndToLateArr.push(Math.floor(-d2 / 100));
            }
        }
    }

}

function calculateTransportAverage() {
    if (transportGlobalStartToEarlyArr.length) {
        let sum = 0;
        transportGlobalStartToEarlyArr.forEach(function (element) {
            sum += element;
        });
        transportStartToEarlyAvg = sum / transportGlobalStartToEarlyArr.length;
    }
    if (transportGlobalStartToLateArr.length) {
        let sum = 0;
        transportGlobalStartToLateArr.forEach(function (element) {
            sum += element;
        });
        transportStartToLateAvg = sum / transportGlobalStartToLateArr.length;
    }
    if (transportGlobalEndToEarlyArr.length) {
        let sum = 0;
        transportGlobalEndToEarlyArr.forEach(function (element) {
            sum += element;
        });
        transportEndToEarlyAvg = sum / transportGlobalStartToEarlyArr.length;
    }
    if (transportGlobalEndToLateArr.length) {
        let sum = 0;
        transportGlobalEndToLateArr.forEach(function (element) {
            sum += element;
        });
        transportEndToLateAvg = sum / transportGlobalEndToLateArr.length;
    }
}

function calculatePackageDistribution(data) {
    if (data.deliveryTimestamp !== null && data.pickupTimestamp !== null) {
        if (data.idDelivery === "0x596f42720f07e7fbf7fb23cd2666ca01a8189a54") {
            counter1++;
            counter2--;
            warehouse1Arr.push(counter1);
            warehouse2Arr.push(counter2);
            timestampArr.push(data.pickupTimestamp);
        } else {
            counter1--;
            counter2++;
            warehouse1Arr.push(counter1);
            warehouse2Arr.push(counter2);
            timestampArr.push(data.pickupTimestamp);
        }
    }
}

function getTransportCost(offer) {
    transportCostArr.push({cost: offer.cost, date: offer.pickupTimestamp});
}

function findWarehouseRecord(idOffer) {
    for (let id in data.warehouses) {
        let o = data.warehouses[id].acceptedOffers.filter(a => a.id === idOffer)[0];
        if (o !== undefined) return o;
    }

}

function findTransportRecord(idOffer) {
    for (let id in data.transports) {
        let o = data.transports[id].transports.filter(a => a.id === idOffer)[0];
        if (o !== undefined) return o;
    }

}

function calculateLocalStorageAverage() {
    if (storageLocalStartToEarlyArr.length) {
        let sum = 0;
        storageLocalStartToEarlyArr.forEach(function (element) {
            sum += element;
        });
        storageLocalStartToEarlyAvg = sum / storageLocalStartToEarlyArr.length;
    }
    if (storageLocalStartToLateArr.length) {
        let sum = 0;
        storageLocalStartToLateArr.forEach(function (element) {
            sum += element;
        });
        storageLocalStartToLateAvg = sum / storageLocalStartToLateArr.length;
    }
    if (storageLocalEndToEarlyArr.length) {
        let sum = 0;
        storageLocalEndToEarlyArr.forEach(function (element) {
            sum += element;
        });
        storageLocalEndToEarlyAvg = sum / storageLocalStartToEarlyArr.length;
    }
    if (storageLocalEndToLateArr.length) {
        let sum = 0;
        storageLocalEndToLateArr.forEach(function (element) {
            sum += element;
        });
        storageLocalEndToLateAvg = sum / storageLocalEndToLateArr.length;
    }
}

function calculateLocalTransportAverage() {
    if (transportLocalStartToEarlyArr.length) {
        let sum = 0;
        transportLocalStartToEarlyArr.forEach(function (element) {
            sum += element;
        });
        transportLocalStartToEarlyAvg = sum / transportLocalStartToEarlyArr.length;
    }
    if (transportLocalStartToLateArr.length) {
        let sum = 0;
        transportLocalStartToLateArr.forEach(function (element) {
            sum += element;
        });
        transportLocalStartToLateAvg = sum / transportLocalStartToLateArr.length;
    }
    if (transportLocalEndToEarlyArr.length) {
        let sum = 0;
        transportLocalEndToEarlyArr.forEach(function (element) {
            sum += element;
        });
        transportLocalEndToEarlyAvg = sum / transportLocalEndToEarlyArr.length;
    }
    if (transportLocalEndToLateArr.length) {
        let sum = 0;
        transportLocalEndToLateArr.forEach(function (element) {
            sum += element;
        });
        transportLocalEndToLateAvg = sum / transportLocalEndToLateArr.length;
    }
}

