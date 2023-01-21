"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = require("net");
const DataManager_1 = __importDefault(require("./lib/DataManager"));
const ptp_1 = require("./lib/ptp");
let s = new net_1.Socket();
console.log('Start Connect');
let client = new DataManager_1.default({
    clientName: "FENNEL",
    deviceHost: "192.168.0.46",
    clientGuid: Buffer.from("\xae\x6d\x94\x5c\x56\xfa\xfb\x44\x82\xe5\x0b\x5b\x15\xe4\xfd\x05", 'latin1')
});
let lookups = Object.fromEntries(Object.entries(ptp_1.ValueType).map(([key, val]) => [val.toString(), key]));
client.on('state', function (data) {
    // console.log(data);
    // let parsed = 
    // console.log(parsed);
    for (let e of (data.enums || [])) {
        console.log(lookups[e.type], e.value);
    }
    console.log(Object.fromEntries(Object.entries(data.values).map(([key, val]) => [lookups[key.toString()], val]) || []));
});
client.connect().then(() => {
    console.log('Connected');
    let fn = async () => {
        // console.log('START 10000');
        // await client.do_set_ISO(ISO.ISO_10000)
        // console.log('END 10000');
        // setTimeout(async () => {
        //     console.log('START 1600');
        //     await client.do_set_ISO(ISO.ISO_1600)
        //     console.log('END 10000');
        //     setTimeout(fn, 1000)
        // }, 1000)
    };
    // client.on('raw', function (data) {
    //     console.log(data);
    // })
    fn();
});
