function decodeUplink(input) {

offset = 0;

// --- measurement payload ---
if (input.fPort == 16){ 
  let ullage = (input.bytes[4] << 8) + input.bytes[5];
  let temp = input.bytes[6];
  if (temp > 50){
    offset = 256;
    }
  let temperature = -(offset-temp);
  let src = input.bytes[7] >> 4;
  let srssi = input.bytes[7] & 0xF;
  
  return {
      data: {
        ullage_cm: ullage,
        temp_C: temperature,
        src: src,
        srssi: srssi,
      }
    };
  }


// --- status payload ---
else if (input.fPort == 48){
  let ullage = (input.bytes[14] << 8) + input.bytes[15];
  let temp=input.bytes[16];
  if (temp>50){
    offset=256;
    }
  let temperature = -(offset-temp);
  let hardware = input.bytes[3];
  let firmware = input.bytes[4].toString() +"."+input.bytes[5].toString();
  let reasonBytes = input.bytes[6];
  let contactReason = reasonBytes & 0x3;
  var contactReasonMsg = "";
  switch(contactReason){
    case 0:
      contactReasonMsg = "Reset";
      break;
    case 1:
      contactReasonMsg = "Scheduled";
      break;
    case 2:
      contactReasonMsg = "Manual";
      break;
    case 3:
      contactReasonMsg = "Activation";
      break;
  }
  let lastReset = (reasonBytes >> 2) & 0x7;
  var lasetResetMsg = "";
    switch(lastReset){
    case 0:
      lasetResetMsg = "Power on";
      break;
    case 1:
      lasetResetMsg = "Brown out";
      break;
    case 2:
      lasetResetMsg = "External";
      break;
    case 3:
      lasetResetMsg = "Watchdog";
      break;
    case 4:
      lasetResetMsg = "M3 lockup";
      break;
    case 5:
      lasetResetMsg = "M3 system request";
      break;
    case 6:
      lasetResetMsg = "EM4";
      break;
    case 7:
      lasetResetMsg = "Backup mode";
      break;
   }
  let activeStatus = (reasonBytes >> 5) & 0x1;
  let battery = input.bytes[10];
  let txPeriod = input.bytes[13];
  let sensorRSSI = -input.bytes[8];
  
  return {
      data: {
        ullage_cm: ullage,
        temp_C: temperature,
        firmware: firmware,
        contactReason: contactReasonMsg,
        lastReset: lasetResetMsg,
        active: activeStatus,
        bat_pct: battery,
        txPeriod_h: txPeriod,
        sensorRSSI_dBm: sensorRSSI,
        hw_id: hardware
        }
    };
  }
}
