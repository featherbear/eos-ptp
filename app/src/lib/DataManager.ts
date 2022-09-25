import type { Socket } from 'net'
import { createPTP } from './ptp'

export default class DataManager {
    #socket: Socket
    #counter: number
    constructor(s: Socket) {
        this.#socket = s
        this.#counter = 0
    }

    nextCounter() {
        let value = this.#counter++
        if (this.#counter == 4294967296) {
            this.#counter = 0
        }
        return value
    }

    /**
     * 
     * @param phase 4 bytes
     * @param opcode 2 bytes
     */
    _createOperationRequest(phase: number, opcode: number, transactionID?: number, extraData?: Buffer) {
        let data = Buffer.allocUnsafe(10 + (extraData ? extraData.length : 0))
        
        data.writeUInt32LE(phase, 0)
        data.writeUInt16LE(opcode, 4)
        data.writeUInt32LE(transactionID ?? this.nextCounter(), 6)
        
        if (extraData) {
            extraData.copy(data, 10)
        }

        return createPTP(0x00000006, data)
    }

    open_session() {
        let sessionID = Buffer.from([0x41, 0x00,0x00,0x00])
        this.send(this._createOperationRequest(0x01, 0x1002, 0, sessionID))
    }

    do_record() {
        this.send(this._createOperationRequest(0x01, 0x9116))
        // wait for resp (0x07, opcode 0x2001 OK, transaction ID)
    }

    send(data: Buffer) {
        this.#socket.write(data)
    }

}