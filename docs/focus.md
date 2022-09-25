# Focus

## Movie Servo AF

Type: Data Packet

* Enable - `0c 00 00 00 79 d1 00 00 01 00 00 00`
* Disable - `0c 00 00 00 79 d1 00 00 00 00 00 00`

If `Movie Servo AF` is enabled, the device will continually track focus. If disabled, you can perform rack focusing (manual)

## Eye Detection

Type: Data Packet

* Enable - `0c 00 00 00 2c d1 00 00 01 00 00 00`
* Disable - `0c 00 00 00 2c d1 00 00 00 00 00 00`

## Mode

Type: Data Packet

* Face detection + Tracking AF - `0c 00 00 00 ba d1 00 00 02 00 00 00`
* 1-point AF - `0c 00 00 00 ba d1 00 00 01 00 00 00`

## Rack Focus

Sort of every 300ms?

### Left 1

```
Picture Transfer Protocol
    Length: 22
    Packet Type: Operation Request Packet (0x00000006)
    Data Phase Info: 0x00000001
    Operation Code: 0x9155
    Transaction ID: 0x000072a7
```

```
0000   58 d5 0a 13 a8 0b 00 15 17 d9 7c 5a 08 00 45 00
0010   00 3e 34 34 40 00 80 06 00 00 c0 a8 00 37 c0 a8
0020   00 2e 24 51 3d 7c c3 72 75 51 f7 42 a5 af 50 18
0030   f5 f2 81 e6 00 00 16 00 00 00 06 00 00 00 01 00
0040   00 00 55 91 a7 72 00 00 01 00 00 00
```

Data: `01 00 00 00`

### Left 2

Data: `02 00 00 00`

### Left 3

Data: `03 00 00 00`

### Right 1

Data: `01 80 00 00`

### Right 2

Data: `02 80 00 00`

### Right 3

Data: `03 80 00 00`

---

## Focus Zone

### Face Detect / Tracking AF

#### Somewhere top-left

```
Picture Transfer Protocol
    Length: 34
    Packet Type: Operation Request Packet (0x00000006)
    Data Phase Info: 0x00000001
    Operation Code: 0x915b
    Transaction ID: 0x00004485
```

```
0000   58 d5 0a 13 a8 0b 00 15 17 d9 7c 5a 08 00 45 00
0010   00 4a ff d2 40 00 80 06 00 00 c0 a8 00 37 c0 a8
0020   00 2e 2e 56 3d 7c b1 bb d2 91 d1 42 b2 2c 50 18
0030   f5 f2 81 f2 00 00 22 00 00 00 06 00 00 00 01 00
0040   00 00 5b 91 85 44 00 00 03 00 00 00 20 00 00 00
0050   64 01 00 00 00 00 00 00
```

Data: `03 00 00 00 20 00 00 00 64 01 00 00 00 00 00 00`

#### Somewhere top-right

Data: `03 00 00 00 18 1a 00 00 78 01 00 00 00 00 00 00`

#### Somewhere bottom-left

Data: `03 00 00 00 48 03 00 00 ed 0f 00 00 00 00 00 00`

#### Somewhere bottom-right

Data: `03 00 00 00 18 1a 00 00 d9 0f 00 00 00 00 00 00`

#### Somewhere centre

Data: `03 00 00 00 f8 0c 00 00 e0 08 00 00 00 00 00 00`

### 1-point AF

#### Capture 1 (top-left)

```
Picture Transfer Protocol
    Length: 26
    Packet Type: Operation Request Packet (0x00000006)
    Data Phase Info: 0x00000001
    Operation Code: 0x9159
    Transaction ID: 0x0000623a
```

```
0000   58 d5 0a 13 a8 0b 00 15 17 d9 7c 5a 08 00 45 00
0010   00 42 d3 60 40 00 80 06 00 00 c0 a8 00 37 c0 a8
0020   00 2e 24 51 3d 7c c3 70 c9 eb c9 56 54 09 50 18
0030   f5 f2 81 ea 00 00 1a 00 00 00 06 00 00 00 01 00
0040   00 00 59 91 3a 62 00 00 00 00 00 00 5e 01 00 00
```

Data: `00 00 00 00 5e 01 00 00`

#### Capture 2 (top-left move abit to the right)

Data: `2b 01 00 00 5e 01 00 00`

#### Capture 3 (top-right)

Data: `00 15 00 00 5e 01 00 00`

#### Capture 4 (top-left move abit down)

Data: `00 00 00 00 8b 01 00 00`

#### Capture 5 (bottom-left)

Data: `00 00 00 00 a2 0c 00 00`