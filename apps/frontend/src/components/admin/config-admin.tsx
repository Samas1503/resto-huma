'use client';

// /admin/config — edición de claves de Configuracion (GET/PUT /configuracion).
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';

const DESCRIPCION: Record<string, string> = {
  'canal_virtual.habilitado': 'Habilita pedidos virtuales',
  'canal_virtual.pago_online_habilitado': 'Cobro online anticipado en virtuales',
  'canal_virtual.payment_provider': 'Pasarela del canal virtual (manual|externa)',
  'canal_presencial.payment_provider': 'Pasarela del canal presencial',
  'delivery.costo_envio_ars': 'Costo de envío delivery (ARS entero)',
  'local.nombre': 'Nombre del local',
  'local.moneda': 'Moneda del sistema',
};

type Cfg = { clave: string; valor: string };

export function ConfigAdmin() {
  const [items, setItems] = useState<Cfg[]>([]);
  const [editando, setEditando] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const cargar = useCallback(() => {
    api.get('/configuracion')
      .then((data) => setItems(data as Cfg[]))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = (clave: string) => {
    const valor = editando[clave];
    if (valor === undefined) return;
    api.put(`/configuracion/${clave}`, { valor })
      .then(() => {
        setItems((prev) => prev.map((i) => (i.clave === clave ? { ...i, valor } : i)));
        setEditando((prev) => { const { [clave]: _omit, ...rest } = prev; return rest; });
        setSaved(clave);
        setTimeout(() => setSaved(null), 2000);
      })
      .catch((e) => setError((e as Error).message));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración del sistema</CardTitle>
        <CardDescription>Canales, pasarela de pagos y datos del local. Los cambios aplican de inmediato.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && <Badge tone="red" className="mb-3">{error}</Badge>}
        {loading ? <p className="text-zinc-500">Cargando…</p> : (
          <Table>
            <THead><TR><TH>Clave</TH><TH>Descripción</TH><TH>Valor</TH><TH /></TR></THead>
            <TBody>
              {items.map((cfg) => {
                const enEdicion = cfg.clave in editando;
                return (
                  <TR key={cfg.clave}>
                    <TD className="font-mono text-xs">{cfg.clave}</TD>
                    <TD className="text-zinc-600">{DESCRIPCION[cfg.clave] ?? '—'}</TD>
                    <TD>
                      <Input
                        value={editando[cfg.clave] ?? cfg.valor}
                        onChange={(e) => setEditando((p) => ({ ...p, [cfg.clave]: e.target.value }))}
                        className="h-8 w-48 font-mono text-xs"
                      />
                    </TD>
                    <TD>
                      {saved === cfg.clave && <Badge tone="green">Guardado</Badge>}
                      <Button size="sm" variant="secondary" disabled={!enEdicion} onClick={() => guardar(cfg.clave)}>
                        Guardar
                      </Button>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
