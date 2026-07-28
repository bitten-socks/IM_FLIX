// Copyright 2026 flix
// SPDX-License-Identifier: GPL-2.0-or-later

#pragma once

// Reserve EEPROM (flash-emulated on RP2040) for the 6 user key assignments
// so they survive a power cycle. Holds flix_config_t from keymap.c
// (1 version byte + 6 keys x 3 bytes = 19), rounded up for headroom.
#define EECONFIG_USER_DATA_SIZE 32
