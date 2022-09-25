import { createEventRequest, createInit, decodeInitResponse, decodeResponse } from './lib/ptp'

let initPacket = createInit("FENNEL", Buffer.from("\xae\x6d\x94\x5c\x56\xfa\xfb\x44\x82\xe5\x0b\x5b\x15\xe4\xfd\x05", 'latin1'))
console.log(initPacket, initPacket.toString(), initPacket.length);

import { Socket } from 'net'
import DataManager from './lib/DataManager';

let s = new Socket()

console.log('Start Connect');
s.connect(15740, '192.168.0.46', function () {
    console.log("Connect");
    s.write(initPacket)

    s.once('data', function (data) {
        console.log('got data');
        // Device disconnects??
        let decoded = decodeInitResponse(data)
        if (decoded.packet_type == 0x5) {
            console.error("Rejected")

        } else if (decoded.packet_type == 0x2) {
            console.log('Connected', decoded);


            const connectionNo = decoded.connection_number


            let newS = new Socket()
            newS.connect(15740, '192.168.0.46', function () {
                newS.once('data', function (data) {
                    let decoded = decodeResponse(data)
                    if (decoded.packet_type == 0x04) {
                        console.log('Successfully connected to event req');

                        s.on('data', function(data) {
                            console.log('data', data, decodeResponse(data));
                        })
                        let client = new DataManager(s)
                        // client.send(client._createOperationRequest(0x00000001, 0x1001))
                        
// every 200ms send op with phase 0x1, opcode 0x9116
// with the remote shooting window open, every 10 seconds send op wth phase 0x1, opcode, 0x911a

                        // TODO: Do after response
                        // setTimeout(() =>
                         client.open_session()
                        // , 500)
                        console.log('Gonna send action soon');
                        setTimeout(() => {
                            console.log('SEND');
                            client.do_test_setting()

                        }, 5000)

                    } else {
                        console.error("Unexpected", decoded)
                    }
                })
                newS.write(createEventRequest(connectionNo))
            })


        } else {
            console.error("Unexpected packet", decoded)
        }


    })

    s.on('close', function () {
        console.log('Disconnected');
    })
    // Could fail with packet type 0x05 (fail)
})


