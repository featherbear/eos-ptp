# Miscellaneous

## Wireshark Filter

`(eth.src == 58:d5:0a:13:a8:0b || eth.dst == 58:d5:0a:13:a8:0b) && (ip.dst == 192.168.0.46 || ip.src == 192.168.0.46 ) && !(tcp.len == 0)`
<!-- 
## Shutter

### Half Press

* Picture Transfer Protocol
    * Length: 26
    * Packet Type: Operation Request Packet (0x00000006)
    * Data Phase Info: 0x00000001
    * Operation Code: 0x9128
    * Transaction ID: 0x00005c56

```
0000   1a 00 00 00 06 00 00 00 01 00 00 00 28 91 56 5c
0010   00 00 01 00 00 00 01 00 00 00
```

### Release

* Picture Transfer Protocol
    * Length: 22
    * Packet Type: Operation Request Packet (0x00000006)
    * Data Phase Info: 0x00000001
    * Operation Code: 0x9129
    * Transaction ID: 0x00005c5e

```
0000   16 00 00 00 06 00 00 00 01 00 00 00 29 91 5e 5c
0010   00 00 01 00 00 00
``` -->

## Keep-Alive?

