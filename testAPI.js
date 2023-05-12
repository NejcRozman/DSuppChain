const DemandTransport = require("./DemandTransport");


let pickupDateFrame = [new Date(+new Date() + 300000), new Date(+new Date() + 330000)];
let idPickup = '0x596f42720f07e7fbf7fb23cd2666ca01a8189a54';
let idDelivery = '0xcb22ebed5a5422ee304fc9bc17a042c2204db57e';
let idPackage = 1;
let demandEndDate = new Date(+new Date() + 300000);
let port = 8000;

let newDemand = new DemandTransport(idPackage, pickupDateFrame, idPickup, idDelivery, demandEndDate, port);

console.log('localhost:8000/demandTransport?' + newDemand.toQueryString());



