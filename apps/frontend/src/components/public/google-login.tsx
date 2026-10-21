'use client';

// Login de cliente con Google Identity Services (GSI):
//   GSI renderButton → credential (idToken) → POST /auth/google → JWT propio
//   con claim tipo:'cliente' → storage 'rh.clienteToken' (cliente-session.ts).
//
// Punto de integración: requiere
//   - frontend: NEXT_PUBLIC_GOOGLE_CLIENT_ID (mismo client ID que el backend)
//   - backend:  GOOGLE_CLIENT_ID (ver apps/backend/.env.example)
// Sin la env no se puede inicializar GSI: se muestra un aviso y el checkout
// sigue disponible como invitado (nombre + teléfono).
import { useEffect, useRef, useState } from 'react';
import type { ClienteDto } from '@resto-huma/shared';
import { ApiError } from '@/lib/api';
import { saveClienteSession } from './cliente-session';
import { publicApi } from './public-api';

interface GoogleAuthResponse {
  accessToken: string;
  cliente: ClienteDto;
}

interface CredentialResponse {
  credential: string;
}

interface GoogleAccountsId {
  initialize: (config: { client_id: string; callback: (res: CredentialResponse) => void }) => void;
  renderButton: (
    el: HTMLElement,
    options: { theme?: string; size?: string; shape?: string; width?: number; text?: string },
  ) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

export function GoogleLogin({ onSuccess }: { onSuccess?: (cliente: ClienteDto) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSuccessRef = useRef(onSuccess);
  const [gsiReady, setGsiReady] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    if (!clientId) return;

    const handleCredential = (res: CredentialResponse) => {
      publicApi
        .post<GoogleAuthResponse>('/auth/google', { idToken: res.credential })
        .then((data) => {
          saveClienteSession(data.accessToken, data.cliente);
          onSuccessRef.current?.(data.cliente);
        })
        .catch((err: unknown) => {
          setError(
            err instanceof ApiError && err.status === 503
              ? 'El ingreso con Google no está habilitado en el servidor.'
              : 'No se pudo verificar tu cuenta de Google. Intentá de nuevo.',
          );
        });
    };

    const init = () => {
      if (!window.google || !containerRef.current) return;
      window.google.accounts.id.initialize({ client_id: clientId, callback: handleCredential });
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        width: 280,
        text: 'continue_with',
      });
      setGsiReady(true);
    };

    if (window.google) {
      // Ya cargado (navegación cliente): diferir para no setear estado en sync.
      queueMicrotask(init);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = init;
    script.onerror = () => setScriptFailed(true);
    document.head.appendChild(script);
    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, [clientId]);

  if (!clientId || scriptFailed) {
    return (
      <div className="rounded-xl bg-amber-100/70 px-4 py-3 text-xs leading-relaxed text-amber-900 ring-1 ring-inset ring-amber-300/60">
        El ingreso con Google no está configurado en este sitio. Podés seguir
        pidiendo como invitado completando tus datos abajo.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={containerRef} className="min-h-10">
        {!gsiReady && (
          <span className="inline-flex h-10 w-[280px] items-center justify-center rounded-full bg-white text-xs text-stone-500 ring-1 ring-inset ring-stone-300">
            Cargando Google…
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
