// Seed catálogos + demo — `pnpm --filter backend exec tsx prisma/seed.ts`
// Idempotente: upserts por claves únicas/naturales.
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const configuraciones = [
  { clave: 'canal_virtual.habilitado', valor: 'true' },
  { clave: 'canal_virtual.pago_online_habilitado', valor: 'false' },
  { clave: 'canal_virtual.payment_provider', valor: 'manual' },
  { clave: 'canal_presencial.payment_provider', valor: 'manual' },
  { clave: 'delivery.costo_envio_ars', valor: '0' },
  { clave: 'local.nombre', valor: 'Resto Huma' },
  { clave: 'local.moneda', valor: 'ARS' },
];

async function main() {
  for (const cfg of configuraciones) {
    await prisma.configuracion.upsert({ where: { clave: cfg.clave }, update: { valor: cfg.valor }, create: cfg });
  }

  // ─── Usuarios demo (uno por rol) ───────────────────────────
  const hash = await bcrypt.hash('demo1234', 10);
  const usuarios = [
    { email: 'admin@restohuma.local', nombre: 'Admin', rol: 'admin' as const },
    { email: 'mozo@restohuma.local', nombre: 'Mozo Carlos', rol: 'mozo' as const },
    { email: 'cocina@restohuma.local', nombre: 'Cocina', rol: 'cocina' as const },
    { email: 'cajero@restohuma.local', nombre: 'Cajero Ana', rol: 'cajero' as const },
    { email: 'reparto@restohuma.local', nombre: 'Repartidor Juan', rol: 'repartidor' as const },
  ];
  const userMap: Record<string, string> = {};
  for (const u of usuarios) {
    const r = await prisma.usuario.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash: hash },
    });
    userMap[u.rol] = r.id;
  }

  // ─── Mesas + turno ─────────────────────────────────────────
  for (let n = 1; n <= 8; n++) {
    await prisma.mesa.upsert({
      where: { numero: n },
      update: {},
      create: { numero: n, capacidad: n <= 4 ? 4 : 6, zona: n <= 6 ? 'salón' : 'patio' },
    });
  }
  const turno = await prisma.turno.findFirst({ where: { cierre: null } })
    ?? await prisma.turno.create({ data: { tipo: 'cena', apertura: new Date() } });

  // ─── Insumos + recetas ─────────────────────────────────────
  const insumosSeed = [
    { nombre: 'Harina 000', unidadMedida: 'kg', stockActual: '50', stockMinimo: '10', costoUnitario: '900' },
    { nombre: 'Carne molida', unidadMedida: 'kg', stockActual: '20', stockMinimo: '5', costoUnitario: '6500' },
    { nombre: 'Humita', unidadMedida: 'kg', stockActual: '15', stockMinimo: '4', costoUnitario: '2800' },
    { nombre: 'Cebolla', unidadMedida: 'kg', stockActual: '25', stockMinimo: '5', costoUnitario: '800' },
    { nombre: 'Queso', unidadMedida: 'kg', stockActual: '12', stockMinimo: '3', costoUnitario: '7200' },
    { nombre: 'Aceite', unidadMedida: 'litro', stockActual: '10', stockMinimo: '2', costoUnitario: '2400' },
    { nombre: 'Masa empanada', unidadMedida: 'docena', stockActual: '60', stockMinimo: '15', costoUnitario: '1800' },
  ];
  const ins: Record<string, string> = {};
  for (const i of insumosSeed) {
    const r = await prisma.insumo.upsert({
      where: { id: (await prisma.insumo.findFirst({ where: { nombre: i.nombre } }))?.id ?? 'no' },
      update: i,
      create: i,
    });
    ins[i.nombre] = r.id;
  }

  // ─── Productos + variedades ────────────────────────────────
  const emp = await prisma.producto.upsert({
    where: { id: (await prisma.producto.findFirst({ where: { nombre: 'Empanadas' } }))?.id ?? 'no' },
    update: {},
    create: { nombre: 'Empanadas', categoria: 'empanada', precioArs: 1200, precioUsd: '1.10' },
  });
  const variedades = ['Carne', 'Humita', 'Pollo', 'Jamón y queso', 'Verdura', 'Salteña'];
  for (const v of variedades) {
    await prisma.variedad.create({
      data: { productoId: emp.id, nombre: v },
    }).catch(() => {});
  }
  const regionales = [
    { nombre: 'Humita en olla', precioArs: 6500, precioUsd: '5.90' },
    { nombre: 'Tamales (par)', precioArs: 5200, precioUsd: '4.70' },
    { nombre: 'Locro', precioArs: 7800, precioUsd: '7.10' },
  ];
  for (const r of regionales) {
    await prisma.producto.create({ data: { ...r, categoria: 'plato_regional' } }).catch(() => {});
  }
  await prisma.producto.create({ data: { nombre: 'Gaseosa 1.5L', categoria: 'bebida', precioArs: 2800, precioUsd: '2.50' } }).catch(() => {});
  await prisma.producto.create({ data: { nombre: 'Flan casero', categoria: 'postre', precioArs: 3200, precioUsd: '2.90' } }).catch(() => {});

  // Receta base empanada: masa + relleno según variedad
  const masa = ins['Masa empanada'];
  if (masa) {
    await prisma.recetaItem.create({ data: { productoId: emp.id, insumoId: masa, cantidad: '0.083' } }).catch(() => {});
    const vCarne = await prisma.variedad.findFirst({ where: { productoId: emp.id, nombre: 'Carne' } });
    if (vCarne && ins['Carne molida']) {
      await prisma.recetaItem.create({ data: { productoId: emp.id, variedadId: vCarne.id, insumoId: ins['Carne molida'], cantidad: '0.05' } }).catch(() => {});
      await prisma.recetaItem.create({ data: { productoId: emp.id, variedadId: vCarne.id, insumoId: ins['Cebolla'], cantidad: '0.02' } }).catch(() => {});
    }
  }

  // ─── Caja abierta + pedidos demo ───────────────────────────
  const caja = await prisma.caja.findFirst({ where: { estado: 'abierta' } })
    ?? await prisma.caja.create({ data: { turnoId: turno.id, abiertaPorId: userMap.cajero, montoInicialArs: 50000 } });
  const mesa1 = await prisma.mesa.findUnique({ where: { numero: 1 } });
  const mesa2 = await prisma.mesa.findUnique({ where: { numero: 2 } });
  const cliente = await prisma.cliente.upsert({
    where: { email: 'cliente@demo.com' },
    update: {},
    create: { nombre: 'Cliente Demo', email: 'cliente@demo.com', telefono: '3884001122' },
  });

  const pedidos = [
    { subtipo: 'mesa' as const, mesaId: mesa1?.id, canal: 'presencial' as const, estadoAtencion: 'en_preparacion' as const, items: [ { productoId: emp.id, cantidad: 12, presentacion: 'docena' as const } ] },
    { subtipo: 'mostrador' as const, canal: 'presencial' as const, estadoAtencion: 'entregado' as const, items: [ { productoId: emp.id, cantidad: 6, presentacion: 'media_docena' as const } ] },
    { subtipo: 'takeaway' as const, canal: 'virtual' as const, estadoAtencion: 'pendiente' as const, clienteId: cliente.id, items: [ { productoId: emp.id, cantidad: 12, presentacion: 'docena' as const } ] },
    { subtipo: 'delivery' as const, canal: 'virtual' as const, estadoAtencion: 'listo' as const, clienteId: cliente.id, direccionSnapshot: 'Belgrano 450, Humahuaca', items: [ { productoId: emp.id, cantidad: 24, presentacion: 'docena' as const } ] },
  ];
  for (const p of pedidos) {
    const pedido = await prisma.pedido.create({
      data: {
        turnoId: turno.id, canal: p.canal, subtipo: p.subtipo, mesaId: p.mesaId ?? null,
        clienteId: p.clienteId ?? null, mozoId: p.canal === 'presencial' ? userMap.mozo : null,
        direccionSnapshot: p.direccionSnapshot ?? null,
        estadoAtencion: p.estadoAtencion,
        confirmadoAt: p.estadoAtencion !== 'pendiente' ? new Date() : null,
        listoAt: ['listo', 'entregado'].includes(p.estadoAtencion) ? new Date() : null,
        entregadoAt: p.estadoAtencion === 'entregado' ? new Date() : null,
      },
    });
    for (const it of p.items) {
      await prisma.itemPedido.create({
        data: {
          pedidoId: pedido.id, productoId: it.productoId, cantidad: it.cantidad,
          presentacion: it.presentacion, precioUnitarioArs: 1200, precioUnitarioUsd: '1.10',
          subtotalArs: 1200 * it.cantidad,
        },
      });
    }
  }
  if (mesa1) await prisma.mesa.update({ where: { id: mesa1.id }, data: { estado: 'ocupada' } });

  // Reservas demo
  if (mesa2) {
    await prisma.reserva.create({ data: { clienteId: cliente.id, mesaId: mesa2.id, fechaHora: new Date(Date.now() + 86400000), cantidadPersonas: 4, telefonoContacto: '3884001122', estado: 'confirmada' } }).catch(() => {});
    await prisma.reserva.create({ data: { mesaId: mesa2.id, fechaHora: new Date(Date.now() + 172800000), cantidadPersonas: 2, telefonoContacto: '3884556677', estado: 'pendiente', notas: 'Invitada: María' } }).catch(() => {});
  }

  console.log('Seed demo OK: usuarios, mesas, turno, insumos, productos, pedidos, reservas, caja abierta');
}

main().finally(() => prisma.$disconnect());
