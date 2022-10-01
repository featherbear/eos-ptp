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
    BUSY = 0x2019
}

export type PacketPTP = PacketOpResponse | PacketInitResponse | PacketInitFail

export type PacketPTPBase = {
    length: number
    packetType: PacketType
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
    transactionID: number
}

export type PacketInitFail = PacketPTPBase & {
    packetType: PacketType.INIT_FAIL
}


export function decodeResponsePTP(data: Buffer): PacketPTPBase {
    let length = data.readUInt32LE()
    let packetType = data.readUInt32LE(4)
    data = data.slice(8)

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