# Miscellaneous

## Wireshark Filter

* `(eth.src == 58:d5:0a:13:a8:0b || eth.dst == 58:d5:0a:13:a8:0b) && (ip.dst == 192.168.0.46 || ip.src == 192.168.0.46 ) && !(tcp.len == 0)`
* `((((eth.dst == 58:d5:0a:13:a8:0b) && (ip.dst == 192.168.0.46 || ip.src == 192.168.0.46 ) && !(tcp.len == 0)) && !http) && !(tcp.len==18))&&  !(tcp.len==30)`

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

## Get Device Info

```
Picture Transfer Protocol
    Length: 18
    Packet Type: Operation Request Packet (0x00000006)
    Data Phase Info: 0x00000001
    Operation Code: 0x1001
    Transaction ID: 0x00000000
```

```
0000   12 00 00 00 06 00 00 00 01 00 00 00 01 10 00 00
0010   00 00
```


## Keep-Alive?
```
Picture Transfer Protocol
    Length: 18
    Packet Type: Operation Request Packet (0x00000006)
    Data Phase Info: 0x00000001
    Operation Code: 0x902f
    Transaction ID: 0x00000e60
```

```
0000   12 00 00 00 06 00 00 00 01 00 00 00 2f 90 60 0e
0010   00 00

```

## Payloads

> From observation

e.g. Command to set ISO to 100

`0c 00 00 00 03 d1 00 00 48 00 00 00`

* First two bytes is the length (LE) of the payload (including the length bytes)
* Next two bytes are NUL
* Next two bytes are the command (LE)
* Next two bytes are NUL
* Next two bytes are the argument (LE)
* Next two bytes are NUL

---

## Serial Number

```
Picture Transfer Protocol
    Length: 22
    Packet Type: Operation Request Packet (0x00000006)
    Data Phase Info: 0x00000001
    Operation Code: 0x9127
    Transaction ID: 0x00000014
```

```
0000   16 00 00 00 06 00 00 00 01 00 00 00 27 91 14 00
0010   00 00 af d1 00 00
```


---

## Happens right before Remote Shooting is clicked on in EOS Utility

```
0x9127: PTP_OC_CANON_RequestDevicePropvalue

Sets the value for the next 0x9116: PTP_OC_CANON_GetEvent
```

```
Picture Transfer Protocol
    Length: 22
    Packet Type: Operation Request Packet (0x00000006)
    Data Phase Info: 0x00000001
    Operation Code: 0x9127
    Transaction ID: 0x000000fd
```

```
0000   16 00 00 00 06 00 00 00 01 00 00 00 27 91 fd 00
0010   00 00 70 d1 00 00
```
...?



`d1 72` -> Gets camera style profiles?

---




```
0000   18 00 00 00 0c 00 00 00 07 01 00 00 0c 00 00 00
0010   1c d1 00 00 04 00 00 00

```

---

> https://www.magiclantern.fm/forum/index.php?topic=22770.msg237655#msg237655

