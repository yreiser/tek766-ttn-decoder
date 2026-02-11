function decodeUplink(input) {

  let offset = 0;

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
    let temp = input.bytes[16];
    if (temp > 50){
      offset = 256;
    }
    let temperature = -(offset-temp);
    let hardware = input.bytes[3];
    let firmware = input.bytes[4].toString() +"."+input.bytes[5].toString();
    let reasonBytes = input.bytes[6];

    let contactReason = reasonBytes & 0x3;
    var contactReasonMsg = "";
    switch(contactReason){
      case 0: contactReasonMsg = "Reset"; break;
      case 1: contactReasonMsg = "Scheduled"; break;
      case 2: contactReasonMsg = "Manual"; break;
      case 3: contactReasonMsg = "Activation"; break;
    }

    let lastReset = (reasonBytes >> 2) & 0x7;
    var lasetResetMsg = "";
    switch(lastReset){
      case 0: lasetResetMsg = "Power on"; break;
      case 1: lasetResetMsg = "Brown out"; break;
      case 2: lasetResetMsg = "External"; break;
      case 3: lasetResetMsg = "Watchdog"; break;
      case 4: lasetResetMsg = "M3 lockup"; break;
      case 5: lasetResetMsg = "M3 system request"; break;
      case 6: lasetResetMsg = "EM4"; break;
      case 7: lasetResetMsg = "Backup mode"; break;
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

  // --- parameter read response (0x43) ---
  // TTN fPort is whatever your device/server uses; 0x43 is the first byte of the payload.
  else if (input.fPort == 67 || input.bytes[0] == 0x43) {

    // Basic header
    const msgType = input.bytes[0];   // 0x43
    const productId = input.bytes[1]; // 0x00 for TEK 766
    const reserved = input.bytes[2];

    function u32le(i) {
      // 4 bytes little-endian to unsigned
      return (input.bytes[i] |
             (input.bytes[i+1] << 8) |
             (input.bytes[i+2] << 16) |
             (input.bytes[i+3] << 24)) >>> 0;
    }

    function u16le(i) {
      return (input.bytes[i] | (input.bytes[i+1] << 8)) >>> 0;
    }

    // Parse param blocks: [len][id_hi][id_lo][value...len bytes]
    let i = 3;
    let params = {};
    let rawParams = [];

    while (i < input.bytes.length) {
      if (i + 3 > input.bytes.length) break; // not enough for len + id

      const len = input.bytes[i];
      const id = (input.bytes[i+1] << 8) | input.bytes[i+2];
      const vStart = i + 3;
      const vEnd = vStart + len;

      if (vEnd > input.bytes.length) {
        rawParams.push({ error: "truncated", at: i, len: len, id: id });
        break;
      }

      // Store raw
      rawParams.push({
        id_hex: "0x" + id.toString(16).padStart(4, "0"),
        len: len
      });

      // Decode known params
      if (id === 0x0500 && len === 4) {
        const seconds = u32le(vStart);
        params.tx_period_s = seconds;
        params.tx_period_h = seconds / 3600;
      }
      else if (id === 0x0502 && len === 4) {
        const seconds = u32le(vStart);
        params.tx_random_s = seconds;
        params.tx_random_min = seconds / 60;
      }
      else if (id === 0x0503 && len === 4) {
        const seconds = u32le(vStart);
        params.logger_interval_s = seconds;
        params.logger_interval_min = seconds / 60;
      }
      else if (id === 0x0505 && len === 4) {
        const seconds = u32le(vStart);
        params.status_period_s = seconds;
        params.status_period_days = seconds / 86400;
      }
      else if (id === 0x4005 && len === 1) {
        params.ping_rate_min = input.bytes[vStart];
      }
      else if (id === 0x4006 && len === 1) {
        // signed int8
        let v = input.bytes[vStart] & 0xFF;
        params.rf_rssi_threshold_dbm = (v > 127) ? v - 256 : v;
      }
      else if ((id === 0x4001 || id === 0x4002 || id === 0x4003) && len === 2) {
        // Static alarm thresholds (packed bits)
        // threshold = bits0..9, tolerance = bits10..13, enable=bit14, polarity=bit15
        const u16 = u16le(vStart);
        const threshold = u16 & 0x03FF;
        const tolerance = (u16 >> 10) & 0x0F;
        const enabled = ((u16 >> 14) & 0x01) === 1;
        const polarityHigher = ((u16 >> 15) & 0x01) === 1;

        const key = (id === 0x4001) ? "limit1" : (id === 0x4002) ? "limit2" : "limit3";
        params[key] = {
          threshold_cm: threshold,
          tolerance_cm: tolerance,
          enabled: enabled,
          polarity: polarityHigher ? "higher_than_threshold" : "lower_than_threshold"
        };
      }
      else {
        // Unknown param: keep hex
        let hex = "";
        for (let j = vStart; j < vEnd; j++) {
          hex += input.bytes[j].toString(16).padStart(2, "0");
        }
        params["param_" + id.toString(16).padStart(4, "0")] = hex;
      }

      i = vEnd;
    }

    return {
      data: {
        msgType: "0x" + msgType.toString(16),
        productId: "0x" + productId.toString(16),
        reserved: "0x" + reserved.toString(16),
        ...params,
        _raw_param_list: rawParams
      }
    };
  }

  // If no match, return raw bytes
  return {
    data: {
      raw: input.bytes
    }
  };
}
