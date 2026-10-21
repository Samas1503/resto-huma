# MODELO.MD — Modelo de dominio (DER + casos de uso)

Modelo conceptual de **resto-huma**: diagrama entidad-relación y casos de uso por actor. Fuente de verdad de estructura de datos antes de escribir `schema.prisma`.

> **Convenciones**: nombres de entidades en español según `GLOSARIO.MD` (RULES.MD §2). Montos siempre `Decimal` o enteros en centavos, **nunca float** (RULES.MD §7). Enums marcados con `(enum)` son contrato compartido → viven en `packages/`.
>
> **Leyenda de certeza**: ✅ decidido (DOCUMENTATION.MD §5 / GLOSARIO.MD) · 🔎 supuesto documentado (sección 3) · ⚠️ depende de decisión pendiente.

## 1. DER — Diagrama entidad-relación

```mermaid
erDiagram
    %% ============ USUARIOS / PERSONAS ============
    Usuario {
        uuid id PK
        string nombre
        string email UK
        string passwordHash
        enum rol "(enum) admin|mozo|cocina|cajero|repartidor"
        boolean activo
        datetime createdAt
    }
    RefreshToken {
        uuid id PK
        uuid usuarioId FK
        string tokenHash UK
        datetime expiresAt
        datetime revokedAt "null = vigente"
    }
    Cliente {
        uuid id PK
        string nombre
        string email UK "de la cuenta Google"
        string telefono
        string googleId UK "OAuth Google (decidido 2026-10-20)"
        datetime createdAt
    }
    Direccion {
        uuid id PK
        uuid clienteId FK
        string calle
        string ciudad
        string referencia
        boolean esPrincipal
    }

    %% ============ SALÓN ============
    Mesa {
        uuid id PK
        int numero
        int capacidad
        string zona "salón/patio/etc"
        enum estado "(enum) libre|ocupada|cuenta_pedida"
    }
    Reserva {
        uuid id PK
        uuid clienteId FK "null si es manual del local"
        uuid mesaId FK "null hasta asignar"
        uuid creadaPorId FK "usuario del local, null si la hizo el cliente"
        datetime fechaHora
        int cantidadPersonas
        string telefonoContacto
        enum estado "(enum) pendiente|confirmada|cancelada|cumplida|no_show"
        string notas
    }
    Turno {
        uuid id PK
        enum tipo "(enum) almuerzo|cena"
        date fecha
        datetime apertura
        datetime cierre "null = abierto"
    }
    MozoMesaTurno {
        uuid id PK
        uuid mozoId FK
        uuid mesaId FK
        uuid turnoId FK
    }

    %% ============ MENÚ / INSUMOS ============
    Producto {
        uuid id PK
        string nombre
        enum categoria "(enum) empanada|plato_regional|bebida|postre"
        decimal precioBase
        boolean disponible
        boolean activo
    }
    Variedad {
        uuid id PK
        uuid productoId FK
        string nombre "carne, humita, etc"
        decimal precio "null = usa precioBase del producto"
        boolean disponible
    }
    Insumo {
        uuid id PK
        string nombre
        string unidadMedida "kg, litro, unidad"
        decimal stockActual
        decimal stockMinimo "alerta de stock bajo"
        decimal costoUnitario
    }
    RecetaItem {
        uuid id PK
        uuid productoId FK
        uuid variedadId FK "null = aplica a todas las variedades (base); set = ajuste por variedad"
        uuid insumoId FK
        decimal cantidad "en unidadMedida del insumo, por unidad de producto"
    }
    MovimientoStock {
        uuid id PK
        uuid insumoId FK
        enum tipo "(enum) descuento_pedido|reposicion_cancelacion|compra|ajuste_manual|anulacion"
        decimal cantidad "negativo = salida"
        uuid pedidoId FK "null si es compra/ajuste"
        uuid usuarioId FK "null si automático"
        datetime createdAt
    }
    Promocion {
        uuid id PK
        string nombre
        enum tipo "(enum) porcentaje|monto_fijo|precio_combo|nxm"
        decimal valor
        date vigenciaDesde
        date vigenciaHasta
        boolean activa
    }
    PromocionProducto {
        uuid promocionId FK
        uuid productoId FK
    }

    %% ============ PEDIDOS ============
    Pedido {
        uuid id PK
        enum canal "(enum) presencial|virtual"
        enum subtipo "(enum) mesa|mostrador|takeaway|delivery"
        uuid mesaId FK "null en mostrador y virtual"
        uuid clienteId FK "null en presencial"
        uuid mozoId FK "null en virtual"
        uuid repartidorId FK "solo delivery"
        uuid reservaId FK "null si no vino de reserva"
        uuid turnoId FK
        enum estadoAtencion "(enum) pendiente|confirmado|en_preparacion|listo|en_reparto|entregado|cancelado"
        enum estadoPago "(enum) pendiente_de_cobro|cobrado"
        string direccionSnapshot "delivery: copia de la dirección al momento del pedido"
        decimal costoEnvio "0 si no aplica"
        string motivoCancelacion
        datetime createdAt
        datetime confirmadoAt
        datetime listoAt
        datetime entregadoAt
    }
    ItemPedido {
        uuid id PK
        uuid pedidoId FK
        uuid comandaId FK "null si aún no se envió a cocina"
        uuid productoId FK
        uuid variedadId FK "null en productos sin variedad"
        int cantidad
        enum presentacion "(enum) unidad|docena|media_docena" "principalmente empanadas"
        string notas "sin cebolla, bien cocida"
        decimal precioUnitario "snapshot al momento del pedido"
        decimal subtotal
    }
    Comanda {
        uuid id PK
        uuid pedidoId FK
        enum origen "(enum) mozo|sistema"
        enum estado "(enum) pendiente|en_preparacion|lista|anulada"
        uuid confirmadaPorId FK "virtual: cajero/admin que la aceptó"
        datetime createdAt
    }
    DescuentoAplicado {
        uuid id PK
        uuid pedidoId FK "null si aplica a ítem"
        uuid itemPedidoId FK "null si aplica a todo el pedido"
        uuid promocionId FK "null si es cortesía manual"
        enum tipo "(enum) monto|porcentaje"
        decimal valor
        string motivo
    }

    %% ============ FINANZAS ============
    Pago {
        uuid id PK
        uuid pedidoId FK
        uuid cajaId FK
        uuid registradoPorId FK
        decimal monto
        enum medioPago "(enum) efectivo|debito|credito|transferencia|billetera_virtual"
        decimal propina "0 default"
        string referenciaExterna "⚠️ id transacción pasarela online"
        datetime createdAt
    }
    Caja {
        uuid id PK
        uuid turnoId FK
        uuid responsableId FK "cajero que abrió"
        decimal montoInicial
        enum estado "(enum) abierta|cerrada"
        datetime apertura
    }
    CierreCaja {
        uuid id PK
        uuid cajaId FK
        uuid cerradoPorId FK
        decimal ingresosEsperados
        decimal egresosEsperados
        decimal dineroFisico
        decimal diferencia
        datetime createdAt
    }
    Egreso {
        uuid id PK
        uuid cajaId FK
        uuid registradoPorId FK
        enum categoria "(enum) compra_insumos|sueldos|servicios|alquiler|otros"
        decimal monto
        string descripcion
        datetime createdAt
    }
    Anulacion {
        uuid id PK
        uuid pagoId FK
        uuid autorizadoPorId FK "rol admin"
        string motivo
        boolean reponeStock
        datetime createdAt
    }
    Configuracion {
        string clave PK
        string valor "ej: canal_virtual.pago_online_habilitado = true"
    }

    %% ============ RELACIONES ============
    Usuario ||--o{ RefreshToken : tiene
    Cliente ||--o{ Direccion : guarda
    Turno ||--o{ MozoMesaTurno : asigna
    Usuario ||--o{ MozoMesaTurno : "atendida por"
    Mesa ||--o{ MozoMesaTurno : cubre
    Cliente ||--o{ Reserva : hace
    Mesa ||--o{ Reserva : "reservada en"
    Turno ||--o{ Pedido : agrupa
    Mesa ||--o{ Pedido : "ocupa (null = mostrador/virtual)"
    Cliente ||--o{ Pedido : realiza
    Usuario ||--o{ Pedido : "toma (mozo) / reparte (repartidor)"
    Reserva ||--o{ Pedido : "origina (opcional)"
    Pedido ||--|{ ItemPedido : contiene
    Pedido ||--o{ Comanda : genera
    Comanda ||--o{ ItemPedido : incluye
    Producto ||--|{ Variedad : ofrece
    Producto ||--o{ ItemPedido : pedido_en
    Variedad ||--o{ ItemPedido : elegida_en
    Producto ||--|{ RecetaItem : "receta base"
    Variedad ||--o{ RecetaItem : "ajuste por variedad"
    Insumo ||--o{ RecetaItem : consumido_en
    Insumo ||--o{ MovimientoStock : mueve
    Pedido ||--o{ MovimientoStock : descuenta
    Pedido ||--o{ DescuentoAplicado : recibe
    ItemPedido ||--o{ DescuentoAplicado : recibe
    Promocion ||--o{ DescuentoAplicado : origina
    Promocion ||--o{ PromocionProducto : compone
    Producto ||--o{ PromocionProducto : incluido_en
    Pedido ||--o{ Pago : "se cobra con (N pagos mixtos)"
    Turno ||--o{ Caja : "tiene"
    Caja ||--o{ Pago : registra
    Caja ||--o{ Egreso : registra
    Caja ||--|| CierreCaja : "cierra en"
    Usuario ||--o{ Pago : cobra
    Usuario ||--o{ Egreso : registra
    Pago ||--o{ Anulacion : revertida_por
```

