# flix map

FLIX VIBE 6 전용 웹 키매퍼. 설치 없이 브라우저에서 6개 키를 재설정합니다.

WebHID로 기기와 직접 통신하므로 **서버가 없습니다.** 키맵은 기기의 EEPROM에
저장되며, 이 사이트는 어떤 사용자 데이터도 수집·전송하지 않습니다.

## 요구 사항

- **Chrome, Edge, Whale** 등 Chromium 계열 브라우저 (WebHID 필요)
  - Safari·Firefox는 WebHID를 지원하지 않습니다
- **HTTPS** (또는 localhost) — WebHID의 보안 요구사항

## 개발

```bash
npm install
npm run dev
```

`http://localhost:5174`에서 열립니다. 실제 기기를 연결해야 동작을 확인할 수 있습니다.

### 하드웨어 진단 패널

`?debug=1`을 붙여 접속하면 (`http://localhost:5174/?debug=1`) 펌웨어의 매트릭스
상태를 실시간으로 보는 패널이 나타납니다. 스위치·배선의 전기적 문제와 키코드
매핑 문제를 구분할 때 사용합니다. 일반 접속 시에는 표시되지 않습니다.

## 빌드

```bash
npm run build
```

`dist/`에 정적 파일이 생성됩니다.

## 배포

Vercel에 GitHub 저장소를 연결하면 자동 배포됩니다. 설정:

| 항목 | 값 |
|---|---|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Root Directory | 저장소에 이 폴더만 있다면 비워둠. 상위 폴더째 올렸다면 `web` |

Vercel은 HTTPS를 기본 제공하므로 WebHID 요구사항이 충족됩니다.

## 관련

기기 펌웨어는 [`../QMK/flix_vibe6`](../QMK)에 있습니다. 통신 프로토콜은
`src/lib/protocol.js`와 펌웨어의 `raw_hid_receive()`가 짝을 이룹니다.
