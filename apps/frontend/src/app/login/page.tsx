'use client';

// Login de empleados: POST /auth/login → tokens en localStorage → /.
// Un 401 de login es credencial inválida (el api client no lo refresca).
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import type { TokensDto } from '@resto-huma/shared';
import { api, ApiError } from '@/lib/api';
import { getSession, setTokens } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IconFlame } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Ya autenticado → directo al dashboard.
  useEffect(() => {
    if (getSession()) router.replace('/');
  }, [router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tokens = await api.post<TokensDto>('/auth/login', { email, password });
      setTokens(tokens);
      router.replace('/');
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'Email o contraseña incorrectos.'
          : 'No se pudo conectar con el servidor. Intentá de nuevo.',
      );
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center pt-8 text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-amber-100">
            <IconFlame className="size-7 text-amber-600" />
          </div>
          <CardTitle className="text-lg">resto-huma</CardTitle>
          <CardDescription>Ingresá con tu cuenta de empleado</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="empleado@resto.com"
            />
            <Input
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-inset ring-red-200">
                {error}
              </p>
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
