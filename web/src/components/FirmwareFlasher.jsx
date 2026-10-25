import { useEffect, useState } from 'react';
import { useFlixStore } from '../store/useFlixStore';

// Writing firmware from the page, for a board that has stopped answering.
//
// An RP2040 in its bootloader is a USB drive, and installing firmware onto one
// is copying a file to it -- so that is what this does, through the File
// System Access API: fetch the .uf2, ask for the drive, write it there. No
// driver, no tool to install, and the same operation a person would do by
// hand, which is what makes it safe to walk someone through over a message.
//
// It lives behind ?debug=1 on purpose. Nothing on the site links here: this is
// for a board that is already in trouble, reached by being told the address,
// not something to come across while setting up a keypad.

const MANIFEST = '/firmware/manifest.json';

// The drive the RP2040 bootloader presents. Checking for it is what stops a
// misdirected write landing in someone's Documents.
const BOOT_MARKER = 'INFO_UF2.TXT';

export default function FirmwareFlasher() {
  const { connected, product, enterBootloader } = useFlixStore();
  const [manifest, setManifest] = useState(null);
  const [choice, setChoice] = useState(null);
  const [state, setState] = useState('idle');
  const [note, setNote] = useState(null);

  useEffect(() => {
    fetch(MANIFEST)
      .then((r) => (r.ok ? r.json() : null))
      .then(setManifest)
      .catch(() => setManifest(null));
  }, []);

  // The connected board picks itself; a board that no longer enumerates has
  // to be named by hand, which is the case this panel exists for.
  useEffect(() => {
    if (!manifest) return;
    const id = connected ? product.id : null;
    setChoice((prev) => prev ?? (id && manifest.files[id] ? id : Object.keys(manifest.files)[0]));
  }, [manifest, connected, product.id]);

  const supported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  const entry = manifest?.files?.[choice];

  const flash = async () => {
    if (!entry) return;
    setNote(null);
    try {
      setState('picking');
      const dir = await window.showDirectoryPicker({ id: 'rpi-rp2', mode: 'readwrite' });

      // Make sure it is the bootloader drive before writing anything to it.
      let isBoot = false;
      for await (const name of dir.keys()) {
        if (name.toUpperCase() === BOOT_MARKER) {
          isBoot = true;
          break;
        }
      }
      if (!isBoot) {
        setState('idle');
        setNote('RPI-RP2 드라이브가 아닙니다. 부트로더로 재부팅한 뒤 그 드라이브를 골라주세요.');
        return;
      }

      setState('writing');
      const firmware = await (await fetch(entry.path)).arrayBuffer();
      const file = await dir.getFileHandle(entry.path.split('/').pop(), { create: true });
      const stream = await file.createWritable();
      await stream.write(firmware);
      // The board reboots the moment the file lands, so the drive can vanish
      // before close() returns. That is the write having worked, not failed.
      await stream.close().catch(() => {});
      setState('done');
    } catch (err) {
      if (err?.name === 'AbortError') {
        setState('idle');
        return;
      }
      // Same vanishing drive, surfacing as a write error instead.
      if (state === 'writing') {
        setState('done');
        return;
      }
      setState('idle');
      setNote(`굽기 실패: ${err.message}`);
    }
  };

  if (!manifest) return null;

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <p className="text-[11px] font-semibold text-white/60">펌웨어 굽기</p>
      <p className="mt-1 text-[11px] leading-relaxed text-white/30">
        프로토콜 {manifest.protocol} · {manifest.builtAt} 빌드. 기기가 응답하지 않거나 설정을
        처음으로 되돌려야 할 때 씁니다.
      </p>

      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        {Object.entries(manifest.files).map(([id, f]) => (
          <button
            key={id}
            onClick={() => setChoice(id)}
            className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold transition ${
              choice === id ? 'bg-cyan-500 text-slate-950' : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            {f.name.replace('FLIX ', '')}
          </button>
        ))}
      </div>

      <ol className="mt-3 flex flex-col gap-2">
        <li className="flex items-center gap-2">
          <Step n="1" />
          <button
            onClick={enterBootloader}
            disabled={!connected}
            className="flex-1 rounded-lg border border-amber-500/30 py-1.5 text-[12px] font-semibold text-amber-300/80 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-30"
          >
            부트로더로 재부팅
          </button>
        </li>
        <li className="flex items-center gap-2">
          <Step n="2" />
          <button
            onClick={flash}
            disabled={!supported || !entry || state === 'writing'}
            className="flex-1 rounded-lg bg-cyan-500 py-1.5 text-[12px] font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {state === 'writing' ? '쓰는 중...' : 'RPI-RP2 드라이브 골라서 굽기'}
          </button>
        </li>
      </ol>

      <p className="mt-2 text-[11px] leading-relaxed text-white/30">
        {state === 'done' ? (
          <span className="text-emerald-400">
            ✓ 다 썼습니다. 기기가 스스로 다시 켜집니다 — 다시 연결해 주세요.
          </span>
        ) : note ? (
          <span className="text-amber-300/80">{note}</span>
        ) : !supported ? (
          <span className="text-amber-300/80">
            이 브라우저는 드라이브 쓰기를 지원하지 않습니다. Chrome · Edge에서 열어주세요.
          </span>
        ) : (
          <>
            이미 부트로더라면 1번은 건너뛰세요. 2번에서 <b className="text-white/50">RPI-RP2</b>{' '}
            드라이브를 고르면 그 안에 펌웨어를 씁니다. 설정은 지워지지 않습니다.
          </>
        )}
      </p>
    </div>
  );
}

function Step({ n }) {
  return (
    <span className="w-4 shrink-0 text-center text-[11px] font-bold text-white/25">{n}</span>
  );
}
