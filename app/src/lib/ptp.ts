import { machineIdSync } from 'node-machine-id';
import { hostname as getHostname } from 'os'

export function createPTP(packetType: PacketType, data: Buffer) {
    /**
     * Length count is 4 bytes BED
     */
    const SIZE_LENGTH = 4
    const SIZE_PACKET_TYPE = 4
    let length = SIZE_LENGTH + SIZE_PACKET_TYPE + data.length

    let result = Buffer.allocUnsafe(length)
    result.writeUInt32LE(length)
    result.writeUInt32LE(packetType, 4)

    data.copy(result, 8)

    return result
}

export enum PacketType {
    INIT_CMD_REQ = 0x1,
    INIT_CMD_ACK = 0x2,
    INIT_EVT_REQ = 0x3,
    INIT_EVT_ACK = 0x4,
    INIT_FAIL = 0x5,
    OP_REQUEST = 0x6,
    OP_RESPONSE = 0x7,
    DATA_START = 0x9,
    DATA_END = 0xc
}
export enum OpCode {
    OK = 0x2001,
    BUSY = 0x2019,

    GetDeviceInfo = 0x1001,
    OpenSession = 0x1002
}

export type PacketPTP = PacketOpResponse | PacketInitResponse | PacketInitFail | PacketDataStart | PacketDataEnd

export type PacketPTPBase = {
    length: number
    packetType: PacketType

    /**
     * Packet data
     */
    data: Buffer
}

export type PacketInitResponse = PacketPTPBase & {
    packetType: PacketType.INIT_CMD_ACK
    connectionNumber: number
    guid: string
    hostname: string
    version: any
}

export type PacketOpResponse = PacketPTPBase & {
    packetType: PacketType.OP_RESPONSE
    opcode: OpCode
    transactionID: number,
    buffer?: Buffer
}

export type PacketInitFail = PacketPTPBase & {
    packetType: PacketType.INIT_FAIL
}

export type PacketDataStart = PacketPTPBase & {
    packetType: PacketType.DATA_START
    transactionID: number
    dataLen: number
    extraData: Buffer
}

export type PacketDataEnd = PacketPTPBase & {
    packetType: PacketType.DATA_END
}

export function decodeResponsePTP(data: Buffer): PacketPTPBase {
    let length = data.readUInt32LE()
    let packetType = data.readUInt32LE(4)
    data = data.slice(8, length)

    return { length, packetType, data }
}


export function createEventRequest(connectionNo: number) {
    let v = Buffer.allocUnsafe(4)
    v.writeUInt32LE(connectionNo)
    return createPTP(PacketType.INIT_EVT_REQ, v)
}

export function createInit(name: string, guid?: string | Buffer) {

    const SIZE_GUID = 16
    const SIZE_VERSION = 4

    name = name || getHostname() || "Remote"
    guid = (guid || machineIdSync()).slice(0, SIZE_GUID)
    if (typeof guid === 'string') guid.padStart(SIZE_GUID, '0')

    /**
     * Each hostname character is followed by a NUL character
     * After the last character+NUL, there are two more NUL characters
     */
    const SIZE_HOSTNAME = 2 * name.length + 2

    let result = Buffer.allocUnsafe(SIZE_GUID + SIZE_HOSTNAME + SIZE_VERSION)
    if (typeof guid === 'string') {
        result.write(guid)
    } else {
        (<Buffer>guid).copy(result)
    }

    for (let i = 0; i < name.length; i++) {
        result.write(name[i], SIZE_GUID + i * 2)
        result.writeUInt8(0, SIZE_GUID + i * 2 + 1)
    }

    result.writeUint16LE(0, SIZE_GUID + name.length * 2)

    result.set([0x00, 0x00, 0x01, 0x00], SIZE_GUID + SIZE_HOSTNAME)

    return createPTP(PacketType.INIT_CMD_REQ, result)
}

export enum ValueType {
    APERTURE = 0xd101,
    SHUTTER = 0xd102,
    ISO = 0xd103,
    EXPOSURE = 0xd104,
    WB_MODE = 0xd109,
    WB_CT = 0xd10a,
    WB_SHIFT_X = 0xd10b,
    WB_SHIFT_Y = 0xd10c,

    PICTURE_STYLE = 0xd110,

    AF_SERVO = 0xd179,
    AF_EYE = 0xd12c,
    AF_MODE = 0xd1ba,

    RECORD = 0xd1b8,

    NULL = 0x0000
}

type Value = {
    type: ValueType,
    value: any
}

type EventStateData = {
    values: { [type: number]: any }
    enums: Value[]
}

const nullBuffer = Buffer.from([0x8, 0, 0, 0, 0, 0, 0, 0])
function _extractValueData(data: Buffer) {
    console.log("Extract", data);
    // Assuming the values are all 16-bit 'thingies'
    let parts: { values: Value[], enums: Value[] } = { values: [], enums: [] }
    while (data.length > 0) {
        let length = data.readUint16LE(0);

        if (!(length == 0x8 && data.equals(nullBuffer))) {

            let type: ValueType = data.readUint16LE(8)

            let value = data.slice(12, length)
            if (value[0] == 0x03 && value.length > 4) {
                let enumLength = value.readUint16LE(4)
                value = value.slice(8)
                let enums = []

                while (value.length > 0) {
                    enums.push(value.readUint32LE(0))
                    value = value.slice(4)
                }

                if (enums.length != enumLength) {
                    console.warn(enums, "didn't match expected size of", enumLength)
                }

                parts.enums.push(<Value>{
                    type,
                    value: enums
                })

            } else {
                parts.values.push(<Value>{
                    type,
                    value: value.length == 4 ? value.readUInt32LE() : value
                })
            }
        }

        data = data.slice(length)
    }

    return parts
}

export function extractValueData(data: Buffer): EventStateData {
    let state = _extractValueData(data)

    let map: { [id in ValueType]?: number } = {}
    for (let value of state.values) {
        map[value.type] = value.value
    }

    return {
        values: map,
        enums: state.enums
    }
}