### Notas del DER

- **`Venta` NO es entidad**: una venta = `Pedido` con `estadoPago = cobrado` (decisión documentada en §3). El módulo "Ventas" opera sobre pedidos cobrados + pagos.
- **`Cuenta` NO es entidad**: es la proyección del `Pedido` abierto de una mesa (ítems + comandas acumulados). El evento es el estado de mesa `cuenta_pedida`.
- **`Ingreso` NO es entidad**: derivado de `Pago` en caja; el cierre concilia `sum(pagos) − sum(egresos)` vs `dineroFisico`.
- **Comanda ↔ ítems**: `ItemPedido.comandaId` agrupa los ítems de cada tanda; una adición = nueva comanda con nuevos ítems del mismo pedido.
- **Receta mixta** (decidido): `RecetaItem.variedadId = null` → insumo base del producto (masa, packaging); `variedadId` set → insumo específico de esa variedad (carne, humita).
- **Cobro virtual configurable** (decidido): `Configuracion` K/V guarda si el canal acepta pago online, al retirar/contra-entrega, o ambos.

## 2. Casos de uso por actor

```mermaid
flowchart LR
    subgraph Actores
        CL[Cliente virtual]
        MZ[Mozo]
        CO[Cocina]
        CJ[Cajero]
        RP[Repartidor]
        AD[Admin]
        SI((Sistema))
    end

    subgraph Pedidos_y_salon
        UC1[Registrarse con Google]
        UC2[Armar pedido virtual<br/>takeaway/delivery]
        UC3[Pagar online anticipado]
        UC4[Ver estado de mi pedido]
        UC5[Reservar mesa]
        UC6[Abrir cuenta en mesa]
        UC7[Tomar pedido / adiciones]
        UC8[Enviar comanda a cocina]
        UC9[Entregar platos en mesa]
        UC10[Pedir la cuenta]
        UC11[Venta rapida mostrador]
    end

    subgraph Cocina_y_confirmacion
        UC12[Ver comandas pendientes]
        UC13[Marcar en preparacion / lista]
        UC14[Confirmar pedido virtual<br/>via bandeja]
        UC15[Generar comanda automatica]
    end

    subgraph Caja_y_finanzas
        UC16[Cobrar pedido<br/>pagos mixtos + propina]
        UC17[Cobrar mostrador]
        UC18[Registrar egreso]
        UC19[Abrir caja]
        UC20[Cerrar caja y conciliar]
        UC21[Autorizar anulacion]
    end

    subgraph Delivery
        UC22[Tomar pedido listo]
        UC23[Marcar en reparto]
        UC24[Confirmar entrega]
    end

    subgraph Administracion
        UC25[Gestionar menu<br/>productos/variedades/precios]
        UC26[Gestionar insumos/recetas/stock]
        UC27[Gestionar usuarios y roles]
        UC28[Gestionar promociones]
        UC29[Gestionar reservas]
        UC30[Ver reportes ventas/costo]
        UC31[Configurar canales de cobro]
        UC32[Asignar mozos a mesas/turnos]
    end

    subgraph Stock_automatico
        UC33[Descontar stock al confirmar]
        UC34[Reponer stock en cancelacion]
        UC35[Alertar stock bajo]
    end

    CL --> UC1 & UC2 & UC3 & UC4 & UC5
    MZ --> UC6 & UC7 & UC8 & UC9 & UC10 & UC11
    CO --> UC12 & UC13
    CJ --> UC14 & UC16 & UC17 & UC18 & UC19 & UC20
    RP --> UC22 & UC23 & UC24
    AD --> UC21 & UC25 & UC26 & UC27 & UC28 & UC29 & UC30 & UC31 & UC32
    SI --> UC15 & UC33 & UC34 & UC35

    UC2 -.-> UC14 : requiere confirmacion
    UC14 -.-> UC15 : dispara
    UC14 -.-> UC33 : dispara
    UC7 -.-> UC8 : genera
    UC10 -.-> UC16 : lleva a
    UC3 -.-> UC16 : registrado como pago
```

