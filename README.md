# eos-ptp

Reverse engineered Canon EOS Wi-Fi remote control protocol on the EOS R

## Why

1. The EOS Utility only supports one device
2. digiCamControl is only for USB devices
3. The EOS SDK is hard to obtain in Oceania..
4. Learning experience, or something...

Realistically the wireless protocol is probably the same as the usual USB MTP/PTP protocol.  
I wonder if I could just wrap the PTP protocol in a TCP/IP packet, or emulate a USB device...  
It would also be super nice if I just grabbed the EOS SDK and wrote native extensions
