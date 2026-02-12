#!/usr/bin/env python3

from dataclasses import dataclass
from typing import Optional, Callable


# --- Manual defaults & ranges (TEK 766 manual) ---
# Defaults from the "Default Schedule" section:
# TX=6h, TX rand=60m, Logger=360m, Status=7d, Ping=15m
# Ranges from the "Configurable parameters listing default, minimum and maximum"
#  [oai_citation:2‡9-5911-05 TEK 766 Ultrasonic LoRaWAN User Manual (1).pdf](sediment://file_00000000d88c720a9bd3ce32647b914d)

DEFAULTS = {
    "tx_hours": 6,          # 0x0500
    "rand_minutes": 60,     # 0x0502
    "logger_minutes": 360,  # 0x0503
    "status_days": 7,       # 0x0505
    "ping_minutes": 15,     # 0x4005
}

RANGES = {
    "tx_hours": (1, 720),
    "rand_minutes": (1, 240),
    "logger_minutes": (2, 1440),
    "status_days": (1, 30),
    "ping_minutes": (1, 240),
}


def u32_le(value: int) -> bytes:
    return value.to_bytes(4, "little", signed=False)


def build_param_block(param_id: int, value_bytes: bytes) -> bytes:
    """
    Block format (Parameter Write Request / 0x42):
    [len][param_id_hi][param_id_lo][value...]
    """
    if not (0 <= param_id <= 0xFFFF):
        raise ValueError("param_id out of range")
    if not (0 <= len(value_bytes) <= 255):
        raise ValueError("value length out of range")

    return bytes([len(value_bytes), (param_id >> 8) & 0xFF, param_id & 0xFF]) + value_bytes


def ask_value(
    label: str,
    key: str,
    to_value_bytes: Callable[[int], bytes],
) -> Optional[bytes]:
    """
    Returns:
      - None: user chose to skip (leave unchanged)
      - bytes: encoded parameter value bytes
    """
    default = DEFAULTS[key]
    min_v, max_v = RANGES[key]

    while True:
        s = input(f"{label} [{min_v}-{max_v}] (default={default}) — ENTER to skip: ").strip().lower()
        if s == "":
            return None  # skip
        if s == "d":
            v = default
        else:
            try:
                v = int(s)
            except ValueError:
                print("  ✗ Please enter a number, 'd', or just ENTER.")
                continue

        if v < min_v or v > max_v:
            print(f"  ✗ Out of range. Must be {min_v}..{max_v}.")
            continue

        return to_value_bytes(v)


def main():
    print("\nTEK-766 Parameter Write Request (0x42) builder")
    print("Per parameter: ENTER = leave unchanged, 'd' = set to manual default, number = set explicitly.\n")

    payload = bytearray([0x42, 0x00, 0x00])  # 0x42 + ProductID(0x00 TEK766) + Reserved(0x00)

    # 0x0500 TX Period (hours -> seconds u32 LE)
    b = ask_value("TX period (hours)", "tx_hours", lambda h: u32_le(h * 3600))
    if b is not None:
        payload.extend(build_param_block(0x0500, b))

    # 0x0502 TX Randomisation (minutes -> seconds u32 LE)
    b = ask_value("TX randomization (minutes)", "rand_minutes", lambda m: u32_le(m * 60))
    if b is not None:
        payload.extend(build_param_block(0x0502, b))

    # 0x0503 Logger Interval (minutes -> seconds u32 LE)
    b = ask_value("Logger interval (minutes)", "logger_minutes", lambda m: u32_le(m * 60))
    if b is not None:
        payload.extend(build_param_block(0x0503, b))

    # 0x0505 Status period (days -> seconds u32 LE)
    b = ask_value("Status period (days)", "status_days", lambda d: u32_le(d * 86400))
    if b is not None:
        payload.extend(build_param_block(0x0505, b))

    # 0x4005 Ping rate (minutes -> u8)
    b = ask_value("Ping rate (minutes)", "ping_minutes", lambda m: bytes([m]))
    if b is not None:
        payload.extend(build_param_block(0x4005, b))

    print("\nDownlink payload (HEX):")
    print(payload.hex())

    if len(payload) == 3:
        print("\nNote: You skipped all parameters, so this payload only contains the header (no changes).")
    else:
        print("\nSend this as a downlink on a FPort 42.")


if __name__ == "__main__":
    main()
