"use strict";
// TODO: SSDP is more frequenct
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multicast_dns_1 = __importDefault(require("multicast-dns"));
let MDNS = (0, multicast_dns_1.default)({
    multicast: true,
    reuseAddr: true
});
const targetSuffix = '._ptp._tcp.local';
let txtMap = {
    'mn.canon.com': 'model',
    'myhwa.canon.com': 'mac',
    'snum.canon.com': 'serial',
    'nicname.canon.com': 'nickname'
};
let cache = {};
MDNS.on('response', function (r) {
    var _a, _b;
    for (let answer of r.answers) {
        if (answer.name.endsWith(targetSuffix)) {
            let host = answer.name.slice(0, answer.name.lastIndexOf(targetSuffix));
            if (answer.type === 'TXT') {
                let data = {};
                for (let B of answer.data) {
                    B = B.toString();
                    let idx = B.indexOf('=');
                    let key = B.slice(0, idx);
                    let value = B.slice(idx + 1);
                    if (txtMap[key]) {
                        data[txtMap[key]] = value;
                    }
                }
                cache[host] = { ...((_a = cache[host]) !== null && _a !== void 0 ? _a : {}), data };
            }
            else if (answer.type === 'SRV') {
                cache[host] = { ...((_b = cache[host]) !== null && _b !== void 0 ? _b : {}), srv: { host: answer.data.target, port: answer.data.port } };
            }
            if (cache[host].data && cache[host].srv) {
                console.log(cache[host]);
            }
        }
    }
});
console.log('Listening');
