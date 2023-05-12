const Web3 = require("web3");

const contractABI = [
    {
        "constant": false,
        "inputs": [
            {
                "name": "id",
                "type": "address"
            },
            {
                "name": "url",
                "type": "string"
            }
        ],
        "name": "editWarehouse",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "id",
                "type": "address"
            }
        ],
        "name": "getWarehouse",
        "outputs": [
            {
                "name": "",
                "type": "address"
            },
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "getWarehouses",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "id",
                "type": "address"
            }
        ],
        "name": "getTransport",
        "outputs": [
            {
                "name": "",
                "type": "address"
            },
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "ind",
                "type": "uint256"
            }
        ],
        "name": "getTransports",
        "outputs": [
            {
                "name": "",
                "type": "address"
            },
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "warehouses",
        "outputs": [
            {
                "name": "id",
                "type": "address"
            },
            {
                "name": "url",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "id",
                "type": "address"
            },
            {
                "name": "url",
                "type": "string"
            }
        ],
        "name": "registerWarehouse",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "id",
                "type": "address"
            },
            {
                "name": "url",
                "type": "string"
            }
        ],
        "name": "registerTransport",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "transports",
        "outputs": [
            {
                "name": "id",
                "type": "address"
            },
            {
                "name": "url",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "ind",
                "type": "uint256"
            }
        ],
        "name": "getWarehouse",
        "outputs": [
            {
                "name": "",
                "type": "address"
            },
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "id",
                "type": "address"
            },
            {
                "name": "url",
                "type": "string"
            }
        ],
        "name": "editTransport",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "getTransports",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }
];

class LogisticSCI {
    constructor() {
        this.web3 = new Web3(new Web3.providers.HttpProvider('https://rinkeby.infura.io/wdzFkvyTAnryr0Pkh3AL'));
        this.contract = new this.web3.eth.Contract(contractABI, "0x65e93921d65EbBE60358d37108e0A4BC7892D15f");
    }

    genAccount() {
        return this.web3.eth.accounts.create();
    }

    genId() {
        return this.web3.utils.randomHex(20)
    }

    getTransportsList(cb) {
        this.contract.methods.getTransports().call({from:'0x24c6D22f3EeA0625a9e0e20837673D8A543F0A3D'}, function (error, result) {
            if (error) return error;
            let t=result.substring(0,result.length-1).split(";");
            let transports=[];
            t.forEach(function (row) {
                transports.push({id:"0x"+row.split(",")[0],url:row.split(",")[1]});
            });
            return cb(transports)
        })
    }

    getWarehousesList(cb) {
        this.contract.methods.getWarehouses().call({from:'0x24c6D22f3EeA0625a9e0e20837673D8A543F0A3D'}, function (error, result) {
            if (error) return error;
            let w=result.substring(0,result.length-1).split(";");
            let warehouses=[];
            w.forEach(function (row) {
                warehouses.push({id:"0x"+row.split(",")[0],url:row.split(",")[1]});
            });
            return cb(warehouses)
        })
    }

}

module.exports = LogisticSCI;