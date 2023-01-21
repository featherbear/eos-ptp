"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _DataManager_instances, _DataManager_socket, _DataManager_transactionCounter, _DataManager_lastReceivedTransactionID, _DataManager_PTPsendQueue, _DataManager_PTPcallbackMap, _DataManager_connectionDetails, _DataManager_receiveBuffer, _DataManager_recvDataBuffer, _DataManager_recvDataRemain, _DataManager_recvDataFor, _DataManager___resetDataReceive, _DataManager_nextBytes, _DataManager___pushTransaction;
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = require("net");
const ptp_1 = require("./ptp");
const queue_1 = __importDefault(require("queue"));
const events_1 = require("events");
class DataManager extends events_1.EventEmitter {
    constructor(options) {
        super();
        _DataManager_instances.add(this);
        _DataManager_socket.set(this, void 0);
        _DataManager_transactionCounter.set(this, void 0);
        _DataManager_lastReceivedTransactionID.set(this, void 0);
        _DataManager_PTPsendQueue.set(this, void 0);
        _DataManager_PTPcallbackMap.set(this, void 0);
        this.CAMERA_PORT = 15740;
        this.RETRY_BACKOFF_MS = 250;
        this.STATUS_REFRESH_RATE_MS = 200;
        _DataManager_connectionDetails.set(this, void 0);
        _DataManager_receiveBuffer.set(this, void 0);
        _DataManager_recvDataBuffer.set(this, void 0);
        _DataManager_recvDataRemain.set(this, void 0);
        _DataManager_recvDataFor.set(this, void 0);
        __classPrivateFieldSet(this, _DataManager_connectionDetails, options, "f");
        __classPrivateFieldSet(this, _DataManager_socket, new net_1.Socket(), "f");
        __classPrivateFieldGet(this, _DataManager_socket, "f").setNoDelay(true);
        __classPrivateFieldSet(this, _DataManager_transactionCounter, 0, "f");
        __classPrivateFieldSet(this, _DataManager_lastReceivedTransactionID, -1, "f");
        __classPrivateFieldSet(this, _DataManager_PTPcallbackMap, {}, "f");
        __classPrivateFieldSet(this, _DataManager_PTPsendQueue, new queue_1.default({
            autostart: true,
            concurrency: 1
        }), "f");
        __classPrivateFieldSet(this, _DataManager_receiveBuffer, Buffer.allocUnsafe(0), "f");
        __classPrivateFieldGet(this, _DataManager_instances, "m", _DataManager___resetDataReceive).call(this);
        __classPrivateFieldGet(this, _DataManager_socket, "f").on('data', (bytes) => {
            this.emit('raw', bytes);
            __classPrivateFieldSet(this, _DataManager_receiveBuffer, Buffer.concat([__classPrivateFieldGet(this, _DataManager_receiveBuffer, "f"), bytes]), "f");
            while (true) {
                while (__classPrivateFieldGet(this, _DataManager_recvDataRemain, "f") && __classPrivateFieldGet(this, _DataManager_receiveBuffer, "f").length > 0) {
                    let incomingData = __classPrivateFieldGet(this, _DataManager_instances, "m", _DataManager_nextBytes).call(this, __classPrivateFieldGet(this, _DataManager_recvDataRemain, "f"));
                    __classPrivateFieldSet(this, _DataManager_recvDataBuffer, Buffer.concat([__classPrivateFieldGet(this, _DataManager_recvDataBuffer, "f"), incomingData]), "f");
                    __classPrivateFieldSet(this, _DataManager_recvDataRemain, __classPrivateFieldGet(this, _DataManager_recvDataRemain, "f") - incomingData.length, "f");
                }
                if (__classPrivateFieldGet(this, _DataManager_receiveBuffer, "f").length < 8)
                    break;
                let packet = (0, ptp_1.decodeResponsePTP)(__classPrivateFieldGet(this, _DataManager_receiveBuffer, "f"));
                __classPrivateFieldSet(this, _DataManager_receiveBuffer, __classPrivateFieldGet(this, _DataManager_receiveBuffer, "f").slice(packet.length), "f");
                switch (packet.packetType) {
                    case ptp_1.PacketType.DATA_START: {
                        packet.transactionID = packet.data.readUint32LE(0);
                        // TODO: 64-bit data length
                        packet.dataLen = packet.data.readUInt32LE(4);
                        // Packet length doesn't match the 
                        packet.extraData = __classPrivateFieldGet(this, _DataManager_instances, "m", _DataManager_nextBytes).call(this, 12);
                        __classPrivateFieldGet(this, _DataManager_instances, "m", _DataManager___resetDataReceive).call(this);
                        __classPrivateFieldSet(this, _DataManager_recvDataFor, packet.transactionID, "f");
                        __classPrivateFieldSet(this, _DataManager_recvDataRemain, packet.dataLen, "f");
                        break;
                    }
                    case ptp_1.PacketType.DATA_END: {
                        console.log('DATA_END');
                        break;
                    }
                    case ptp_1.PacketType.OP_RESPONSE: {
                        packet.opcode = packet.data.readUint16LE(0);
                        packet.transactionID = packet.data.readUint32LE(2);
                        if (__classPrivateFieldGet(this, _DataManager_recvDataFor, "f") == packet.transactionID) {
                            packet.buffer = Buffer.from(__classPrivateFieldGet(this, _DataManager_recvDataBuffer, "f"));
                            __classPrivateFieldGet(this, _DataManager_instances, "m", _DataManager___resetDataReceive).call(this);
                        }
                        break;
                    }
                    case ptp_1.PacketType.INIT_CMD_ACK: {
                        packet.connectionNumber = packet.data.readUint32LE(0);
                        packet.guid = packet.data.slice(4, 4 + 16).toString('hex');
                        let hostnameBuffer = packet.data.slice(4 + 16, -4);
                        let hostname = "";
                        for (let i = 0; i < hostnameBuffer.length - 2; i++) {
                            if (i % 2 == 1)
                                continue;
                            hostname += String.fromCharCode(hostnameBuffer[i]);
                        }
                        packet.hostname = hostname;
                        packet.version = packet.data.slice(-4);
                        break;
                    }
                    case ptp_1.PacketType.INIT_FAIL: {
                        break;
                    }
                    default: {
                        console.warn("Received unknown packet type", packet);
                    }
                }
                {
                    let tID = packet.transactionID;
                    if (tID !== undefined) {
                        if (tID < __classPrivateFieldGet(this, _DataManager_lastReceivedTransactionID, "f")) {
                            console.warn("Received packet has a transaction ID earlier than expected");
                        }
                        __classPrivateFieldSet(this, _DataManager_lastReceivedTransactionID, tID, "f");
                    }
                }
                this.emit(packet.packetType.toString(), packet);
                this.emit('data', packet);
            }
        });
        this.on(ptp_1.PacketType.OP_RESPONSE.toString(), (data) => {
            let cb;
            if ((cb = __classPrivateFieldGet(this, _DataManager_PTPcallbackMap, "f")[data.transactionID])) {
                delete __classPrivateFieldGet(this, _DataManager_PTPcallbackMap, "f")[data.transactionID];
                cb(data);
            }
            else {
                console.warn("Didn't find an existing callback for transaction", data.transactionID);
            }
        });
    }
    connect(deviceHost, clientName, clientGuid) {
        return new Promise((resolve, reject) => {
            __classPrivateFieldGet(this, _DataManager_socket, "f").connect(this.CAMERA_PORT, deviceHost || __classPrivateFieldGet(this, _DataManager_connectionDetails, "f").deviceHost, () => {
                __classPrivateFieldGet(this, _DataManager_socket, "f").write((0, ptp_1.createInit)(clientName || __classPrivateFieldGet(this, _DataManager_connectionDetails, "f").clientName, clientGuid || __classPrivateFieldGet(this, _DataManager_connectionDetails, "f").clientGuid));
                this.once('data', (packet) => {
                    if (packet.packetType == ptp_1.PacketType.INIT_FAIL) {
                        throw new Error("Camera rejected connection request");
                    }
                    if (packet.packetType != ptp_1.PacketType.INIT_CMD_ACK) {
                        throw new Error("Unexpected response to connection request");
                    }
                    // TODO: Investigate what else this socket does
                    let evtSocket = new net_1.Socket();
                    evtSocket.connect(this.CAMERA_PORT, deviceHost || __classPrivateFieldGet(this, _DataManager_connectionDetails, "f").deviceHost, () => {
                        evtSocket.write((0, ptp_1.createEventRequest)(packet.connectionNumber));
                        evtSocket.once('data', async (data) => {
                            let decoded = (0, ptp_1.decodeResponsePTP)(data);
                            if (decoded.packetType != ptp_1.PacketType.INIT_EVT_ACK) {
                                throw new Error("Unexpected response to connection request");
                            }
                            // GetDeviceInfo
                            await __classPrivateFieldGet(this, _DataManager_instances, "m", _DataManager___pushTransaction).call(this, transactionID => {
                                this.send(this._createOperationRequest(0x1, ptp_1.OpCode.GetDeviceInfo, transactionID));
                            }, 0);
                            // OpenSession
                            await __classPrivateFieldGet(this, _DataManager_instances, "m", _DataManager___pushTransaction).call(this, (transactionID) => {
                                this.send(this._createOperationRequest(0x01, ptp_1.OpCode.OpenSession, transactionID, Buffer.from([0x41, 0x00, 0x00, 0x00])));
                            }, 0);
                            // 0x9114: PTP_OC_CANON_SetRemoteMode
                            await this._withTransaction((transactionID) => {
                                // Transaction 1 had this value to 0x05
                                // this.send(this._createOperationRequest(0x01, 0x9114, transactionID, Buffer.from([0x05, 0x00, 0x00, 0x00])))
                                this.send(this._createOperationRequest(0x01, 0x9114, transactionID, Buffer.from([0x02, 0x00, 0x00, 0x00])));
                            });
                            // 0x9115: PTP_OC_CANON_SetEventMode
                            await this._withTransaction((transactionID) => {
                                this.send(this._createOperationRequest(0x01, 0x9115, transactionID, Buffer.from([0x01, 0x00, 0x00, 0x00])));
                            });
                            // Gets a whole bunch of data
                            // 0x9116: PTP_OC_CANON_GetEvent
                            let state = await this._withTransaction((transactionID) => {
                                this.send(this._createOperationRequest(0x01, 0x9116, transactionID, Buffer.from([0x03, 0x00, 0x00, 0x00])));
                            });
                            /*
                            TODO:
                            
                            {
                              NULL: <Buffer >,
                              undefined: <Buffer 03 00 00 00 02 00 00 00 00 00 00 00 01 00 00 00>,
                              APERTURE: <Buffer 03 00 00 00 14 00 00 00 15 00 00 00 18 00 00 00 1b 00 00 00 1d 00 00 00 20 00 00 00 23 00 00 00 25 00 00 00 28 00 00 00 2b 00 00 00 2d 00 00 00 30 00 ... 38 more bytes>,
                              SHUTTER: <Buffer 03 00 00 00 00 00 00 00>,
                              ISO: <Buffer 03 00 00 00 18 00 00 00 00 00 00 00 40 00 00 00 48 00 00 00 4b 00 00 00 4d 00 00 00 50 00 00 00 53 00 00 00 55 00 00 00 58 00 00 00 5b 00 00 00 5d 00 ... 54 more bytes>,
                              EXPOSURE: <Buffer 03 00 00 00 13 00 00 00 e8 00 00 00 eb 00 00 00 ed 00 00 00 f0 00 00 00 f3 00 00 00 f5 00 00 00 f8 00 00 00 fb 00 00 00 fd 00 00 00 00 00 00 00 03 00 ... 34 more bytes>,
                              WB_MODE: <Buffer 03 00 00 00 0a 00 00 00 00 00 00 00 17 00 00 00 01 00 00 00 08 00 00 00 02 00 00 00 03 00 00 00 04 00 00 00 05 00 00 00 06 00 00 00 09 00 00 00>,
                              WB_CT: <Buffer 03 00 00 00 4c 00 00 00 c4 09 00 00 28 0a 00 00 8c 0a 00 00 f0 0a 00 00 54 0b 00 00 b8 0b 00 00 1c 0c 00 00 80 0c 00 00 e4 0c 00 00 48 0d 00 00 ac 0d ... 262 more bytes>,
                              WB_SHIFT_X: <Buffer 03 00 00 00 13 00 00 00 f7 ff ff ff f8 ff ff ff f9 ff ff ff fa ff ff ff fb ff ff ff fc ff ff ff fd ff ff ff fe ff ff ff ff ff ff ff 00 00 00 00 01 00 ... 34 more bytes>,
                              WB_SHIFT_Y: <Buffer 03 00 00 00 13 00 00 00 f7 ff ff ff f8 ff ff ff f9 ff ff ff fa ff ff ff fb ff ff ff fc ff ff ff fd ff ff ff fe ff ff ff ff ff ff ff 00 00 00 00 01 00 ... 34 more bytes>,
                              PICTURE_STYLE: <Buffer 03 00 00 00 0b 00 00 00 87 00 00 00 81 00 00 00 82 00 00 00 83 00 00 00 88 00 00 00 84 00 00 00 85 00 00 00 86 00 00 00 21 00 00 00 22 00 00 00 23 00 ... 2 more bytes>,
                              AF_EYE: <Buffer 03 00 00 00 00 00 00 00>,
                              AF_SERVO: <Buffer 03 00 00 00 00 00 00 00>,
                              RECORD: <Buffer 03 00 00 00 02 00 00 00 04 00 00 00 00 00 00 00>,
                              AF_MODE: <Buffer 03 00 00 00 02 00 00 00 02 00 00 00 01 00 00 00>
                            }
                            
                            */
                            // TODO: Keep the data state stored somewhere?
                            let stateLoop = () => {
                                this.getDeviceState().finally(() => {
                                    setTimeout(() => stateLoop(), this.STATUS_REFRESH_RATE_MS);
                                });
                            };
                            stateLoop();
                            resolve(undefined);
                            console.log('after resolve?');
                            this.emit('state', (0, ptp_1.extractValueData)(state.buffer));
                        });
                    });
                });
            });
        });
    }
    async getDeviceState() {
        let packet = await this._withTransaction((transactionID) => {
            this.send(this._createOperationRequest(0x1, 0x9116, transactionID));
        });
        let data = (0, ptp_1.extractValueData)(packet.buffer);
        this.emit('state', data);
        return data;
    }
    nextCounter() {
        var _a;
        let value = __classPrivateFieldSet(this, _DataManager_transactionCounter, (_a = __classPrivateFieldGet(this, _DataManager_transactionCounter, "f"), ++_a), "f");
        if (__classPrivateFieldGet(this, _DataManager_transactionCounter, "f") == 4294967296) {
            __classPrivateFieldSet(this, _DataManager_transactionCounter, 0, "f");
        }
        return value;
    }
    /**
     *
     * @param phase 4 bytes
     * @param opcode 2 bytes
     */
    _createOperationRequest(phase, opcode, transactionID, extraData) {
        let data = Buffer.allocUnsafe(10 + (extraData ? extraData.length : 0));
        data.writeUInt32LE(phase, 0);
        data.writeUInt16LE(opcode, 4);
        data.writeUInt32LE(transactionID !== null && transactionID !== void 0 ? transactionID : this.nextCounter(), 6);
        if (extraData) {
            extraData.copy(data, 10);
        }
        return (0, ptp_1.createPTP)(ptp_1.PacketType.OP_REQUEST, data);
    }
    _createStartDataPacket(dataLen /* TODO: 64-bit */, transactionID, data) {
        let payload = Buffer.alloc(4 + 8 + (data ? data.length : 0));
        payload.writeUInt32LE(transactionID !== null && transactionID !== void 0 ? transactionID : this.nextCounter(), 0);
        payload.writeUInt32LE(dataLen, 4);
        if (data) {
            data.copy(payload, 12);
        }
        return (0, ptp_1.createPTP)(ptp_1.PacketType.DATA_START, payload);
    }
    _createEndDataPacket(transactionID, data) {
        let payload = Buffer.allocUnsafe(4 + (data ? data.length : 0));
        payload.writeUInt32LE(transactionID !== null && transactionID !== void 0 ? transactionID : this.nextCounter(), 0);
        if (data) {
            data.copy(payload, 4);
        }
        return (0, ptp_1.createPTP)(ptp_1.PacketType.DATA_END, payload);
    }
    do_set_ISO(iso) {
        return this._withTransaction((transactionID) => {
            console.log('Execute ISO SET', iso);
            this.send(this._createOperationRequest(0x2, 0x9110, transactionID));
            let b = Buffer.from([0x0c, 0x00, 0x00, 0x00, 0x03, 0xd1, 0x00, 0x00, iso, 0x00, 0x00, 0x00]);
            this.send(this._createStartDataPacket(b.length, transactionID));
            this.send(this._createEndDataPacket(transactionID, b));
        });
    }
    do_record_start() {
        return this._withTransaction((transactionID) => {
            console.log('Record start', transactionID);
            this.send(this._createOperationRequest(0x2, 0x9110, transactionID));
            let b = Buffer.from([0x0c, 0x00, 0x00, 0x00, 0xb8, 0xd1, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]);
            this.send(this._createStartDataPacket(b.length, transactionID));
            this.send(this._createEndDataPacket(transactionID, b));
        });
    }
    do_record_stop() {
        return this._withTransaction((transactionID) => {
            console.log('Record stop', transactionID);
            this.send(this._createOperationRequest(0x2, 0x9110, transactionID));
            let b = Buffer.from([0x0c, 0x00, 0x00, 0x00, 0xb8, 0xd1, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
            this.send(this._createStartDataPacket(b.length, transactionID));
            this.send(this._createEndDataPacket(transactionID, b));
        });
    }
    send(data) {
        __classPrivateFieldGet(this, _DataManager_socket, "f").write(data);
    }
    async _withTransaction(fn) {
        let transactionID = this.nextCounter();
        return __classPrivateFieldGet(this, _DataManager_instances, "m", _DataManager___pushTransaction).call(this, fn, transactionID);
    }
}
exports.default = DataManager;
_DataManager_socket = new WeakMap(), _DataManager_transactionCounter = new WeakMap(), _DataManager_lastReceivedTransactionID = new WeakMap(), _DataManager_PTPsendQueue = new WeakMap(), _DataManager_PTPcallbackMap = new WeakMap(), _DataManager_connectionDetails = new WeakMap(), _DataManager_receiveBuffer = new WeakMap(), _DataManager_recvDataBuffer = new WeakMap(), _DataManager_recvDataRemain = new WeakMap(), _DataManager_recvDataFor = new WeakMap(), _DataManager_instances = new WeakSet(), _DataManager___resetDataReceive = function _DataManager___resetDataReceive() {
    __classPrivateFieldSet(this, _DataManager_recvDataBuffer, Buffer.allocUnsafe(0), "f");
    __classPrivateFieldSet(this, _DataManager_recvDataRemain, 0, "f");
    __classPrivateFieldSet(this, _DataManager_recvDataFor, -1, "f");
}, _DataManager_nextBytes = function _DataManager_nextBytes(n) {
    let res = __classPrivateFieldGet(this, _DataManager_receiveBuffer, "f").slice(0, n);
    __classPrivateFieldSet(this, _DataManager_receiveBuffer, __classPrivateFieldGet(this, _DataManager_receiveBuffer, "f").slice(res.length), "f");
    return res;
}, _DataManager___pushTransaction = async function _DataManager___pushTransaction(fn, transactionID) {
    return new Promise((resolveOuter, reject) => {
        let retryCount = 0;
        let worker = () => new Promise(async (resolveInner, reject) => {
            // console.debug(`Worker started for #${transactionID} (retry = ${retryCount})`);
            setTimeout(async () => {
                __classPrivateFieldGet(this, _DataManager_PTPcallbackMap, "f")[transactionID] = (data) => {
                    let shouldRetry = data.packetType == ptp_1.PacketType.OP_RESPONSE && data.opcode == ptp_1.OpCode.BUSY;
                    if (shouldRetry) {
                        retryCount++;
                        // console.debug('Going to retry', retryCount);
                        __classPrivateFieldGet(this, _DataManager_PTPsendQueue, "f").unshift(worker);
                    }
                    resolveInner(data);
                    if (!shouldRetry)
                        resolveOuter(data);
                };
                await fn(transactionID);
            }, retryCount * this.RETRY_BACKOFF_MS);
        });
        __classPrivateFieldGet(this, _DataManager_PTPsendQueue, "f").push(worker);
    });
};
