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
    readonly STATUS_REFRESH_RATE_MS = 500

    #connectionDetails: ConnectionDetails

    #recvBytesBuffer!: Buffer
    #recvBytesRemain!: number
    #recvBytesFor!: TransactionID

    #__resetRecvBuffer() {
        this.#recvBytesRemain = 0
        this.#recvBytesBuffer = Buffer.allocUnsafe(0)
        this.#recvBytesFor = -1
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

        this.#__resetRecvBuffer();

        this.#socket.on('data', (bytes) => {
            // Parse data, check if 
            this.emit('raw', bytes)

            console.log('RECEIVE', bytes);

            while (this.#recvBytesRemain && bytes.length) {
                let incomingData = bytes.slice(0, this.#recvBytesRemain)
                bytes = bytes.slice(this.#recvBytesRemain)

                console.log(`${this.#recvBytesRemain} bytes remaining, ${incomingData.length} incoming, ${incomingData.length + bytes.length} bytes total`);

                this.#recvBytesBuffer = Buffer.concat([this.#recvBytesBuffer, incomingData])
                this.#recvBytesRemain -= incomingData.length
            }
            if (!bytes.length) return

            let packet = <PacketPTP>decodeResponsePTP(bytes)
            switch (packet.packetType) {

                case PacketType.DATA_START: {
                    packet.transactionID = packet.data.readUint32LE(0)
                    // TODO: 64-bit data length
                    packet.dataLen = packet.data.readUInt32LE(4)
                    packet.extraData = packet.data.slice(12)

                    this.#__resetRecvBuffer()

                    console.log(`Going to wait for ${packet.dataLen} bytes for transaction #${packet.transactionID}`);
                    this.#recvBytesFor = packet.transactionID

                    // Sometimes, the data start and payload packets are received as one
                    let surplusData = packet.extraData.slice(12)
                    this.#recvBytesBuffer = surplusData
                    this.#recvBytesRemain = packet.dataLen -= surplusData.length
                    break;
                }

                case PacketType.DATA_END: {
                    console.log('DATA_END');
                    break
                }

                case PacketType.OP_RESPONSE: {
                    packet.opcode = packet.data.readUint16LE(0)
                    packet.transactionID = packet.data.readUint32LE(2)

                    if (this.#recvBytesFor == packet.transactionID) {
                        console.log('ADD BUFFER TO RESP');
                        packet.buffer = Buffer.from(this.#recvBytesBuffer)
                        this.#__resetRecvBuffer();
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

                            await this.#__pushTransaction((transactionID) => {
                                // TODO: Session ID changes?
                                let sessionID = Buffer.from([0x41, 0x00, 0x00, 0x00])
                                this.send(this._createOperationRequest(0x01, 0x1002, transactionID, sessionID))
                            }, 0)



                            // TODO: Keep the data state stored somewhere?
                            let stateLoop = () => {
                                this.getDeviceState().finally(() => {
                                    setTimeout(() => stateLoop(), this.STATUS_REFRESH_RATE_MS)
                                })
                            }
                            stateLoop()

                            resolve(undefined)
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
        let value = this.#transactionCounter++
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
                    console.log(`Worker started for #${transactionID} (retry = ${retryCount})`);
                    setTimeout(async () => {
                        this.#PTPcallbackMap[transactionID] = (data: T) => {

                            let shouldRetry = data.packetType == PacketType.OP_RESPONSE && data.opcode == OpCode.BUSY

                            if (shouldRetry) {
                                retryCount++
                                console.log('Going to retry', retryCount);
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