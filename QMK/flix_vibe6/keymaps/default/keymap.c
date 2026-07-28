// Copyright 2026 flix
// SPDX-License-Identifier: GPL-2.0-or-later

#include QMK_KEYBOARD_H
#include "raw_hid.h"
#include <string.h>

#define TOTAL_KEYS 6

// Bumping this invalidates any keymap already stored in EEPROM and falls
// back to DEFAULT_KEYS below.
#define CONFIG_VERSION 1

// QMK fixes every raw HID report at RAW_EPSIZE bytes in both directions.
// Spelled out rather than using the macro so a QMK-side rename can't
// silently desync this from the web client's PACKET_SIZE.
#define FLIX_REPORT_SIZE 32

// Wire protocol shared with the flix map web app -- keep in sync with
// web/src/lib/protocol.js.
enum flix_command {
    CMD_READ_KEYMAP = 0x01,
    CMD_WRITE_KEY   = 0x02,
    CMD_PING        = 0x03,
    CMD_READ_MATRIX = 0x04,
    CMD_BOOTLOADER  = 0x05,
    CMD_RESPONSE_OK = 0xFF,
};

// Sent in byte[1] so the web client can tell replies apart from a keymap
// dump, whose byte[1] is a modifier mask (max 0x0F).
#define PING_ACK_SENTINEL   0xFE
#define MATRIX_DIAG_SENTINEL 0xFD

// Wait this long after the last change before committing to flash. The web
// app writes on every palette click, and RP2040 EEPROM is emulated in
// flash, which has a finite erase budget.
#define EEPROM_SAVE_DEBOUNCE_MS 1500

typedef struct __attribute__((packed)) {
    uint8_t mod;       // bit0 Ctrl, bit1 Shift, bit2 Alt, bit3 GUI
    uint8_t code;      // HID usage ID, or a media code when is_media
    uint8_t is_media;
} flix_key_t;

typedef struct __attribute__((packed)) {
    uint8_t    version;
    flix_key_t keys[TOTAL_KEYS];
} flix_config_t;

static const flix_key_t DEFAULT_KEYS[TOTAL_KEYS] = {
    {0x01, 0x06, 0}, // K1: Ctrl+C
    {0x01, 0x19, 0}, // K2: Ctrl+V
    {0x0A, 0x16, 0}, // K3: Win+Shift+S
    {0x00, 0x80, 1}, // K4: Volume Up
    {0x00, 0x81, 1}, // K5: Volume Down
    {0x00, 0xE8, 1}, // K6: Play/Pause
};

static flix_config_t flix_config;

// Resolved QMK keycodes, rebuilt whenever an assignment changes so a remap
// takes effect on the very next keypress without a reflash.
static uint16_t runtime_keycodes[TOTAL_KEYS];

static bool     save_pending = false;
static uint32_t save_timer   = 0;

// Placeholders in keymaps[] below; process_record_user() resolves each to
// whatever the user has currently assigned.
enum flix_keycodes {
    FLIX_K1 = SAFE_RANGE,
    FLIX_K2,
    FLIX_K3,
    FLIX_K4,
    FLIX_K5,
    FLIX_K6,
};

const uint16_t PROGMEM keymaps[][MATRIX_ROWS][MATRIX_COLS] = {
    [0] = LAYOUT(
        FLIX_K1, FLIX_K2, FLIX_K3,
        FLIX_K4, FLIX_K5, FLIX_K6
    )
};

static uint16_t media_code_to_keycode(uint8_t code) {
    switch (code) {
        case 0x80: return KC_AUDIO_VOL_UP;
        case 0x81: return KC_AUDIO_VOL_DOWN;
        case 0x82: return KC_AUDIO_MUTE;
        case 0xE8: return KC_MEDIA_PLAY_PAUSE;
        case 0xE9: return KC_MEDIA_NEXT_TRACK;
        case 0xEA: return KC_MEDIA_PREV_TRACK;
        default:   return KC_NO;
    }
}

static uint16_t flix_key_to_keycode(flix_key_t key) {
    if (key.is_media) {
        return media_code_to_keycode(key.code);
    }
    if (key.code == 0) {
        return KC_NO;
    }
    // Basic HID usage IDs are QMK basic keycodes 1:1, and our modifier
    // bitmask lines up bit-for-bit with QMK's QK_LCTL/LSFT/LALT/LGUI once
    // shifted into the high byte.
    return (uint16_t)key.code | ((uint16_t)(key.mod & 0x0F) << 8);
}

