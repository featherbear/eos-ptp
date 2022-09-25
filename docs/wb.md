# White Balance

## Modes

Type: Data Packet

|Mode|Bytes|
|:---|:---|
|Auto: Ambience Priority|`0c 00 00 00 09 d1 00 00 00 00 00 00`|
|Auto: White Priority|`0c 00 00 00 09 d1 00 00 17 00 00 00`|
|Daylight (~5200K)|`0c 00 00 00 09 d1 00 00 01 00 00 00`|
|Shade (~7000K)|`0c 00 00 00 09 d1 00 00 08 00 00 00`|
|Cloudy (~6000K)|`0c 00 00 00 09 d1 00 00 02 00 00 00`|
|Tungsten (~3200K)|`0c 00 00 00 09 d1 00 00 03 00 00 00`|
|White Fluorescent (~4000K)|`0c 00 00 00 09 d1 00 00 04 00 00 00`|
|Flash|`0c 00 00 00 09 d1 00 00 05 00 00 00`|
|Custom / Reference Image|`0c 00 00 00 09 d1 00 00 06 00 00 00`|
|Color Temp|`0c 00 00 00 09 d1 00 00 09 00 00 00`|

## Color Temperature

Type: Data Packet

|Temperature (K)|Bytes|
|:---:|:---|
|2500|`0c 00 00 00 0a d1 00 00 c4 09 00 00`|
|2600|`0c 00 00 00 0a d1 00 00 28 0a 00 00`|
|...|...uint16 LE|
|10000|`0c 00 00 00 0a d1 00 00 10 27 00 00`|
