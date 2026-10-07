"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  equipamento: string;
  serialAtual: string;
  onConfirm: (serial: string) => void;
  onClose: () => void;
};
type CodigoDetectado = {
  rawValue: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
};
type Detector = {
  detect: (imagem: HTMLCanvasElement) => Promise<CodigoDetectado[]>;
};
type ConstrutorDetector = {
  new (opcoes: { formats: string[] }): Detector;
  getSupportedFormats?: () => Promise<string[]>;
};
type Decodificador = {
  decodeFromCanvas: (canvas: HTMLCanvasElement) => { getText: () => string };
};
type Estado = "abrindo" | "lendo" | "revisando" | "erro" | "pausado";

const FORMATOS = [
  "code_128",
  "code_39",
  "code_93",
  "codabar",
  "itf",
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "qr_code",
  "data_matrix",
];
const BOTAO =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-bold text-slate-200 transition hover:border-cyan-400/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-40";

function serialValido(valor: string) {
  const serial = valor.trim();
  return (
    serial.length > 0 && serial.length <= 256 && !/[\x00-\x1f\x7f]/.test(serial)
  );
}
function erroCamera(erro: unknown) {
  const nome = erro instanceof Error ? erro.name : "";
  if (nome === "NotAllowedError" || nome === "SecurityError")
    return "O acesso à câmera foi bloqueado. Libere a câmera nas permissões deste site e tente novamente, ou digite o serial no formulário.";
  if (nome === "NotFoundError" || nome === "OverconstrainedError")
    return "Não foi encontrada uma câmera disponível. Escolha outra câmera, se houver, ou digite o serial no formulário.";
  if (nome === "NotReadableError" || nome === "AbortError")
    return "Não foi possível abrir a câmera. Feche outros aplicativos que estejam usando a câmera e tente novamente.";
  return "Não foi possível iniciar o leitor. Tente novamente ou digite o serial no formulário.";
}

