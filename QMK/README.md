# FLIX VIBE 6 — QMK 펌웨어

`flix_vibe6/`는 QMK 키보드 정의입니다. QMK 저장소 안에 넣어서 빌드합니다.

## 1. 빌드 환경 설치 (최초 1회)

1. [QMK MSYS](https://msys.qmk.fm/) 다운로드 후 설치
2. 설치된 **QMK MSYS** 터미널을 실행 (일반 PowerShell 아님)
3. 아래 명령으로 QMK 저장소를 받고 초기 설정:

```bash
qmk setup
```

기본 경로(`~/qmk_firmware`)로 클론할지 물으면 Yes로 진행합니다.

## 2. 키보드 정의 복사

`flix_vibe6` 폴더를 통째로 QMK 저장소의 `keyboards/` 아래로 복사합니다.

최종 경로가 이렇게 되어야 합니다:

```
qmk_firmware/keyboards/flix_vibe6/
├── keyboard.json
├── config.h
├── rules.mk
└── keymaps/default/keymap.c
```

## 3. 빌드

QMK MSYS 터미널에서:

```bash
qmk compile -kb flix_vibe6 -km default
```

성공하면 `qmk_firmware/flix_vibe6_default.uf2` 파일이 생성됩니다.

## 4. 보드에 굽기

먼저 보드를 **부트로더 모드**(`RPI-RP2` 드라이브가 뜨는 상태)로 만들어야 합니다.
하우징에 조립되어 BOOT 버튼을 누를 수 없다면 아래 소프트웨어 방법을 씁니다.

### 부트로더 진입 방법

**A. 현재 CircuitPython이 올라가 있는 경우** (QMK 최초 설치 시)

Mu Editor의 Serial 콘솔에서 아무 키나 눌러 `>>>` (REPL)로 들어간 뒤:

```python
import microcontroller
microcontroller.on_next_reset(microcontroller.RunMode.BOOTLOADER)
microcontroller.reset()
```

**B. 이미 QMK가 올라가 있는 경우** (펌웨어 업데이트 시)

**K1(좌측 상단 키)을 누른 채로 USB를 연결**하면 부트로더로 진입합니다.
(QMK Bootmagic 기능, `keyboard.json`에서 활성화되어 있음. 트리거 키는
`config.h`의 `BOOTMAGIC_ROW`/`BOOTMAGIC_COLUMN`으로 변경 가능)

주의: Bootmagic은 진입 시 **EEPROM을 초기화**하므로 저장해둔 키 매핑이
기본값으로 돌아갑니다.

**C. 물리 BOOT 버튼이 접근 가능한 경우**

BOOT 버튼을 누른 채로 USB 연결.

### 굽기

1. 위 방법 중 하나로 `RPI-RP2` 드라이브를 띄움
2. `flix_vibe6_default.uf2` 파일을 그 드라이브에 드래그 앤 드롭
3. 보드가 자동 재부팅되며 QMK 키보드로 동작 시작

이후에는 `flix map` 웹사이트에서 바로 연결·매핑이 됩니다.

---

## 판매 전 반드시 처리할 것

### VID / PID 변경

`keyboard.json`의 `usb.vid`가 현재 `0xFEED`(QMK 테스트용 공용값)입니다.
제품 출하 전에 고유한 값으로 바꿔야 합니다. 선택지:

- [pid.codes](https://pid.codes/) — 오픈소스 하드웨어용 무료 PID 발급 (비상업적 성격이라 상업 판매 시 약관 확인 필요)
- USB-IF에서 VID 직접 구매 (연 $6,000 수준, 가장 확실)
- 일부 MCU 벤더가 자사 VID 하위 PID를 무료/저가로 배분 (RP2040은 Raspberry Pi가 이 제도를 운영 — 문의 권장)

VID/PID가 다른 제품과 겹치면 사용자 PC에서 드라이버 충돌이 날 수 있습니다.

### GPL 소스 공개

QMK는 GPLv2입니다. 펌웨어를 탑재해 판매하려면 **해당 펌웨어의 소스코드를 구매자가
받을 수 있어야 합니다** (GitHub 공개 저장소로 충족 가능). `flix_vibe6/` 폴더를
공개하면 됩니다.

`web/`(flix map 웹앱)은 QMK 코드와 링크되지 않고 USB로 통신만 하므로
**공개 의무가 없습니다.**
