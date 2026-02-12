#!/usr/bin/env python3

def u32_le(value):
    return value.to_bytes(4, "little")

def build_param_block(param_id, value_bytes):
    block = bytearray()
    block.append(len(value_bytes))
    block.append((param_id >> 8) & 0xFF)
    block.append(param_id & 0xFF)
    block.extend(value_bytes)
    return block

def ask_int(prompt):
    s = input(prompt).strip()
    return None if s == "" else int(s)

def main():
    print("\nTEK-766 Parameter Write Request builder")
    print("Press ENTER to skip a parameter.\n")

    payload = bytearray([0x42, 0x00, 0x00])

    # TX period (0500)
    tx_hours = ask_int("TX period (hours): ")
    if tx_hours is not None:
        seconds = tx_hours * 3600
        payload.extend(build_param_block(0x0500, u32_le(seconds)))

    # TX randomization (0502)
    rand_minutes = ask_int("TX randomization (minutes): ")
    if rand_minutes is not None:
        seconds = rand_minutes * 60
        payload.extend(build_param_block(0x0502, u32_le(seconds)))

    # Logger interval (0503)
    log_minutes = ask_int("Logger interval (minutes): ")
    if log_minutes is not None:
        seconds = log_minutes * 60
        payload.extend(build_param_block(0x0503, u32_le(seconds)))

    # Status period (0505)
    status_days = ask_int("Status period (days): ")
    if status_days is not None:
        seconds = status_days * 86400
        payload.extend(build_param_block(0x0505, u32_le(seconds)))

    # Ping rate (4005)
    ping_minutes = ask_int("Ping rate (minutes): ")
    if ping_minutes is not None:
        payload.extend(build_param_block(0x4005, bytes([ping_minutes])))

    print("\nDownlink payload (HEX):")
    print(payload.hex())

    print("\nSend this as a Parameter Write Request (0x42).")
    print("FPort: 42")

if __name__ == "__main__":
    main()