// A interface, a câmera e o preenchimento são controlados pelo Hub.
// Quando o navegador não oferece leitura nativa, o ZXing decodifica localmente.
// Nenhum frame ou imagem é enviado a um serviço externo.
export default function SerialBarcodeScanner({
  equipamento,
  serialAtual,
  onConfirm,
  onClose,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmarRef = useRef(onConfirm);
  const fecharRef = useRef(onClose);
  confirmarRef.current = onConfirm;
  fecharRef.current = onClose;
  const [estado, setEstado] = useState<Estado>("abrindo");
  const [erro, setErro] = useState("");
  const [dica, setDica] = useState("");
  const [leitura, setLeitura] = useState<string | null>(null);
  const [serial, setSerial] = useState("");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [cameraId, setCameraId] = useState("");
  const [cameraAtual, setCameraAtual] = useState("");
  const [revisao, setRevisao] = useState(0);

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const teclado = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        fecharRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const elementos = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex="0"]',
        ) || [],
      ).filter((elemento) => elemento.getClientRects().length > 0);
      const primeiro = elementos[0],
        ultimo = elementos[elementos.length - 1];
      if (!primeiro) {
        event.preventDefault();
        dialogRef.current?.focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === primeiro ||
          !dialogRef.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        ultimo.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === ultimo ||
          !dialogRef.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener("keydown", teclado, true);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", teclado, true);
      if (anterior && document.contains(anterior)) anterior.focus();
    };
  }, []);

  useEffect(() => {
    if (leitura !== null) return;
    const video = videoRef.current;
    if (!video) return;
    let vivo = true;
    let interrompido = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timerDica: ReturnType<typeof setTimeout> | undefined;
    let timerPermissao: ReturnType<typeof setTimeout> | undefined;
    let detector: Detector | null = null;
    let leitor: Decodificador | null = null;
    let falhasNativas = 0;
    const canvas = document.createElement("canvas");
    const contexto = canvas.getContext("2d", { willReadFrequently: true });
    const ativo = () => vivo && !interrompido;
    const parar = () => {
      clearTimeout(timer);
      clearTimeout(timerDica);
      clearTimeout(timerPermissao);
      stream?.getTracks().forEach((track) => track.stop());
      if (video.srcObject === stream) {
        video.pause();
        video.srcObject = null;
      }
    };
    const pausar = () => {
      interrompido = true;
      parar();
      if (vivo) {
        setEstado("pausado");
        setDica(
          "A câmera foi pausada ao sair desta tela. Toque em Retomar câmera para continuar.",
        );
      }
    };
    const visibilidade = () => {
      if (document.visibilityState === "hidden") pausar();
    };
    document.addEventListener("visibilitychange", visibilidade);
    window.addEventListener("pagehide", pausar);

    const carregarLeitor = async () => {
      const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] =
        await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
      if (!ativo()) return;
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.CODE_93,
        BarcodeFormat.CODABAR,
        BarcodeFormat.ITF,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.DATA_MATRIX,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      leitor = new BrowserMultiFormatReader(hints);
    };
    const receber = (valor: string) => {
      if (!ativo()) return;
      if (!serialValido(valor)) {
        setDica(
          "O código lido não parece ser um serial simples. Aponte para o código de barras identificado como S/N ou Serial Number.",
        );
        return;
      }
      // Mantém letras, hífens e zeros iniciais; o operador confirma antes de aplicar.
      const numero = valor.trim();
      interrompido = true;
      parar();
      setSerial(numero);
      setLeitura(numero);
      setEstado("revisando");
      setDica("");
    };
    const lerFrame = async () => {
      if (!ativo()) return;
      try {
        if (contexto && video.readyState >= 2 && video.videoWidth > 0) {
          const escala = Math.min(1, 1280 / video.videoWidth);
          canvas.width = Math.round(video.videoWidth * escala);
          canvas.height = Math.round(video.videoHeight * escala);
          contexto.drawImage(video, 0, 0, canvas.width, canvas.height);
          if (detector) {
            try {
              const encontrados = await detector.detect(canvas);
              if (!ativo()) return;
              const centroX = canvas.width / 2,
                centroY = canvas.height / 2;
              encontrados.sort((a, b) => {
                const distancia = (codigo: CodigoDetectado) =>
                  codigo.boundingBox
                    ? Math.hypot(
                        codigo.boundingBox.x +
                          codigo.boundingBox.width / 2 -
                          centroX,
                        codigo.boundingBox.y +
                          codigo.boundingBox.height / 2 -
                          centroY,
                      )
                    : 0;
                return distancia(a) - distancia(b);
              });
              const codigo = encontrados.find((item) =>
                serialValido(item.rawValue || ""),
              );
              if (codigo) receber(codigo.rawValue);
              falhasNativas = 0;
            } catch {
              if (++falhasNativas >= 3 && ativo()) {
                detector = null;
                await carregarLeitor();
              }
            }
          } else if (leitor) {
            try {
              receber(leitor.decodeFromCanvas(canvas).getText());
            } catch {
              /* Sem código legível neste frame: mantém a leitura ativa. */
            }
          }
        }
      } catch {
        if (ativo()) {
          interrompido = true;
          parar();
          setEstado("erro");
          setErro(
            "O leitor não conseguiu continuar. Tente novamente ou preencha o serial manualmente.",
          );
        }
      }
      if (ativo())
        timer = setTimeout(() => {
          void lerFrame();
        }, 250);
    };

    setEstado("abrindo");
    setErro("");
    setDica("");
    void (async () => {
      try {
        if (!window.isSecureContext) {
          setEstado("erro");
          setErro(
            "Para usar a câmera, abra o Hub por HTTPS. No desenvolvimento, use localhost. Enquanto isso, você pode digitar o serial no formulário.",
          );
          return;
        }
        if (!navigator.mediaDevices?.getUserMedia || !contexto) {
          setEstado("erro");
          setErro(
            "Este navegador não disponibilizou a câmera. Abra em um navegador atualizado ou digite o serial no formulário.",
          );
          return;
        }
        timerPermissao = setTimeout(() => {
          if (ativo())
            setDica(
              "Confira se o navegador está aguardando sua permissão para usar a câmera. Você pode voltar ao formulário a qualquer momento.",
            );
        }, 12000);
        const solicitado = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: cameraId
            ? {
                deviceId: { exact: cameraId },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }
            : {
                facingMode: { ideal: "environment" },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
        });
        if (!ativo()) {
          solicitado.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = solicitado;
        clearTimeout(timerPermissao);
        setDica("");
        const track = stream.getVideoTracks()[0];
        setCameraAtual(track?.getSettings().deviceId || cameraId);
        track?.addEventListener("ended", pausar);
        video.srcObject = stream;
        await video.play();
        if (!ativo()) {
          parar();
          return;
        }
        if (navigator.mediaDevices.enumerateDevices) {
          void navigator.mediaDevices
            .enumerateDevices()
            .then((dispositivos) => {
              if (ativo())
                setCameras(
                  dispositivos.filter((item) => item.kind === "videoinput"),
                );
            })
            .catch(() => {
              /* A leitura não depende da listagem de câmeras. */
            });
        }
        const DetectorNativo = (
          window as Window & { BarcodeDetector?: ConstrutorDetector }
        ).BarcodeDetector;
        if (DetectorNativo?.getSupportedFormats) {
          try {
            const formatos = (
              await DetectorNativo.getSupportedFormats()
            ).filter((formato) => FORMATOS.includes(formato));
            if (
              ativo() &&
              formatos.includes("code_128") &&
              formatos.includes("code_39")
            )
              detector = new DetectorNativo({ formats: formatos });
          } catch {
            /* Carrega o leitor local alternativo abaixo. */
          }
        }
        if (!ativo()) {
          parar();
          return;
        }
        if (!detector) await carregarLeitor();
        if (!ativo()) {
          parar();
          return;
        }
        setEstado("lendo");
        timerDica = setTimeout(() => {
          if (ativo())
            setDica(
              "Ainda não leu? Melhore a iluminação, mantenha a etiqueta inteira visível e ajuste a distância até o código ficar nítido.",
            );
        }, 12000);
        void lerFrame();
      } catch (error) {
        parar();
        if (ativo()) {
          setEstado("erro");
          setErro(erroCamera(error));
        }
      }
    })();

    return () => {
      vivo = false;
      interrompido = true;
      stream
        ?.getVideoTracks()
        .forEach((track) => track.removeEventListener("ended", pausar));
      parar();
      document.removeEventListener("visibilitychange", visibilidade);
      window.removeEventListener("pagehide", pausar);
    };
  }, [cameraId, revisao, leitura]);

  function reiniciar() {
    setLeitura(null);
    setSerial("");
    setRevisao((atual) => atual + 1);
  }
  if (typeof document === "undefined") return null;
  const revisando = leitura !== null;
  return createPortal(
    <div
      className="fixed inset-0 z-[10020] flex items-end justify-center bg-[#020617]/90 p-3 backdrop-blur-md sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) fecharRef.current();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="leitor-serial-titulo"
        aria-describedby="leitor-serial-descricao"
        tabIndex={-1}
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[1.75rem] border border-cyan-500/25 bg-[#080f20] shadow-2xl outline-none sm:max-h-[90dvh]"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-800 p-4 sm:p-5">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
              Preenchimento por câmera · opcional
            </p>
            <h2
              id="leitor-serial-titulo"
              className="mt-2 text-xl font-black text-white"
            >
              Ler número de série
            </h2>
            <p className="mt-1 break-words text-xs text-slate-400">
              {equipamento}
            </p>
          </div>
          <button
            type="button"
            onClick={() => fecharRef.current()}
            aria-label="Fechar leitor de código de barras"
            className={`${BOTAO} !h-11 !w-11 shrink-0 !px-0 text-xl`}
          >
            ×
          </button>
        </header>
        <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <ol className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
            {["Abrir câmera", "Ler etiqueta", "Conferir serial"].map(
              (titulo, index) => (
                <li
                  key={titulo}
                  className={`rounded-lg border px-2 py-2 ${index === (revisando ? 2 : estado === "lendo" ? 1 : 0) ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300" : "border-slate-800 text-slate-500"}`}
                >
                  {index + 1}. {titulo}
                </li>
              ),
            )}
          </ol>
          <p
            id="leitor-serial-descricao"
            className="text-xs leading-relaxed text-slate-400"
          >
            {revisando
              ? "Confira se o código lido corresponde ao S/N da etiqueta. Você pode ajustar o valor antes de preencher o equipamento."
              : "Aponte a câmera para o código de barras identificado como S/N ou Serial Number. Mantenha a etiqueta firme e bem iluminada."}
          </p>
          {erro && (
            <p
              role="alert"
              className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200"
            >
              {erro}
            </p>
          )}
          {revisando ? (
            <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4">
              <p
                role="status"
                className="mb-3 text-xs font-bold text-emerald-300"
              >
                Código identificado · câmera encerrada
              </p>
              <label
                htmlFor="leitor-serial-valor"
                className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400"
              >
                Número de série lido
              </label>
              <input
                id="leitor-serial-valor"
                value={serial}
                onChange={(event) => setSerial(event.target.value)}
                maxLength={256}
                autoComplete="off"
                spellCheck={false}
                className="min-h-12 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 font-mono text-base text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/15"
              />
              {!serialValido(serial) && (
                <p className="mt-2 text-xs text-amber-200">
                  Informe um serial sem quebras de linha, com até 256
                  caracteres.
                </p>
              )}
              {serialAtual.trim() && (
                <p className="mt-3 break-all text-[11px] leading-relaxed text-amber-200/90">
                  Este equipamento já tem o serial{" "}
                  <strong>{serialAtual}</strong>. Aplicar o valor lido substitui
                  esse preenchimento.
                </p>
              )}
            </section>
          ) : (
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-slate-700 bg-black">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                aria-label="Prévia da câmera para leitura do serial"
                className="h-full w-full object-contain"
              />
              {(estado === "abrindo" || estado === "lendo") && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-[8%] inset-y-[22%] rounded-lg border-2 border-cyan-400/80 shadow-[0_0_0_999px_rgba(2,6,23,0.28)]"
                >
                  <div className="absolute inset-x-2 top-1/2 h-px bg-cyan-300/70" />
                </div>
              )}
              {estado !== "lendo" && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/75 p-4 text-center">
                  <p
                    role="status"
                    className="text-xs font-semibold text-slate-300"
                  >
                    {estado === "abrindo"
                      ? "Abrindo câmera e preparando o leitor…"
                      : estado === "pausado"
                        ? "Câmera pausada"
                        : "Câmera indisponível"}
                  </p>
                </div>
              )}
            </div>
          )}
          {!revisando && cameras.length > 1 && (
            <label className="block text-[11px] font-bold text-slate-400">
              Escolher câmera
              <select
                aria-label="Escolher câmera"
                value={cameraId || cameraAtual}
                onChange={(event) => setCameraId(event.target.value)}
                className="mt-2 min-h-11 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 text-xs text-slate-200 outline-none focus:border-cyan-400"
              >
                {cameras.map((camera, index) => (
                  <option key={camera.deviceId} value={camera.deviceId}>
                    {camera.label || `Câmera ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>
          )}
          {dica && (
            <p
              role="status"
              className="rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-xs leading-relaxed text-slate-300"
            >
              {dica}
            </p>
          )}
          <p className="text-[11px] leading-relaxed text-slate-500">
            A leitura acontece neste dispositivo. Etiquetas contendo somente
            texto podem ser preenchidas por digitação.
          </p>
        </div>
        <footer className="flex shrink-0 flex-col gap-2 border-t border-slate-800 p-4 sm:flex-row sm:justify-end sm:p-5">
          <button
            type="button"
            onClick={() => fecharRef.current()}
            className={BOTAO}
          >
            Voltar ao formulário
          </button>
          {(revisando || estado === "erro" || estado === "pausado") && (
            <button type="button" onClick={reiniciar} className={BOTAO}>
              {revisando
                ? "Ler novamente"
                : estado === "pausado"
                  ? "Retomar câmera"
                  : "Tentar novamente"}
            </button>
          )}
          {revisando && (
            <button
              type="button"
              disabled={!serialValido(serial)}
              onClick={() => confirmarRef.current(serial.trim())}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-cyan-500 px-4 py-3 text-xs font-black text-cyan-950 transition hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Aplicar número de série
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
}
