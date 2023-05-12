const btSerial = new (require('bluetooth-serial-port')).BluetoothSerialPort();

console.log('Searching for Bluetooth devices...');
btSerial.on('found', function(address, name) {
    console.log('Found: ' + address + ' Name: ' + name);
    btSerial.findSerialPortChannel(address, function(channel) {
        if (address === '00:06:66:DC:85:B7') {

            btSerial.connect(address, channel, function() {

                console.log('connected');

                let buf = new Buffer(1);
                buf.write("1", 0);

                btSerial.write(buf, function(err, bytesWritten) {
                    if (err) console.log(err);
                });

                console.log('Buffer sent ' + buf);

                btSerial.on('data', function(buffer) {
                    console.log('Recived: ' + buffer);
                    console.log(typeof buffer);
                    //console.log(buffer.toString('utf-8'));
                });
            }, function () {
                console.log('cannot connect');
            });

            // close the connection when you're ready
            btSerial.close();
        }

    }, function() {
        console.log('found nothing');
    });
});

btSerial.inquire();

