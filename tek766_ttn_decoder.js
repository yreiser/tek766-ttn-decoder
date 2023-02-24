function decodeUplink(input) {
var data = {};
var offset = 0;

if (input.fPort == 16){
  data.ullage_cm = (input.bytes[4] << 8) + input.bytes[5];
  let temp = input.bytes[6];
  if (temp > 50){
    offset = 256;
    }
  data.temperature_C = -(offset-temp);
  data.src = input.bytes[7] >> 4;
  data.srssi = input.bytes[7] & 0xF;
  }

if (input.fPort == 48){
  data.ullage_cm = (input.bytes[14] << 8) + input.bytes[15];
  let temp=input.bytes[16];
  if (temp>50){
    offset=256;
    }
  data.temperature_C = -(offset-temp);
  data.firmware = input.bytes[4].toString() +"."+input.bytes[5].toString();
  let reasonBytes = input.bytes[6];
  let contactReason = reasonBytes & 0x3;
  switch(contactReason){
    case 0:
      data.contactReason = "Reset";
      break;
    case 1:
      data.contactReason = "Scheduled";
      break;
    case 2:
      data.contactReason = "Manual";
      break;
    case 3:
      data.contactReason = "Activation";
      break;
  }
  let lastReset = (reasonBytes >> 2) & 0x7;
    switch(lastReset){
    case 0:
      data.lastResetReason = "Power on";
      break;
    case 1:
      data.lastResetReason = "Brown out";
      break;
    case 2:
      data.lastResetReason = "External";
      break;
    case 3:
      data.lastResetReason = "Watchdog";
      break;
    case 4:
      data.lastResetReason = "M3 lockup";
      break;
    case 5:
      data.lastResetReason = "M3 system request";
      break;
    case 6:
      data.lastResetReason = "EM4";
      break;
    case 7:
      data.lastResetReason = "Backup mode";
      break;
   }
  data.activeStatus = (reasonBytes >> 5) & 0x1;
  data.battery_pct = input.bytes[10];
  data.txPeriod_h = input.bytes[13];
  data.sensorRSSI_dBm = -input.bytes[8];
  }
return {
data: data
};
}
