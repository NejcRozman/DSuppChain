const LogisticSCI = require("./LogisticSCI");

class DemandTransport {

    constructor(idPackage, pickupDateFrame, idPickup, idDelivery, demandEndDate, port) {
        this.LogisticSCI = new LogisticSCI();
        this.id = this.LogisticSCI.genId();
        this.pickupDateFrame = pickupDateFrame;
        this.idPickup = idPickup;
        this.idDelivery = idDelivery;
        this.idPackage = idPackage;
        this.timestamp = new Date();
        this.demandEndDate = demandEndDate;
        this.port = port;
    }
    calculateDistance() {
        return this.idPickup + this.idDelivery;
    }

    static build(obj) {

        return new DemandTransport(obj.id,[new Date(parseInt(obj.pickupDateFrame.split(",")[0])), new Date(parseInt(obj.pickupDateFrame.split(",")[1]))],obj.idPickup,obj.idDelivery,new Date(parseInt(obj.demandEndDate)),obj.idPackage,new Date(parseInt(obj.timestamp)), obj.port);

    }

    static buildFromString(string) {
        let obj = JSON.parse(string);
        return this.build(obj);
    }

    toJson() {
        return {
            id: this.id,
            pickupDateFrame: [this.pickupDateFrame[0].getTime(), this.pickupDateFrame[1].getTime()],
            idPickup: this.idPickup,
            idDelivery: this.idDelivery,
            idPackage: this.idPackage,
            timestamp: this.timestamp.getTime(),
            demandEndDate: this.demandEndDate.getTime(),
            port: this.port
        }
    }

    toQueryString() {
        return Object.keys(this.toJson()).map(key => key + '=' + this.toJson()[key]).join('&');
    }



}

module.exports = DemandTransport;