```
0x1001: GetDeviceInfo
0x1002: OpenSession
0x1003: CloseSession
0x1004: GetStorageIDs
0x1005: GetStorageInfo
0x1006: GetNumObjects
0x1007: GetObjectHandles
0x1008: GetObjectInfo
0x1009: GetObject
0x100a: GetThumb
0x100b: DeleteObject
0x100c: SendObjectInfo
0x100d: SendObject
0x100f: FormatStore
0x1014: GetDevicePropDesc
0x1016: SetDevicePropValue
0x101b: GetPartialObject
0x902f: UNKNOWN
0x9033: UNKNOWN
0x9050: PTP_OC_CANON_InitiateEventProc0
0x9051: PTP_OC_CANON_TerminateEventProc_051
0x905c: PTP_OC_CANON_InitiateEventProc1
0x905d: PTP_OC_CANON_TerminateEventProc_05D
0x9060: PTP_OC_CANON_IsNeoKabotanProcMode
0x9068: PTP_OC_CANON_GetWebServiceSpec
0x9069: PTP_OC_CANON_GetWebServiceData
0x906a: PTP_OC_CANON_SetWebServiceData
0x906b: PTP_OC_CANON_DeleteWebServiceData
0x906c: PTP_OC_CANON_GetRootCertificateSpec
0x906d: PTP_OC_CANON_GetRootCertificateData
0x906e: PTP_OC_CANON_SetRootCertificateData
0x906f: PTP_OC_CANON_DeleteRootCertificateData
0x9077: PTP_OC_CANON_GetTranscodeApproxSize
0x9078: PTP_OC_CANON_RequestTranscodeStart
0x9079: PTP_OC_CANON_RequestTranscodeCancel
0x9101: PTP_OC_CANON_GetStorageIDS
0x9102: PTP_OC_CANON_GetStorageInfo
0x9103: PTP_OC_CANON_GetObjectInfo
0x9104: PTP_OC_CANON_GetObject
0x9105: PTP_OC_CANON_DeleteObject
0x9106: PTP_OC_CANON_FormatStore
0x9107: PTP_OC_CANON_GetPartialObject
0x9108: PTP_OC_CANON_GetDeviceInfoEX
0x9109: PTP_OC_CANON_GetObjectInfoEX
0x910a: PTP_OC_CANON_GetThumbEX
0x910c: PTP_OC_CANON_SetObjectAttributes
0x910f: PTP_OC_CANON_Remote_Release
0x9110: PTP_OC_CANON_SetDevicePropvalueEX
0x9114: PTP_OC_CANON_SetRemoteMode
0x9115: PTP_OC_CANON_SetEventMode
0x9116: PTP_OC_CANON_GetEvent
0x9117: PTP_OC_CANON_TransferComplete
0x9118: PTP_OC_CANON_CancelTransfer
0x911a: PTP_OC_CANON_PCHDDCapacity
0x911b: PTP_OC_CANON_SetUILock
0x911c: PTP_OC_CANON_ResetUILock
0x911d: PTP_OC_CANON_KeepDeviceON
0x911e: PTP_OC_CANON_SetNullPacketMode
0x911f: PTP_OC_CANON_UpdateFirmware
0x9122: PTP_OC_CANON_SetWFTPROFILE
0x9123: PTP_OC_CANON_GetWFTPROFILE
0x9124: PTP_OC_CANON_SetPROFILETOWFT
0x9127: PTP_OC_CANON_RequestDevicePropvalue
0x9128: PTP_OC_CANON_RemoteReleaseON
0x9129: PTP_OC_CANON_RemoteReleaseOFF
0x912b: PTP_OC_CANON_ChangePhotoStudioMode
0x912c: PTP_OC_CANON_GetPartialObjectEX
0x912d: PTP_OC_CANON_ReSizeImageData
0x912e: PTP_OC_CANON_GetReSizeData
0x912f: PTP_OC_CANON_ReleaseReSizeData
0x9130: PTP_OC_CANON_ResetMirrorLockupState
0x9131: PTP_OC_CANON_PopupBuiltinFlash
0x9132: PTP_OC_CANON_EndGetPartialObjectEX
0x9133: PTP_OC_CANON_MovieSelectSWOn
0x9134: PTP_OC_CANON_MovieSelectSWOff
0x9135: PTP_OC_CANON_GetCtgInfo
0x9136: PTP_OC_CANON_GetLensAdjust
0x9137: PTP_OC_CANON_SetLensAdjust
0x9138: PTP_OC_CANON_GetMusicInfo
0x9139: PTP_OC_CANON_CreateHandle
0x913a: PTP_OC_CANON_SendPartialObjectEx
0x913b: PTP_OC_CANON_EndSendPartialObjectEx
0x913c: PTP_OC_CANON_SetCtgInfo
0x913d: PTP_OC_CANON_SetRequestOlcInfoGroup
0x913e: PTP_OC_CANON_SetRequestRollingPitching
0x913f: PTP_OC_CANON_GetCameraSupport
0x9140: PTP_OC_CANON_SetRating
0x9141: PTP_OC_CANON_RequestDevelopStart
0x9143: PTP_OC_CANON_RequestDevelopEnd
0x9144: PTP_OC_CANON_GetGpsLoggingData
0x9145: PTP_OC_CANON_GetGpsLogCurrentHandle
0x9146: PTP_OC_CANON_SetImageRecoveryData
0x9147: PTP_OC_CANON_GetImageRecoveryList
0x9148: PTP_OC_CANON_FormatRecoveryData
0x9149: PTP_OC_CANON_GetPresetLensAdjustParam
0x914a: PTP_OC_CANON_GetRawDispImage
0x914b: PTP_OC_CANON_SaveImageRecoveryData
0x914c: PTP_OC_CANON_BLERequest
0x914d: PTP_OC_CANON_DrivePowerZoom
0x914e: PTP_OC_CANON_SendTimeSyncMessage
0x914f: PTP_OC_CANON_GetIptcData
0x9150: PTP_OC_CANON_SetIptcData
0x9153: PTP_OC_CANON_GetViewfinderData
0x9154: PTP_OC_CANON_DoAF
0x9155: PTP_OC_CANON_DriveLens
0x9157: PTP_OC_CANON_ClickWB
0x9158: PTP_OC_CANON_Zoom
0x9159: PTP_OC_CANON_ZoomPosition
0x915a: PTP_OC_CANON_SetLiveAFFrame
0x915b: PTP_OC_CANON_TouchAfPosition
0x915c: PTP_OC_CANON_SetLvPcFlavoreditMode
0x915d: PTP_OC_CANON_SetLvPcFlavoreditParam
0x9160: PTP_OC_CANON_AFCancel
0x916b: PTP_OC_CANON_SetImageRecoveryDataEx
0x916c: PTP_OC_CANON_GetImageRecoveryListEx
0x916d: PTP_OC_CANON_CompleteAutoSendImages
0x916e: PTP_OC_CANON_NotifyAutoTransferStatus
0x916f: PTP_OC_CANON_GetReducedObject
0x9170: PTP_OC_CANON_GetObjectInfo64
0x9171: PTP_OC_CANON_GetObject64
0x9172: PTP_OC_CANON_GetPartialObject64
0x9173: PTP_OC_CANON_GetObjectInfoEx64
0x9174: PTP_OC_CANON_GetPartialObjectEx64
0x9177: PTP_OC_CANON_NotifySaveComplete
0x9178: PTP_OC_CANON_GetTranscodedBlock
0x9179: PTP_OC_CANON_TransferCompleteTranscodedBlock
0x9180: UNKNOWN
0x9181: UNKNOWN
0x9182: PTP_OC_CANON_NotifyEstimateNumberofImport
0x9183: PTP_OC_CANON_NotifyNumberofImported
0x9184: PTP_OC_CANON_NotifySizeOfPartialDataTransfer
0x9185: PTP_OC_CANON_NotifyFinish
0x91ae: UNKNOWN
0x91af: UNKNOWN
0x91b9: PTP_OC_CANON_SetFELock
0x91d3: UNKNOWN
0x91d4: PTP_OC_CANON_SendCertData
0x91d5: UNKNOWN
0x91d7: PTP_OC_CANON_DistinctionRTC
0x91d8: PTP_OC_CANON_NotifyGpsTimeSyncStatus
0x91d9: UNKNOWN
0x91da: UNKNOWN
0x91db: UNKNOWN
0x91dc: UNKNOWN
0x91dd: UNKNOWN
0x91de: UNKNOWN
0x91df: PTP_OC_CANON_GetAdapterFirmData
0x91e1: UNKNOWN
0x91e2: UNKNOWN
0x91e3: PTP_OC_CANON_ceresSEndScanningResult
0x91e4: PTP_OC_CANON_ceresSEndHostInfo
0x91e6: PTP_OC_CANON_NotifyAdapterStatus
0x91e7: UNKNOWN
0x91e8: PTP_OC_CANON_ceresNotifyNetworkError
0x91e9: PTP_OC_CANON_AdapterTransferProgress
0x91ea: PTP_OC_CANON_ceresRequestAdapterProperty
0x91eb: UNKNOWN
0x91ec: PTP_OC_CANON_ceresSEndWpsPinCode
0x91ed: PTP_OC_CANON_ceresSEndWizardInfo
0x91ee: UNKNOWN
0x91ef: PTP_OC_CANON_ceresSEndBtSearchResult
0x91f0: PTP_OC_CANON_TransferComplete2
0x91f1: PTP_OC_CANON_CancelTransfer2
0x91f2: PTP_OC_CANON_ceresGetUpdateFileData
0x91f3: PTP_OC_CANON_NotifyUpdateProgress
0x91f4: UNKNOWN
0x91f5: PTP_OC_CANON_ceresSEndFactoryProperty
0x91f6: UNKNOWN
0x91f8: PTP_OC_CANON_ceresSEndBtPairingResult
0x91f9: PTP_OC_CANON_ceresNotifyBtStatus
0x91fb: UNKNOWN
0x91fc: PTP_OC_CANON_SendTimeSyncInfo
0x91fd: PTP_OC_CANON_SetAdapterBatteryReport
0x91fe: PTP_OC_CANON_fapiMessageTX
0x91ff: PTP_OC_CANON_fapiMessageRX
```