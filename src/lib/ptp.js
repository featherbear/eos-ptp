"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractValueData = exports.ValueType = exports.createInit = exports.createEventRequest = exports.decodeResponsePTP = exports.OpCode = exports.PacketType = exports.createPTP = void 0;
const node_machine_id_1 = require("node-machine-id");
const os_1 = require("os");
function createPTP(packetType, data) {
    /**
     * Length count is 4 bytes BED
     */
    const SIZE_LENGTH = 4;
    const SIZE_PACKET_TYPE = 4;
    let length = SIZE_LENGTH + SIZE_PACKET_TYPE + data.length;
    let result = Buffer.allocUnsafe(length);
    result.writeUInt32LE(length);
    result.writeUInt32LE(packetType, 4);
    data.copy(result, 8);
    return result;
}
exports.createPTP = createPTP;
var PacketType;
(function (PacketType) {
    PacketType[PacketType["INIT_CMD_REQ"] = 1] = "INIT_CMD_REQ";
    PacketType[PacketType["INIT_CMD_ACK"] = 2] = "INIT_CMD_ACK";
    PacketType[PacketType["INIT_EVT_REQ"] = 3] = "INIT_EVT_REQ";
    PacketType[PacketType["INIT_EVT_ACK"] = 4] = "INIT_EVT_ACK";
    PacketType[PacketType["INIT_FAIL"] = 5] = "INIT_FAIL";
    PacketType[PacketType["OP_REQUEST"] = 6] = "OP_REQUEST";
    PacketType[PacketType["OP_RESPONSE"] = 7] = "OP_RESPONSE";
    PacketType[PacketType["DATA_START"] = 9] = "DATA_START";
    PacketType[PacketType["DATA_END"] = 12] = "DATA_END";
})(PacketType = exports.PacketType || (exports.PacketType = {}));
var OpCode;
(function (OpCode) {
    OpCode[OpCode["OK"] = 8193] = "OK";
    OpCode[OpCode["BUSY"] = 8217] = "BUSY";
    OpCode[OpCode["GetDeviceInfo"] = 4097] = "GetDeviceInfo";
    OpCode[OpCode["OpenSession"] = 4098] = "OpenSession";
})(OpCode = exports.OpCode || (exports.OpCode = {}));
function decodeResponsePTP(data) {
    let length = data.readUInt32LE();
    let packetType = data.readUInt32LE(4);
    data = data.slice(8, length);
    return { length, packetType, data };
}
exports.decodeResponsePTP = decodeResponsePTP;
function createEventRequest(connectionNo) {
    let v = Buffer.allocUnsafe(4);
    v.writeUInt32LE(connectionNo);
    return createPTP(PacketType.INIT_EVT_REQ, v);
}
exports.createEventRequest = createEventRequest;
function createInit(name, guid) {
    const SIZE_GUID = 16;
    const SIZE_VERSION = 4;
    name = name || (0, os_1.hostname)() || "Remote";
    guid = (guid || (0, node_machine_id_1.machineIdSync)()).slice(0, SIZE_GUID);
    if (typeof guid === 'string')
        guid.padStart(SIZE_GUID, '0');
    /**
     * Each hostname character is followed by a NUL character
     * After the last character+NUL, there are two more NUL characters
     */
    const SIZE_HOSTNAME = 2 * name.length + 2;
    let result = Buffer.allocUnsafe(SIZE_GUID + SIZE_HOSTNAME + SIZE_VERSION);
    if (typeof guid === 'string') {
        result.write(guid);
    }
    else {
        guid.copy(result);
    }
    for (let i = 0; i < name.length; i++) {
        result.write(name[i], SIZE_GUID + i * 2);
        result.writeUInt8(0, SIZE_GUID + i * 2 + 1);
    }
    result.writeUint16LE(0, SIZE_GUID + name.length * 2);
    result.set([0x00, 0x00, 0x01, 0x00], SIZE_GUID + SIZE_HOSTNAME);
    return createPTP(PacketType.INIT_CMD_REQ, result);
}
exports.createInit = createInit;
var ValueType;
(function (ValueType) {
    ValueType[ValueType["APERTURE"] = 53505] = "APERTURE";
    ValueType[ValueType["SHUTTER"] = 53506] = "SHUTTER";
    ValueType[ValueType["ISO"] = 53507] = "ISO";
    ValueType[ValueType["EXPOSURE"] = 53508] = "EXPOSURE";
    ValueType[ValueType["WB_MODE"] = 53513] = "WB_MODE";
    ValueType[ValueType["WB_CT"] = 53514] = "WB_CT";
    ValueType[ValueType["WB_SHIFT_X"] = 53515] = "WB_SHIFT_X";
    ValueType[ValueType["WB_SHIFT_Y"] = 53516] = "WB_SHIFT_Y";
    ValueType[ValueType["PICTURE_STYLE"] = 53520] = "PICTURE_STYLE";
    ValueType[ValueType["AF_SERVO"] = 53625] = "AF_SERVO";
    ValueType[ValueType["AF_EYE"] = 53548] = "AF_EYE";
    ValueType[ValueType["AF_MODE"] = 53690] = "AF_MODE";
    ValueType[ValueType["RECORD"] = 53688] = "RECORD";
    ValueType[ValueType["NULL"] = 0] = "NULL";
})(ValueType = exports.ValueType || (exports.ValueType = {}));
const nullBuffer = Buffer.from([0x8, 0, 0, 0, 0, 0, 0, 0]);
function _extractValueData(data) {
    console.log("Extract", data);
    // Assuming the values are all 16-bit 'thingies'
    let parts = { values: [], enums: [] };
    while (data.length > 0) {
        let length = data.readUint16LE(0);
        if (!(length == 0x8 && data.equals(nullBuffer))) {
            let type = data.readUint16LE(8);
            let value = data.slice(12, length);
            if (value[0] == 0x03 && value.length > 4) {
                let enumLength = value.readUint16LE(4);
                value = value.slice(8);
                let enums = [];
                while (value.length > 0) {
                    enums.push(value.readUint32LE(0));
                    value = value.slice(4);
                }
                if (enums.length != enumLength) {
                    console.warn(enums, "didn't match expected size of", enumLength);
                }
                parts.enums.push({
                    type,
                    value: enums
                });
            }
            else {
                parts.values.push({
                    type,
                    value: value.length == 4 ? value.readUInt32LE() : value
                });
            }
        }
        data = data.slice(length);
    }
    return parts;
}
function extractValueData(data) {
    let state = _extractValueData(data);
    let map = {};
    for (let value of state.values) {
        map[value.type] = value.value;
    }
    return {
        values: map,
        enums: state.enums
    };
}
exports.extractValueData = extractValueData;
