
const Vehicle = require("./Vehicle");


//Variables
let IPS = {
    TRANSPORT: 'http://192.168.0.200:8000',
    WAREHOUSE1: 'http://192.168.0.100:8000',
    WAREHOUSE2: 'http://192.168.0.101:8000',
    PACKAGE: 'http://192.168.0.150:'
};


let vehicle = new Vehicle(IPS);

vehicle.init(function (rsp) {
    if (rsp) {
        vehicle.getWarehouses(function (data) {
            vehicle.createTimetable(data);
            vehicle.setAPI();
            vehicle.setBluetooth();
        });
    }

});

/*setInterval(function () {
    console.log('Offers: ' + vehicle.offers.length);
    console.log('Transports: ' + vehicle.transports.length);

}, 10000);*/








