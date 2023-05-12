class OfferTransportRsp {

    constructor(idOffer, acceptance) {
        this.idOffer = idOffer;
        this.acceptance = acceptance;

    }

    static build(obj) {
        return new OfferTransportRsp(obj.idOffer, obj.acceptance);
    }

    static buildFromString(string) {
        let obj = JSON.parse(string);
        return this.build(obj);
    }

    toJSON() {
        return {idOffer: this.idOffer, acceptance: this.acceptance}
    }

    toQueryString() {
        return Object.keys(this.toJSON()).map(key => key + '=' + this.toJSON()[key]).join('&');
    }

}

module.exports = OfferTransportRsp;