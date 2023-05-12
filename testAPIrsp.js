const OfferTransportRsp = require("./OfferTransportRsp");

let idOffer = '0xaebe95d4e60879e76adbd3fdf96ec3e01fbd5163';
let acceptance = true;


let newRsp = new OfferTransportRsp(idOffer, acceptance);



console.log('localhost:8000/demandTransportRsp?' + newRsp.toQueryString());