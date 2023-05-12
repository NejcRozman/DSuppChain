const btSerial = new (require('bluetooth-serial-port')).BluetoothSerialPort();
const winston = require('winston');

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

class Bluetooth {
    constructor() {
        this.transport = '00:06:66:DC:85:BA';


            }

    connect(cb) {

        let that = this;


        btSerial.on('found', function(address, name) {

            that.logWarning('Found: ' + address + ' Name: ' + name);
            btSerial.findSerialPortChannel(address, function(channel) {
                that.logWarning('Connecting...');
                if (address === that.transport) {
                    btSerial.connect(address, channel, function() {
                        cb('Connected to ' + name);

                    }, function () {
                        cb('Not connected');
                    });

                    // close the connection when you're ready
                    btSerial.close();
                }

            }, function() {
                that.logWarning('Did not connect to ' + name);
            });
        });

        that.logWarning('Searching for Bluetooth devices...');
        btSerial.inquire();
    }

    command(distance, cb) {

        let buf = new Buffer(1);
        buf.write(distance.toString(), 0);

        btSerial.write(buf, function(err, bytesWritten) {
            if (err) console.log(err);
        });


        btSerial.on('data', listener);

        function listener (buffer) {

            if (buffer) {
                btSerial.removeListener('data', listener);
                cb(true);
            } else {
                //cb1(false);
            }
        }

        /*function getRndInteger(min, max) {
            return Math.floor(Math.random() * (max - min + 1) ) + min;
        }

        let timeout = getRndInteger(6000, 7000) * distance;

        setTimeout(function () {
            cb(true);
        }, timeout);*/

    }

    logWarning(msg) {
        logger.warn(msg);
    }


}

module.exports = Bluetooth;