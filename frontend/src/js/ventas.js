document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // =====================================================
  // CONFIGURACIÓN
  // =====================================================

  const API_URL = 'http://localhost:4000/api/ventas';
  const POR_PAGINA = 5;

  const tabla = document.getElementById('tablaVentas');

  if (!tabla) return;

  const buscador = document.getElementById('buscarVenta');
  const filtroFecha = document.getElementById('filtroFecha');
  const filtroPago = document.getElementById('filtroPago');
  const contador = document.getElementById('textoPaginacionVentas');
  const paginacion = document.getElementById('paginacionVentas');
  const sinVentas = document.getElementById('sinVentas');
  const dialogo = document.getElementById('detalleVenta');
  const contenidoDetalle = document.getElementById('contenidoDetalle');
  const cerrarDetalle = document.getElementById('cerrarDetalle');
  const botonExportar = document.getElementById('exportarVentas');

  let ventas = [];
  let filtradas = [];
  let paginaActual = 1;

  // =====================================================
  // FUNCIONES GENERALES
  // =====================================================

  function dinero(valor) {
    const numero = Number(valor);

    return '$' + (Number.isFinite(numero) ? numero : 0)
      .toLocaleString('es-CO', {
        maximumFractionDigits: 0
      });
  }

  function normalizar(texto) {
    return String(texto ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function fechaLocal(diasAtras = 0) {
    const fecha = new Date();

    fecha.setDate(fecha.getDate() - diasAtras);

    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }

  function convertirFecha(valor) {
    if (!valor) return '';

    const texto = String(valor);

    // MySQL puede devolver "2026-11-17 15:37:00".
    if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
      return texto.substring(0, 10);
    }

    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) return '';

    return [
      fecha.getFullYear(),
      String(fecha.getMonth() + 1).padStart(2, '0'),
      String(fecha.getDate()).padStart(2, '0')
    ].join('-');
  }

  function convertirHora(valor) {
    if (!valor) return '';

    const texto = String(valor);

    // Conserva la hora devuelta por MySQL.
    const coincidencia = texto.match(
      /(?:T|\s)(\d{2}):(\d{2})(?::\d{2})?/
    );

    if (coincidencia) {
      const horas = Number(coincidencia[1]);
      const minutos = coincidencia[2];

      const hora12 = horas % 12 || 12;
      const periodo = horas >= 12 ? 'p. m.' : 'a. m.';

      return `${hora12}:${minutos} ${periodo}`;
    }

    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) return '';

    return fecha.toLocaleTimeString('es-CO', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  function mostrarFecha(venta) {
    let etiqueta = venta.fecha || 'Sin fecha';

    if (venta.fecha === fechaLocal()) {
      etiqueta = 'Hoy';
    } else if (venta.fecha === fechaLocal(1)) {
      etiqueta = 'Ayer';
    }

    return venta.hora
      ? `${etiqueta}, ${venta.hora}`
      : etiqueta;
  }

  function establecerTexto(id, valor) {
    const elemento = document.getElementById(id);

    if (elemento) {
      elemento.textContent = valor;
    }
  }

  function mostrarEstado(mensaje) {
    tabla.replaceChildren();

    const fila = document.createElement('tr');
    const celda = document.createElement('td');

    celda.colSpan = 6;
    celda.textContent = mensaje;
    celda.style.textAlign = 'center';
    celda.style.padding = '20px';

    fila.appendChild(celda);
    tabla.appendChild(fila);
  }

  // =====================================================
  // NORMALIZAR REGISTROS DEL BACKEND
  // =====================================================

  function normalizarVenta(registro) {
    const idReal = registro.id_venta ??
      registro.idVenta ??
      registro.id;

    const tipoOriginal = normalizar(
      registro.tipo_venta ??
      registro.tipoVenta ??
      registro.tipo ??
      'CONTADO'
    );

    const tipo = tipoOriginal === 'credito'
      ? 'credito'
      : 'contado';

    const medioOriginal = normalizar(
      registro.metodo_pago ??
      registro.medio_pago ??
      registro.medioPago ??
      (tipo === 'credito' ? 'credito' : 'efectivo')
    );

    let medioPago = medioOriginal;

    if (tipo === 'credito') {
      medioPago = 'credito';
    }

    const fechaOriginal = registro.fecha_venta ??
      registro.fechaVenta ??
      registro.fecha;

    let productos = registro.productos ??
      registro.detalles ??
      registro.detalle ??
      [];

    if (typeof productos === 'string') {
      try {
        productos = JSON.parse(productos);
      } catch {
        productos = [];
      }
    }

    if (!Array.isArray(productos)) {
      productos = [];
    }

    return {
      id: idReal != null ? `V-${idReal}` : 'Sin número',
      idReal,
      cliente: registro.cliente_nombre ??
        registro.nombre_cliente ??
        registro.nombreCliente ??
        registro.cliente?.nombre ??
        registro.cliente ??
        (tipo === 'credito'
          ? 'Cliente no especificado'
          : 'Consumidor final'),
      fecha: convertirFecha(fechaOriginal),
      hora: convertirHora(fechaOriginal),
      tipo,
      medioPago,
      total: Number(registro.total ?? 0),
      productos,
      observaciones: registro.observaciones ??
        registro.notas ??
        registro.observacion ??
        ''
    };
  }

  // =====================================================
  // CONSULTAR VENTAS REALES DESDE MYSQL
  // =====================================================

  async function cargarVentas() {
    mostrarEstado('Cargando ventas desde MySQL...');

    if (sinVentas) sinVentas.hidden = true;

    try {
      const respuesta = await fetch(API_URL, {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        },
        cache: 'no-store'
      });

      if (!respuesta.ok) {
        throw new Error(
          `Error HTTP ${respuesta.status} al consultar las ventas.`
        );
      }

      const datos = await respuesta.json();

      // Admite:
      // [...]
      // { ventas: [...] }
      // { data: [...] }
      // { resultados: [...] }

      const registros = Array.isArray(datos)
        ? datos
        : datos.ventas ??
          datos.data ??
          datos.resultados;

      if (!Array.isArray(registros)) {
        throw new Error(
          'La API no devolvió una lista válida de ventas.'
        );
      }

      ventas = registros
        .map(normalizarVenta)
        .sort((a, b) => {
          const fechaA = `${a.fecha} ${a.hora}`;
          const fechaB = `${b.fecha} ${b.hora}`;

          if (a.fecha !== b.fecha) {
            return b.fecha.localeCompare(a.fecha);
          }

          return Number(b.idReal || 0) -
            Number(a.idReal || 0);
        });

      actualizarIndicadores();
      filtrar();

      console.log(
        `${ventas.length} ventas cargadas desde MySQL.`,
        ventas
      );

    } catch (error) {
      console.error('Error cargando ventas:', error);

      ventas = [];
      filtradas = [];

      actualizarIndicadores();

      mostrarEstado(
        'No fue posible cargar las ventas desde el servidor. ' +
        'Verifica que el backend esté funcionando y que exista ' +
        'la ruta GET /api/ventas.'
      );

      if (contador) {
        contador.textContent = 'No se pudieron cargar los registros';
      }

      if (paginacion) {
        paginacion.replaceChildren();
      }
    }
  }

  // =====================================================
  // INDICADORES DEL PANEL
  // =====================================================

  function actualizarIndicadores() {
    const deHoy = ventas.filter(
      venta => venta.fecha === fechaLocal()
    );

    const totalHoy = deHoy.reduce(
      (suma, venta) => suma + venta.total,
      0
    );

    const creditoHoy = deHoy
      .filter(venta => venta.tipo === 'credito')
      .reduce(
        (suma, venta) => suma + venta.total,
        0
      );

    const promedio = deHoy.length
      ? totalHoy / deHoy.length
      : 0;

    establecerTexto('ventasHoy', dinero(totalHoy));
    establecerTexto('transaccionesHoy', deHoy.length);
    establecerTexto('ventaPromedio', dinero(promedio));
    establecerTexto('ventasCredito', dinero(creditoHoy));
  }

  // =====================================================
  // CREACIÓN DE CELDAS
  // =====================================================

  function crearCelda(texto, clase = '') {
    const td = document.createElement('td');

    td.textContent = String(texto ?? '');

    if (clase) {
      td.className = clase;
    }

    return td;
  }

  // =====================================================
  // TABLA DE VENTAS
  // =====================================================

  function mostrarTabla() {
    tabla.replaceChildren();

    const total = filtradas.length;
    const paginas = Math.ceil(total / POR_PAGINA);

    if (paginaActual > paginas && paginas > 0) {
      paginaActual = paginas;
    }

    const inicio = (paginaActual - 1) * POR_PAGINA;

    const registrosPagina = filtradas.slice(
      inicio,
      inicio + POR_PAGINA
    );

    registrosPagina.forEach(venta => {
      const fila = document.createElement('tr');

      fila.appendChild(
        crearCelda(venta.id, 'ventas__codigo')
      );

      fila.appendChild(
        crearCelda(venta.cliente)
      );

      fila.appendChild(
        crearCelda(mostrarFecha(venta))
      );

      // Medio de pago.
      const tdPago = document.createElement('td');
      const etiqueta = document.createElement('span');

      etiqueta.className = 'ventas__estado ' +
        (venta.tipo === 'credito'
          ? 'ventas__estado--credito'
          : 'ventas__estado--contado');

      etiqueta.textContent =
        venta.tipo === 'credito'
          ? 'Crédito'
          : venta.medioPago === 'transferencia'
            ? 'Transferencia'
            : 'Efectivo';

      tdPago.appendChild(etiqueta);
      fila.appendChild(tdPago);

      // Total.
      fila.appendChild(
        crearCelda(dinero(venta.total), 'ventas__importe')
      );

      // Acciones.
      const tdAcciones = document.createElement('td');
      const boton = document.createElement('button');

      boton.type = 'button';
      boton.className = 'ventas__accion';
      boton.textContent = '•••';

      boton.setAttribute(
        'aria-label',
        `Ver detalle de la venta ${venta.id}`
      );

      boton.addEventListener('click', () => {
        mostrarDetalle(venta);
      });

      tdAcciones.appendChild(boton);
      fila.appendChild(tdAcciones);

      tabla.appendChild(fila);
    });

    if (sinVentas) {
      sinVentas.hidden = total !== 0;
    }

    if (contador) {
      contador.textContent = total === 0
        ? 'Mostrando 0 registros'
        : `Mostrando ${inicio + 1}–${Math.min(
            inicio + POR_PAGINA,
            total
          )} de ${total} registros`;
    }

    // Paginación.
    if (paginacion) {
      paginacion.replaceChildren();

      if (paginas > 1) {
        agregarPagina(
          '‹',
          paginaActual - 1,
          paginaActual === 1
        );

        for (let numero = 1; numero <= paginas; numero++) {
          agregarPagina(
            String(numero),
            numero,
            false,
            numero === paginaActual
          );
        }

        agregarPagina(
          '›',
          paginaActual + 1,
          paginaActual === paginas
        );
      }
    }
  }

  // =====================================================
  // PAGINACIÓN
  // =====================================================

  function agregarPagina(
    texto,
    numero,
    deshabilitado,
    activo = false
  ) {
    if (!paginacion) return;

    const boton = document.createElement('button');

    boton.type = 'button';
    boton.textContent = texto;
    boton.disabled = deshabilitado;

    if (activo) {
      boton.classList.add('activo');
    }

    boton.addEventListener('click', () => {
      paginaActual = numero;
      mostrarTabla();
    });

    paginacion.appendChild(boton);
  }

  // =====================================================
  // DETALLE DE UNA VENTA
  // =====================================================

  async function mostrarDetalle(venta) {
    if (!dialogo || !contenidoDetalle) return;

    contenidoDetalle.replaceChildren();

    function agregarTexto(etiqueta, valor) {
      const parrafo = document.createElement('p');
      const strong = document.createElement('strong');

      strong.textContent = `${etiqueta}: `;

      parrafo.append(
        strong,
        document.createTextNode(String(valor ?? ''))
      );

      contenidoDetalle.appendChild(parrafo);
    }

    agregarTexto('Venta', venta.id);
    agregarTexto('Cliente', venta.cliente);
    agregarTexto('Fecha', mostrarFecha(venta));
    agregarTexto(
      'Tipo de venta',
      venta.tipo === 'credito' ? 'Crédito' : 'Contado'
    );
    agregarTexto('Medio de pago', venta.medioPago);
    agregarTexto('Total', dinero(venta.total));

    if (venta.observaciones) {
      agregarTexto('Observaciones', venta.observaciones);
    }

    // El listado puede incluir productos. Si no los incluye,
    // se intenta consultar el detalle individual.

    let productos = venta.productos;

    if (!productos.length && venta.idReal != null) {
      try {
        const respuesta = await fetch(
          `${API_URL}/${encodeURIComponent(venta.idReal)}`,
          {
            headers: {
              Accept: 'application/json'
            }
          }
        );

        if (respuesta.ok) {
          const datos = await respuesta.json();

          const detalle = datos.venta ?? datos;

          productos = detalle.productos ??
            detalle.detalles ??
            detalle.detalle ??
            [];

          if (!Array.isArray(productos)) {
            productos = [];
          }
        }
      } catch (error) {
        console.warn(
          'No se pudo consultar el detalle de la venta:',
          error
        );
      }
    }

    if (productos.length > 0) {
      const titulo = document.createElement('h3');
      titulo.textContent = 'Productos';

      contenidoDetalle.appendChild(titulo);

      const lista = document.createElement('ul');

      productos.forEach(producto => {
        const item = document.createElement('li');

        const nombre = producto.nombre ??
          producto.nombre_producto ??
          producto.producto ??
          `Producto ${producto.id_producto ?? ''}`;

        const presentacion = producto.presentacion ??
          producto.nombre_presentacion ??
          (
            producto.id_presentacion != null
              ? `Presentación ${producto.id_presentacion}`
              : ''
          );

        const cantidad = Number(producto.cantidad ?? 0);

        const precio = Number(
          producto.precio_unitario ??
          producto.precio ??
          0
        );

        const subtotal = Number(
          producto.subtotal ??
          cantidad * precio
        );

        item.textContent =
          `${nombre}` +
          (presentacion ? ` (${presentacion})` : '') +
          ` × ${cantidad} — ${dinero(subtotal)}`;

        lista.appendChild(item);
      });

      contenidoDetalle.appendChild(lista);
    } else {
      agregarTexto(
        'Productos',
        'El detalle de productos no está disponible en la API.'
      );
    }

    if (!dialogo.open) {
      dialogo.showModal();
    }
  }

  if (cerrarDetalle && dialogo) {
    cerrarDetalle.addEventListener('click', () => {
      dialogo.close();
    });
  }

  // =====================================================
  // BÚSQUEDA Y FILTROS
  // =====================================================

  function filtrar() {
    const texto = normalizar(buscador?.value);
    const periodo = filtroFecha?.value ?? 'todos';
    const pago = normalizar(filtroPago?.value ?? 'todos');

    filtradas = ventas.filter(venta => {
      const coincideTexto =
        normalizar(venta.id).includes(texto) ||
        normalizar(venta.cliente).includes(texto);

      const coincidePago =
        pago === 'todos' ||
        pago === '' ||
        venta.medioPago === pago ||
        (pago === 'credito' && venta.tipo === 'credito') ||
        (
          pago === 'contado' &&
          venta.tipo === 'contado'
        );

      let coincideFecha = true;

      if (periodo === 'hoy') {
        coincideFecha = venta.fecha === fechaLocal();

      } else if (periodo === 'ayer') {
        coincideFecha = venta.fecha === fechaLocal(1);

      } else if (periodo === 'semana') {
        const inicioSemana = new Date();

        const dia = (inicioSemana.getDay() + 6) % 7;

        inicioSemana.setDate(
          inicioSemana.getDate() - dia
        );

        inicioSemana.setHours(0, 0, 0, 0);

        const fechaVenta = new Date(
          `${venta.fecha}T00:00:00`
        );

        coincideFecha =
          !Number.isNaN(fechaVenta.getTime()) &&
          fechaVenta >= inicioSemana &&
          fechaVenta <= new Date();

      } else if (periodo === 'mes') {
        coincideFecha =
          venta.fecha.substring(0, 7) ===
          fechaLocal().substring(0, 7);
      }

      return (
        coincideTexto &&
        coincidePago &&
        coincideFecha
      );
    });

    paginaActual = 1;

    mostrarTabla();
  }

  // =====================================================
  // EXPORTAR CSV
  // =====================================================

  function exportarVentas() {
    if (!filtradas.length) {
      alert('No hay ventas para exportar.');
      return;
    }

    const filas = [
      [
        'Venta',
        'Cliente',
        'Fecha',
        'Tipo de venta',
        'Medio de pago',
        'Total'
      ],
      ...filtradas.map(venta => [
        venta.id,
        venta.cliente,
        venta.fecha,
        venta.tipo,
        venta.medioPago,
        venta.total
      ])
    ];

    function escaparCSV(valor) {
      let texto = String(valor ?? '');

      // Evita que una hoja de cálculo interprete
      // texto externo como una fórmula.
      if (/^\s*[=+\-@\t\r]/.test(texto)) {
        texto = "'" + texto;
      }

      return `"${texto.replace(/"/g, '""')}"`;
    }

    const csv = filas
      .map(fila => fila.map(escaparCSV).join(';'))
      .join('\r\n');

    const blob = new Blob(
      ['\uFEFF' + csv],
      {
        type: 'text/csv;charset=utf-8'
      }
    );

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');

    enlace.href = url;
    enlace.download = `ventas_${fechaLocal()}.csv`;

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  // =====================================================
  // EVENTOS
  // =====================================================

  if (buscador) {
    buscador.addEventListener('input', filtrar);
  }

  if (filtroFecha) {
    filtroFecha.addEventListener('change', filtrar);
  }

  if (filtroPago) {
    filtroPago.addEventListener('change', filtrar);
  }

  if (botonExportar) {
    botonExportar.addEventListener('click', exportarVentas);
  }

  // =====================================================
  // INICIALIZACIÓN
  // =====================================================

  cargarVentas();

  if (window.lucide) {
    window.lucide.createIcons();
  }
});
