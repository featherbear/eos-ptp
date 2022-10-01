import { Socket } from 'net'
import DataManager from './lib/DataManager';
import ISO from './lib/iso';

let s = new Socket()

console.log('Start Connect');

let client = new DataManager({
    clientName: "FENNEL",
    deviceHost: "192.168.0.46",
    clientGuid: Buffer.from("\xae\x6d\x94\x5c\x56\xfa\xfb\x44\x82\xe5\x0b\x5b\x15\xe4\xfd\x05", 'latin1')
})

client.connect().then(() => {
    console.log('Connected');


    let fn = async () => {
        console.log('START 10000');
        await client.do_set_ISO(ISO.ISO_10000)
        console.log('END 10000');

        setTimeout(async () => {
            console.log('START 1600');
            await client.do_set_ISO(ISO.ISO_1600)
            console.log('END 10000');
            setTimeout(fn, 1000)
        }, 1000)
    }

    fn()

})
