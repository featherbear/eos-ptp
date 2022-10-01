import { Socket } from 'net'
import { createEventRequest, createInit, createPTP, decodeResponsePTP, extractValueData, OpCode, PacketOpResponse, PacketPTP, PacketPTPBase, PacketType } from './ptp'
import ISO from './iso'
import Queue, { QueueWorker } from 'queue'
import { EventEmitter } from 'events'

type ConnectionDetails = {
    deviceHost: string
    clientName: string
    clientGuid?: string | Buffer
}
type DataCallback = (data?: any) => void
type TransactionTask = (transactionID: number) => any

type TransactionID = number
export default class DataManager extends EventEmitter {
    #socket: Socket

    #transactionCounter: TransactionID
    #lastReceivedTransactionID: TransactionID

    #PTPsendQueue: Queue
    #PTPcallbackMap: {
        [id: TransactionID]: DataCallback
    }
    readonly CAMERA_PORT = 15740
    readonly RETRY_BACKOFF_MS = 250
    readonly STATUS_REFRESH_RATE_MS = 200

    #connectionDetails: ConnectionDetails

    #receiveBuffer: Buffer

    #recvDataBuffer!: Buffer
    #recvDataRemain!: number
    #recvDataFor!: TransactionID

    #__resetDataReceive() {
        this.#recvDataBuffer = Buffer.allocUnsafe(0)
        this.#recvDataRemain = 0
        this.#recvDataFor = -1
    }

    #nextBytes(n: number) {
        let res = this.#receiveBuffer.slice(0, n)
        this.#receiveBuffer = this.#receiveBuffer.slice(res.length)
        return res
    }

    constructor(options: ConnectionDetails) {
        super()

        this.#connectionDetails = options

        this.#socket = new Socket()
        this.#socket.setNoDelay(true)

        this.#transactionCounter = 0
        this.#lastReceivedTransactionID = -1

        this.#PTPcallbackMap = {}
        this.#PTPsendQueue = new Queue({
            autostart: true,
            concurrency: 1
        })

        this.#receiveBuffer = Buffer.allocUnsafe(0)
        this.#__resetDataReceive();

        this.#socket.on('data', (bytes) => {
            this.emit('raw', bytes)

            this.#receiveBuffer = Buffer.concat([this.#receiveBuffer, bytes])

            while (true) {
                while (this.#recvDataRemain && this.#receiveBuffer.length > 0) {
                    let incomingData = this.#nextBytes(this.#recvDataRemain)

                    this.#recvDataBuffer = Buffer.concat([this.#recvDataBuffer, incomingData])
                    this.#recvDataRemain -= incomingData.length
                }

                if (this.#receiveBuffer.length < 8) break

                let packet = <PacketPTP>decodeResponsePTP(this.#receiveBuffer)
                this.#receiveBuffer = this.#receiveBuffer.slice(packet.length)

                switch (packet.packetType) {

                    case PacketType.DATA_START: {
                        packet.transactionID = packet.data.readUint32LE(0)
                        // TODO: 64-bit data length
                        packet.dataLen = packet.data.readUInt32LE(4)

                        // Packet length doesn't match the 
                        packet.extraData = this.#nextBytes(12)

                        this.#__resetDataReceive()

                        this.#recvDataFor = packet.transactionID
                        this.#recvDataRemain = packet.dataLen

                        break;
                    }

                    case PacketType.DATA_END: {
                        console.log('DATA_END');
                        break
                    }

                    case PacketType.OP_RESPONSE: {
                        packet.opcode = packet.data.readUint16LE(0)
                        packet.transactionID = packet.data.readUint32LE(2)

                        if (this.#recvDataFor == packet.transactionID) {
                            packet.buffer = Buffer.from(this.#recvDataBuffer)
                            this.#__resetDataReceive();
                        }
                        break;
                    }

                    case PacketType.INIT_CMD_ACK: {
                        packet.connectionNumber = packet.data.readUint32LE(0)
                        packet.guid = packet.data.slice(4, 4 + 16).toString('hex')

                        let hostnameBuffer = packet.data.slice(4 + 16, -4)
                        let hostname = ""
                        for (let i = 0; i < hostnameBuffer.length - 2; i++) {
                            if (i % 2 == 1) continue
                            hostname += String.fromCharCode(hostnameBuffer[i])
                        }

                        packet.hostname = hostname
                        packet.version = packet.data.slice(-4)

                        break;
                    }

                    case PacketType.INIT_FAIL: {
                        break;
                    }

                    default: {
                        console.warn("Received unknown packet type", packet)
                    }
                }

                {
                    let tID = (packet as PacketOpResponse).transactionID
                    if (tID !== undefined) {
                        if (tID < this.#lastReceivedTransactionID) {
                            console.warn("Received packet has a transaction ID earlier than expected")
                        }
                        this.#lastReceivedTransactionID = tID
                    }
                }

                this.emit(packet.packetType.toString(), packet)
                this.emit('data', packet)
            }
        })

        this.on(PacketType.OP_RESPONSE.toString(), (data: PacketOpResponse) => {
            let cb: DataCallback
            if ((cb = this.#PTPcallbackMap[data.transactionID])) {
                delete this.#PTPcallbackMap[data.transactionID]
                cb(data)
            } else {
                console.warn("Didn't find an existing callback for transaction", data.transactionID)
            }

        })

    }

    connect(deviceHost?: string, clientName?: string, clientGuid?: string | Buffer): Promise<void> {
        return new Promise((resolve, reject) => {
            this.#socket.connect(this.CAMERA_PORT, deviceHost || this.#connectionDetails.deviceHost, () => {
                this.#socket.write(createInit(clientName || this.#connectionDetails.clientName, clientGuid || this.#connectionDetails.clientGuid))

                this.once('data', (packet: PacketPTP) => {
                    if (packet.packetType == PacketType.INIT_FAIL) {
                        throw new Error("Camera rejected connection request")
                    }

                    if (packet.packetType != PacketType.INIT_CMD_ACK) {
                        throw new Error("Unexpected response to connection request")
                    }

                    // TODO: Investigate what else this socket does
                    let evtSocket = new Socket()
                    evtSocket.connect(this.CAMERA_PORT, deviceHost || this.#connectionDetails.deviceHost, () => {
                        evtSocket.write(createEventRequest(packet.connectionNumber))

                        evtSocket.once('data', async (data) => {
                            let decoded = decodeResponsePTP(data)
                            if (decoded.packetType != PacketType.INIT_EVT_ACK) {
                                throw new Error("Unexpected response to connection request")
                            }

                            // GetDeviceInfo
                            await this.#__pushTransaction(transactionID => {
                                this.send(this._createOperationRequest(0x1, OpCode.GetDeviceInfo, transactionID))
                            }, 0)

                            // OpenSession
                            await this.#__pushTransaction((transactionID) => {
                                this.send(this._createOperationRequest(0x01, OpCode.OpenSession, transactionID, Buffer.from([0x41, 0x00, 0x00, 0x00])))
                            }, 0)

                            // 0x9114: PTP_OC_CANON_SetRemoteMode
                            await this._withTransaction((transactionID) => {
                                // Transaction 1 had this value to 0x05
                                // this.send(this._createOperationRequest(0x01, 0x9114, transactionID, Buffer.from([0x05, 0x00, 0x00, 0x00])))

                                this.send(this._createOperationRequest(0x01, 0x9114, transactionID, Buffer.from([0x02, 0x00, 0x00, 0x00])))
                            })

                            // 0x9115: PTP_OC_CANON_SetEventMode
                            await this._withTransaction((transactionID) => {
                                this.send(this._createOperationRequest(0x01, 0x9115, transactionID, Buffer.from([0x01, 0x00, 0x00, 0x00])))
                            })

                            // Gets a whole bunch of data
                            // 0x9116: PTP_OC_CANON_GetEvent
                            let state = await this._withTransaction<PacketOpResponse>((transactionID) => {
                                this.send(this._createOperationRequest(0x01, 0x9116, transactionID, Buffer.from([0x03, 0x00, 0x00, 0x00])))
                            })
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
                                    setTimeout(() => stateLoop(), this.STATUS_REFRESH_RATE_MS)
                                })
                            }
                            stateLoop()

                            resolve(undefined)
                            console.log('after resolve?');
                            this.emit('state', extractValueData(state.buffer!))
                        })
                    })
                })
            })
        })
    }

    async getDeviceState() {
        let packet = await this._withTransaction<PacketOpResponse>((transactionID) => {
            this.send(this._createOperationRequest(0x1, 0x9116, transactionID))
        })

        let data = extractValueData(packet.buffer!)
        this.emit('state', data)
        return data
    }

    nextCounter() {
        let value = ++this.#transactionCounter
        if (this.#transactionCounter == 4294967296) {
            this.#transactionCounter = 0
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

        return createPTP(PacketType.OP_REQUEST, data)
    }


    _createStartDataPacket(dataLen: number /* TODO: 64-bit */, transactionID?: number, data?: Buffer) {
        let payload = Buffer.alloc(4 + 8 + (data ? data.length : 0))

        payload.writeUInt32LE(transactionID ?? this.nextCounter(), 0)
        payload.writeUInt32LE(dataLen, 4)

        if (data) {
            data.copy(payload, 12)
        }

        return createPTP(PacketType.DATA_START, payload)
    }

    _createEndDataPacket(transactionID?: number, data?: Buffer) {
        let payload = Buffer.allocUnsafe(4 + (data ? data.length : 0))
        payload.writeUInt32LE(transactionID ?? this.nextCounter(), 0)
        if (data) {
            data.copy(payload, 4)
        }

        return createPTP(PacketType.DATA_END, payload)
    }


    do_set_ISO(iso: ISO) {
        return this._withTransaction<PacketOpResponse>((transactionID) => {
            console.log('Execute ISO SET', iso);
            this.send(this._createOperationRequest(0x2, 0x9110, transactionID))

            let b = Buffer.from([0x0c, 0x00, 0x00, 0x00, 0x03, 0xd1, 0x00, 0x00, iso, 0x00, 0x00, 0x00])

            this.send(this._createStartDataPacket(b.length, transactionID))
            this.send(this._createEndDataPacket(transactionID, b))
        })

    }

    do_record_start() {
        return this._withTransaction<PacketOpResponse>((transactionID) => {
            console.log('Record start', transactionID);
            this.send(this._createOperationRequest(0x2, 0x9110, transactionID))

            let b = Buffer.from([0x0c, 0x00, 0x00, 0x00, 0xb8, 0xd1, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00])

            this.send(this._createStartDataPacket(b.length, transactionID))
            this.send(this._createEndDataPacket(transactionID, b))
        })
    }

    do_record_stop() {
        return this._withTransaction<PacketOpResponse>((transactionID) => {
            console.log('Record stop', transactionID);
            this.send(this._createOperationRequest(0x2, 0x9110, transactionID))

            let b = Buffer.from([0x0c, 0x00, 0x00, 0x00, 0xb8, 0xd1, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])

            this.send(this._createStartDataPacket(b.length, transactionID))
            this.send(this._createEndDataPacket(transactionID, b))
        })
    }



    send(data: Buffer) {
        this.#socket.write(data)
    }


    async _withTransaction<T extends PacketPTP>(fn: TransactionTask) {
        let transactionID = this.nextCounter()
        return this.#__pushTransaction<T>(fn, transactionID)
    }

    async #__pushTransaction<T extends PacketPTP>(fn: TransactionTask, transactionID: number): Promise<T> {
        return new Promise<T>((resolveOuter, reject) => {
            let retryCount = 0;

            let worker: QueueWorker = () =>
                new Promise(async (resolveInner, reject) => {
                    // console.debug(`Worker started for #${transactionID} (retry = ${retryCount})`);
                    setTimeout(async () => {
                        this.#PTPcallbackMap[transactionID] = (data: T) => {

                            let shouldRetry = data.packetType == PacketType.OP_RESPONSE && data.opcode == OpCode.BUSY

                            if (shouldRetry) {
                                retryCount++
                                // console.debug('Going to retry', retryCount);
                                this.#PTPsendQueue.unshift(worker)
                            }

                            resolveInner(data)
                            if (!shouldRetry) resolveOuter(data)
                        }

                        await fn(transactionID)
                    }, retryCount * this.RETRY_BACKOFF_MS)

                })

            this.#PTPsendQueue.push(worker)
        })
    }
}