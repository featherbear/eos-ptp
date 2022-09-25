import { machineIdSync } from 'node-machine-id';
import { hostname as getHostname } from 'os'

export function createPTP(packet_type: number, data: Buffer) {
    /**
     * Length count is 4 bytes BED
     */
    const SIZE_LENGTH = 4
    const SIZE_PACKET_TYPE = 4
    let length = SIZE_LENGTH + SIZE_PACKET_TYPE + data.length

    let result = Buffer.allocUnsafe(length)
    result.writeUInt32LE(length)
    result.writeUInt32LE(packet_type, 4)

    data.copy(result, 8)

    return result
}

export function decodeInitResponse(data: Buffer) {
    let length = data.readUInt32LE()
    let packet_type = data.readUInt32LE(4)
    let connection_number = data.readUInt32LE(8)
    let guid = data.slice(12, 12 + 16).toString('hex')

    let hostnameBuffer = data.slice(12 + 16, -4)
    console.log(hostnameBuffer);
    let hostname = ""
    for (let i = 0; i < hostnameBuffer.length - 2; i++) {
        if (i % 2 == 1) continue
        hostname += String.fromCharCode(hostnameBuffer[i])
    }

    let version = data.slice(-4)

    return { length, packet_type, connection_number, guid, hostname, version }
}

export function decodeResponse(data: Buffer) {
    let length = data.readUInt32LE()
    let packet_type = data.readUInt32LE(4)
    data = data.slice(8)

    // if (packet_type == 0x9) {
        /* Start Data Packet */
        // let transaction_id = data.readUInt32LE(4)
        // FIXME: Bigint!
        // let data_length = data.readUInt64LE(8) 
        // data = data.slice(12)
    // }

    return { length, packet_type, data }
}


export function createEventRequest(connectionNo: number) {
    let v = Buffer.allocUnsafe(4)
    v.writeUInt32LE(connectionNo)
    return createPTP(0x00000003, v)
}

export function createInit(hostname: string, guid?: string | Buffer) {

    const SIZE_GUID = 16
    const SIZE_VERSION = 4

    hostname = hostname || getHostname() || "Remote"
    guid = (guid || machineIdSync()).slice(0, SIZE_GUID)
    if (typeof guid === 'string') guid.padStart(SIZE_GUID, '0')

    /**
     * Each hostname character is followed by a NUL character
     * After the last character+NUL, there are two more NUL characters
     */
    const SIZE_HOSTNAME = 2 * hostname.length + 2

    let result = Buffer.allocUnsafe(SIZE_GUID + SIZE_HOSTNAME + SIZE_VERSION)
    if (typeof guid === 'string') {
        result.write(guid)
    } else {
        (<Buffer>guid).copy(result)
    }

    for (let i = 0; i < hostname.length; i++) {
        result.write(hostname[i], SIZE_GUID + i * 2)
        result.writeUInt8(0, SIZE_GUID + i * 2 + 1)
    }

    result.writeUint16LE(0, SIZE_GUID + hostname.length * 2)

    result.set([0x00, 0x00, 0x01, 0x00], SIZE_GUID + SIZE_HOSTNAME)

    return createPTP(0x00000001, result)
}