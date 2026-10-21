# GLOSARIO.MD — Terminología del dominio

Glosario de términos del negocio para que agentes de IA y desarrolladores hablen el mismo idioma que el restaurante. Los términos en **negrita** pueden usarse como nombres en el código (ver `RULES.MD` §2).

## Producto y menú

| Término | Definición |
|---|---|
| **Empanada** | Producto principal del local. Se vende por unidad o docena, en variedades de relleno (carne, pollo, jamón y queso, humita, etc.) y tipos de cocción (horno, frita). |
| **Comida regional** | Platos típicos del norte argentino (NOA): humitas, tamales, locro, empanadas salteñas/tucumanas, carbonada, etc. El sistema debe soportarlos además de empanadas. |
| **Menú / Carta** | Conjunto de productos ofrecidos con precio y disponibilidad. Sinónimos: *menu*, *carta*. |
| **Variedad** | Subtipo de un producto (ej.: empanada de carne, empanada de humita). |
| **Producto** | Ítem vendible del menú: empanada, plato regional, bebida, postre. |
| **Disponibilidad** | Si un producto/variedad puede venderse en un momento dado (stock, horario, temporada). |
| **Promoción / Promo** | Oferta o descuento (ej.: docena de empanadas, combo). También contenido difundido en redes sociales. |

## Operación del salón

| Término | Definición |
|---|---|
| **Mozo / Moza** | Empleado que atiende mesas, toma pedidos y los entrega. En otros países: *mesero*, *camarero*. Rol del sistema. |
| **Mesa** | Unidad física de atención en el salón; los pedidos presenciales se asocian a una mesa. |
| **Comanda** | Ticket/orden de preparación que el mozo (o el sistema, en pedidos virtuales) envía a cocina. Derivada de un pedido; un pedido puede tener **varias comandas** por adiciones. Tiene estado propio en cocina. |
| **Pedido / Orden** | Solicitud de productos de un cliente. Puede ser **presencial** (tomada por mozo en mesa) o **virtual** (online: para llevar o delivery). |
| **Ítem de pedido / Línea** | Unidad dentro de un pedido: producto + variedad + cantidad + notas/modificadores ("sin cebolla", "bien cocida") + precio unitario congelado al momento del pedido. |
| **Cuenta** | Acumulado de un pedido presencial en una mesa: la mesa suma ítems (y comandas) hasta que el comensal **pide la cuenta** y paga. **Es una vista del pedido abierto, no una entidad** (ver MODELO.MD). |
| **Presentación** | Formato de venta de un ítem: `unidad`, `docena`, `media docena` (aplica principalmente a empanadas). Afecta cantidad y precio. |
| **Estado de pedido** | Ciclo de **atención**: `pendiente → confirmado → en preparación → listo → entregado` (delivery agrega `en reparto` entre `listo` y `entregado`; o `cancelado`). El **cobro** es un ciclo separado (`pendiente de cobro → cobrado`): puede ocurrir antes (pago online anticipado), durante (al retirar) o después (cuenta en mesa) de la entrega. |
| **Estado de mesa** | Ciclo de la mesa: `libre → ocupada → cuenta pedida → libre`. Independiente del estado de cada pedido. |
| **Estado de comanda** | Ciclo de la comanda en cocina: `pendiente → en preparación → lista` (o `anulada`). |
| **Reserva** | Reserva de mesa por un cliente a fecha/hora futura (módulo propio, estilo Eat App). Estados: `pendiente → confirmada → cumplida` (o `cancelada`/`no_show`). Puede originar el pedido presencial de esa mesa. |
| **Turno** | Franja de servicio (almuerzo/cena) que agrupa ventas y actividad de mozos. |
| **Mostrador** | Venta presencial rápida sin mesa (ej.: cliente pide 2 docenas en caja y se va). Genera pedido presencial sin `Mesa` asociada. |

## Canales de venta

| Término | Definición |
|---|---|
| **Presencial** | Venta en el local: mozo toma el pedido en la mesa o mostrador. |
| **Virtual / Online** | Pedido hecho por el cliente desde la web u otro canal digital. |
| **Para llevar (takeaway)** | Pedido virtual retirado en el local. |
| **Delivery** | Pedido virtual entregado a domicilio. |
| **Cliente** | Persona que hace un pedido virtual. Tiene **cuenta registrada con Google** (OAuth); guarda nombre, teléfono y direcciones para delivery. Los pedidos presenciales no requieren cliente identificado. |
| **Dirección** | Dirección guardada de un cliente (1 cliente → N direcciones). En pedidos de delivery se copia como snapshot al pedido. |
| **Repartidor** | Persona que entrega pedidos de delivery a domicilio. Rol operativo (puede ser empleado propio o tercero). |
| **En reparto** | Estado de un pedido de delivery que salió del local hacia el domicilio. |
| **Confirmación de pedido** | Aceptación del pedido por parte del local. Obligatoria en pedidos virtuales (alguien/sistema confirma antes de mandar a cocina); en presencial el mozo confirma al enviar la comanda. Dispara el descuento de stock. |
| **Redes sociales** | Canales de difusión (Instagram, Facebook, WhatsApp) para promocionar menú y novedades. |

