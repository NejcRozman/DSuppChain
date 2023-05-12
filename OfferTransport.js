const LogisticSCI = require("./LogisticSCI");

class OfferTransport{

    constructor(idDemand, idTransport, pickupDate, deliveryDate, idPickup, idDelivery, cost, offerEndDate,pickupDrivingTime, finalLocation, parkingTime, port, pickupTimestamp, deliveryTimestamp) {
        this.idDemand = idDemand;
        this.sci = new LogisticSCI();
        this.id = this.sci.genId();
        this.idTransport = idTransport;
        this.pickupDate = pickupDate;
        this.deliveryDate = deliveryDate;
        this.idPickup = idPickup;
        this.idDelivery = idDelivery;
        this.timestamp = new Date();
        this.cost = cost;
        this.offerEndDate = offerEndDate;
        this.pickupDrivingTime = pickupDrivingTime;
        this.finalLocation = finalLocation;
        this.parkingTime = parkingTime;
        this.port = port;
        this.pickupTimestamp = pickupTimestamp;
        this.deliveryTimestamp = deliveryTimestamp;
    }

    static build(obj) {
        this.idDemand = obj.idDemand;
        this.id = obj.id;
        this.idTransport=obj.idTransport;
        this.pickupDate = new Date(parseInt(obj.pickupDate));
        this.deliveryDate = new Date(parseInt(obj.deliveryDate));
        this.timestamp = new Date(parseInt(obj.timestamp));
        this.cost = obj.cost;
        this.offerEndDate = new Date(parseInt(obj.offerEndDate));
        this.port = obj.port;
        this.pickupTimestamp = obj.pickupTimestamp;
        this.deliveryTimestamp = obj.deliveryTimestamp;
        return this;
    }

    static buildFromString(string) {
        let obj = JSON.parse(string);
        return this.build(obj);
    }

    toJSON() {
        return {
            id: this.id,
            idPickup: this.idPickup,
            idDelivery: this.idDelivery,
            idDemand: this.idDemand,
            idTransport:this.idTransport,
            pickupDate: this.pickupDate.getTime(),
            deliveryDate: this.deliveryDate.getTime(),
            timestamp: this.timestamp.getTime(),
            cost: this.cost,
            offerEndDate: this.offerEndDate.getTime(),
            pickupTimestamp: (this.pickupTimestamp) ? this.pickupTimestamp.getTime() : null,
            deliveryTimestamp: (this.deliveryTimestamp) ? this.deliveryTimestamp.getTime() : null,
        }
    }

    toQueryString() {
        return Object.keys(this.toJSON()).map(key => key + '=' + this.toJSON()[key]).join('&');
    }

}

module.exports = OfferTransport;