## 3. Supuestos documentados (no confirmados por el usuario)

Estas decisiones de modelado se tomaron por inferencia del glosario; **validar o corregir en la spec correspondiente**:

| # | Supuesto | Alternativa |
|---|---|---|
| S1 | `Venta` ≡ Pedido cobrado (vista/derivada, no tabla) | Entidad `Venta` separada con datos fiscales (⚠️ pendiente AFIP) |
| S2 | `Cuenta` = proyección del pedido abierto, no tabla | Tabla `Cuenta` si se separan consumos por comensal |
| S3 | `Caja` tiene apertura con `montoInicial` (sesión real) | Caja como mera proyección de pagos por turno |
| S4 | `Ingreso` derivado de `Pago`, sin tabla propia | Tabla `Ingreso` si hay ingresos no-pedido (alquileres, etc.) |
| S5 | `EstadoComanda`: `pendiente→en_preparacion→lista→anulada` (subconjunto del ciclo de atención) | Estados propios distintos |
| S6 | Precio en `Producto.precioBase` + override opcional en `Variedad.precio` | Precio solo en Variedad |
| S7 | Contra-entrega: el repartidor confirma entrega y el **cajero registra el pago** | Repartidor con app registra el cobro en campo |
| S8 | `Repartidor` es `Usuario` con login (empleado propio) | Repartidor tercero sin cuenta → referencia por nombre |
| S9 | `Direccion` persistida por `Cliente` + **snapshot** textual en `Pedido` | Solo snapshot, sin historial de direcciones |
| S10 | Anulaciones las autoriza rol `admin` (`requiere rol autorizado` del glosario) | Cajero puede auto-autorizar hasta un monto |
| S11 | `MozoMesaTurno` como asignación explícita admin→mozo→mesa→turno | Asignación implícita al tomar el primer pedido |
| S12 | Modificadores de ítems como texto libre (`notas`) | Catálogo de modificadores estructurado |
| S13 | `Menu` = vista/agregado de productos activos, no tabla | Cartas/menús múltiples versionados |
| S14 | `Turno` persistido (apertura/cierre manual por admin o cajero) | Turno derivado por rango horario fijo |