## Finanzas e insumos

| Término | Definición |
|---|---|
| **Ingreso** | Entrada de dinero: ventas cobradas (efectivo, tarjeta, billetera virtual, transferencia). |
| **Egreso** | Salida de dinero: compra de insumos, sueldos, servicios, alquiler, otros gastos. |
| **Venta** | Pedido con `estadoPago = cobrado`. **No es entidad separada** — es una vista/derivada de pedido + pago (ver MODELO.MD). |
| **Caja** | Sesión de dinero de un turno: tiene **apertura** (responsable, monto inicial) y cierre. Agrupa pagos y egresos del turno. |
| **Cierre de caja** | Proceso de conciliación al final del turno/día: ingresos − egresos vs. dinero físico contado; registra la diferencia. |
| **Pago / Cobro** | Evento monetario sobre un pedido: monto, medio de pago y hora. Un pedido puede tener varios pagos (pago mixto/dividido). Configurable por canal: virtual admite online anticipado y/o al retirar-contra entrega. |
| **Propina** | Monto voluntario del cliente sobre la cuenta; se registra en el pago y en caja. |
| **Descuento aplicado** | Rebaja sobre un pedido o ítem (promo, cortesía, docena). Distinto de `Promoción` (la oferta en sí): el descuento es su efecto monetario en un pedido concreto. |
| **Anulación / Devolución** | Reversión de una venta ya cobrada (distinto de `cancelado`, que es antes del cobro). Requiere motivo y autorización de **admin**; afecta caja y puede reponer stock. |
| **Insumo** | Materia prima o recurso consumible (harina, carne, queso, aceite, packaging). |
| **Stock / Inventario** | Cantidad disponible de cada insumo (y eventualmente producto elaborado). **Se descuenta al confirmar el pedido**; cancelaciones posteriores evalúan reposición según avance de preparación. |
| **Movimiento de stock** | Registro de auditoría de cada cambio de stock: `descuento_pedido`, `reposicion_cancelacion`, `compra`, `ajuste_manual`, `anulacion`. |
| **Receta / Ficha técnica** | Relación entre un producto y los insumos que consume (para costeo y descuento de stock). **Mixta**: insumos base por producto + ajustes por variedad (ver MODELO.MD). |
| **Costo de mercadería** | Costo de insumos usados para producir lo vendido; clave para el margen. |
| **Medio de pago** | Forma de cobro: efectivo, débito, crédito, transferencia, billetera virtual (ej.: Mercado Pago). |
| **ARS** | Peso argentino. Precios se guardan **duales**: `precioArs` en **enteros** + `precioUsd` en **dólares con 2 decimales**. Finanzas (pagos, caja, egresos) en ARS entero. Nunca flotantes (RULES.MD §7). |
| **USD** | Dólar estadounidense como segunda moneda de precios (2 decimales, `Decimal(12,2)`). |

## Roles del sistema

| Rol | Permisos esperados |
|---|---|
| **Admin** | Acceso total: configuración, menú, finanzas, reportes, usuarios. |
| **Mozo** | Tomar pedidos presenciales, gestionar sus mesas, ver estado de comandas. |
| **Cocina** | Ver y actualizar estado de comandas. |
| **Cajero** | Cobrar pedidos, registrar egresos, hacer cierre de caja. |
| **Repartidor** | Entregar pedidos de delivery; marca `en reparto` y confirma entrega. |

## Regionales / Argentina

| Término | Definición |
|---|---|
| **NOA** | Noroeste Argentino (Jujuy, Salta, Tucumán, Catamarca, La Rioja, Santiago del Estero): origen de la cocina del local. |
| **Humita** | Preparación de choclo (maíz) cremoso; en empanadas o como plato. |
| **Tamal** | Masa de maíz rellena, cocida en hoja de chala. |
| **Locro** | Guiso regional de maíz, zapallo y carnes (típico en fechas patrias). |
| **Empanada salteña / tucumana** | Estilos regionales de empanada (jugosa de carne cortada a cuchillo / con matambre). |