static void rebuild_runtime_keycodes(void) {
    for (uint8_t i = 0; i < TOTAL_KEYS; i++) {
        runtime_keycodes[i] = flix_key_to_keycode(flix_config.keys[i]);
    }
}

static void fill_keymap_response(uint8_t *response) {
    response[0] = CMD_RESPONSE_OK;
    for (uint8_t i = 0; i < TOTAL_KEYS; i++) {
        response[1 + i * 3]     = flix_config.keys[i].mod;
        response[1 + i * 3 + 1] = flix_config.keys[i].code;
        response[1 + i * 3 + 2] = flix_config.keys[i].is_media;
    }
}

void keyboard_post_init_user(void) {
    bool needs_reset = true;

    if (eeconfig_is_user_datablock_valid()) {
        eeconfig_read_user_datablock(&flix_config, 0, sizeof(flix_config));
        needs_reset = (flix_config.version != CONFIG_VERSION);
    }

    if (needs_reset) {
        flix_config.version = CONFIG_VERSION;
        memcpy(flix_config.keys, DEFAULT_KEYS, sizeof(DEFAULT_KEYS));
        eeconfig_update_user_datablock(&flix_config, 0, sizeof(flix_config));
    }

    rebuild_runtime_keycodes();
}

bool process_record_user(uint16_t keycode, keyrecord_t *record) {
    if (keycode < FLIX_K1 || keycode > FLIX_K6) {
        return true;
    }

    uint16_t resolved = runtime_keycodes[keycode - FLIX_K1];
    if (resolved == KC_NO) {
        return false;
    }

    if (record->event.pressed) {
        register_code16(resolved);
    } else {
        unregister_code16(resolved);
    }
    return false;
}

void housekeeping_task_user(void) {
    if (save_pending && timer_elapsed32(save_timer) > EEPROM_SAVE_DEBOUNCE_MS) {
        eeconfig_update_user_datablock(&flix_config, 0, sizeof(flix_config));
        save_pending = false;
    }
}

void raw_hid_receive(uint8_t *data, uint8_t length) {
    uint8_t response[FLIX_REPORT_SIZE];
    memset(response, 0, sizeof(response));

    switch (data[0]) {
        case CMD_READ_KEYMAP:
            fill_keymap_response(response);
            raw_hid_send(response, sizeof(response));
            break;

        case CMD_WRITE_KEY: {
            uint8_t index = data[1];
            if (index >= TOTAL_KEYS) {
                break;
            }
            flix_config.keys[index].mod      = data[2];
            flix_config.keys[index].code     = data[3];
            flix_config.keys[index].is_media = data[4];
            rebuild_runtime_keycodes();

            // Live in RAM immediately; flash write is debounced above.
            save_pending = true;
            save_timer   = timer_read32();

            // Echo the whole keymap so the web app reflects the truth on
            // the device rather than only its optimistic local update.
            fill_keymap_response(response);
            raw_hid_send(response, sizeof(response));
            break;
        }

        case CMD_PING:
            response[0] = CMD_RESPONSE_OK;
            response[1] = PING_ACK_SENTINEL;
            raw_hid_send(response, sizeof(response));
            break;

        // Diagnostic: dump the debounced matrix state so a physical press
        // can be observed from the host. Distinguishes "the switch/diode
        // path is electrically dead" from "the scan works but something
        // downstream is wrong".
        case CMD_READ_MATRIX:
            response[0] = CMD_RESPONSE_OK;
            response[1] = MATRIX_DIAG_SENTINEL;
            for (uint8_t row = 0; row < MATRIX_ROWS; row++) {
                response[2 + row] = (uint8_t)(matrix_get_row(row) & 0xFF);
            }
            raw_hid_send(response, sizeof(response));
            break;

        // Reboot into the RP2040 UF2 bootloader so firmware can be updated
        // without physical access to the BOOT button -- the case has no
        // exposed one once assembled. Bootmagic (hold K1 on plug-in) is the
        // fallback if the board is ever unresponsive over USB.
        case CMD_BOOTLOADER:
            // Acknowledge first; the jump never returns.
            response[0] = CMD_RESPONSE_OK;
            response[1] = PING_ACK_SENTINEL;
            raw_hid_send(response, sizeof(response));
            wait_ms(50);
            bootloader_jump();
            break;

        default:
            break;
    }
}
