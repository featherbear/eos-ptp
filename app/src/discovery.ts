// TODO: SSDP is more frequenct

import mdns from 'multicast-dns'

let MDNS = mdns({
    multicast: true,
    reuseAddr: true
})


const targetSuffix = '._ptp._tcp.local'
let txtMap = {
    'mn.canon.com': 'model',
    'myhwa.canon.com': 'mac',
    'snum.canon.com': 'serial',
    'nicname.canon.com': 'nickname'
} as const

let cache: { [host: string]: { data: { [s in (typeof txtMap)[keyof typeof txtMap]]: string }, srv: { host: string, port: number } } } = {}

MDNS.on('response', function (r) {
    for (let answer of r.answers) {
        if (answer.name.endsWith(targetSuffix)) {
            let host = answer.name.slice(0, answer.name.lastIndexOf(targetSuffix))

            if (answer.type === 'TXT') {
                let data: typeof cache[string]['data'] = <any>{};

                for (let B of answer.data) {
                    B = B.toString()
                    let idx = B.indexOf('=')
                    let key = B.slice(0, idx)
                    let value = B.slice(idx + 1)

                    if (txtMap[key]) {
                        data[txtMap[key]] = value
                    }

                }

                cache[host] = { ...(cache[host] ?? {}), data }
            } else if (answer.type === 'SRV') {
                cache[host] = { ...(cache[host] ?? {}), srv: { host: answer.data.target, port: answer.data.port } }
            }

            if (cache[host].data && cache[host].srv) {
                console.log(cache[host])
            }
        }
    }
})

console.log('Listening');