## 4. Decisiones pendientes que afectan este modelo

- **⚠️ Facturación/AFIP**: si se emiten comprobantes fiscales habrá que agregar `Comprobante`/`Factura` y campos impositivos en `Cliente`/`Pago` (pendiente DOCUMENTATION.MD §5).
- **Pasarela online → RESUELTA (parcial)**: puerto `PasarelaPago` en `packages/shared` (provider `manual`/`externa` por env, webhook firmado); `Pago.referenciaExterna` = id transacción del servicio. El **servicio externo es proyecto aparte** a desarrollar posteriormente.
- **⚠️ Formato de montos**: `decimal` mostrado en el DER; si se opta por centavos enteros cambia el tipo (no la estructura).
- **⚠️ Módulo redes sociales**: la cara de `Promocion` que es contenido/difusión aún no está modelada (pendiente alcance de integración).

## 5. Mapeo entidad → módulo NestJS (RULES.MD §4)

| Módulo | Entidades |
|---|---|
| `auth` / `usuarios` | Usuario, RefreshToken, Cliente (OAuth Google) |
| `menu` | Producto, Variedad, Promocion(+Producto), DescuentoAplicado |
| `pedidos` | Pedido, ItemPedido, Comanda, Configuracion (canales) |
| `salon` | Mesa, Turno, MozoMesaTurno, Reserva |
| `cocina` | (consumo de Comanda + eventos WS, sin tablas propias) |
| `finanzas` | Pago, Caja, CierreCaja, Egreso, Anulacion |
| `insumos` | Insumo, RecetaItem, MovimientoStock |
| `reportes` | (solo lectura/proyecciones sobre todo lo anterior) |
