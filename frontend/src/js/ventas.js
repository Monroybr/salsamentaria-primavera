
document.addEventListener('DOMContentLoaded', () => {

  // Elementos principales.
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

  const CLAVE = 'salsamentaria_ventas';
  const POR_PAGINA = 5;

  let paginaActual = 1;
  let filtradas = [];

  // Fecha local en formato YYYY-MM-DD.
  function fechaLocal(diasAtras = 0) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - diasAtras);

    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }

  // Ventas de ejemplo para el prototipo.
  const ejemplos = [
    {
      id: 'V-1048',
      cliente: 'María Rodríguez',
      fecha: fechaLocal(),
      hora: '10:42 a. m.',
      medioPago: 'efectivo',
      tipo: 'contado',
      total: 86400,
      productos: []
    },
    {
      id: 'V-1047',
      cliente: 'Tienda El Portal',
      fecha: fechaLocal(),
      hora: '9:18 a. m.',
      medioPago: 'credito',
      tipo: 'credito',
      total: 214800,
      productos: []
    },
    {
      id: 'V-1046',
      cliente: 'Carlos Méndez',
      fecha: fechaLocal(1),
      hora: '5:34 p. m.',
      medioPago: 'transferencia',
      tipo: 'contado',
      total: 48200,
      productos: []
    },
    {
      id: 'V-1045',
      cliente: 'Panadería Central',
      fecha: fechaLocal(1),
      hora: '3:07 p. m.',
      medioPago: 'credito',
      tipo: 'credito',
      total: 176500,
      productos: []
    }
  ];

  // Leer las ventas registradas desde Nueva venta.
  function leerGuardadas() {
    try {
      const datos = JSON.parse(localStorage.getItem(CLAVE) || '[]');
      return Array.isArray(datos) ? datos : [];
    } catch {
      return [];
    }
  }

  const guardadas = leerGuardadas();
  const idsGuardados = new Set(guardadas.map(v => v.id));

  const ventas = [
    ...guardadas,
    ...ejemplos.filter(v => !idsGuardados.has(v.id))
  ];

  // Formato de pesos colombianos.
  function dinero(valor) {
    return '$' + Number(valor).toLocaleString('es-CO', {
      maximumFractionDigits: 0
    });
  }

  function normalizar(texto) {
    return String(texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  // Fecha visible en la tabla.
  function mostrarFecha(venta) {
    let etiqueta = venta.fecha;

    if (venta.fecha === fechaLocal()) etiqueta = 'Hoy';
    else if (venta.fecha === fechaLocal(1)) etiqueta = 'Ayer';

    return `${etiqueta}, ${venta.hora || ''}`;
  }

  // Actualizar los cuatro indicadores.
  function actualizarIndicadores() {
    const deHoy = ventas.filter(v => v.fecha === fechaLocal());

    const total = deHoy.reduce(
      (suma, venta) => suma + Number(venta.total), 0
    );

    const credito = deHoy
      .filter(v => v.tipo === 'credito')
      .reduce((suma, venta) => suma + Number(venta.total), 0);

    document.getElementById('ventasHoy').textContent = dinero(total);
    document.getElementById('transaccionesHoy').textContent = deHoy.length;

    document.getElementById('ventaPromedio').textContent =
      dinero(deHoy.length ? total / deHoy.length : 0);

    document.getElementById('ventasCredito').textContent = dinero(credito);
  }

  // Crear una celda sin insertar HTML del usuario.
  function celda(texto, clase = '') {
    const td = document.createElement('td');
    td.textContent = texto;
    if (clase) td.className = clase;
    return td;
  }

  // Mostrar las filas de la página actual.
  function mostrarTabla() {
    tabla.innerHTML = '';

    const total = filtradas.length;
    const paginas = Math.ceil(total / POR_PAGINA);
    const inicio = (paginaActual - 1) * POR_PAGINA;

    filtradas.slice(inicio, inicio + POR_PAGINA).forEach(venta => {
      const fila = document.createElement('tr');

      fila.appendChild(celda(venta.id, 'ventas__codigo'));
      fila.appendChild(celda(venta.cliente));
      fila.appendChild(celda(mostrarFecha(venta)));

      const tdPago = document.createElement('td');
      const etiqueta = document.createElement('span');

      etiqueta.className = 'ventas__estado ' +
        (venta.tipo === 'credito'
          ? 'ventas__estado--credito'
          : 'ventas__estado--contado');

      etiqueta.textContent = venta.tipo === 'credito'
        ? 'Crédito'
        : venta.medioPago === 'transferencia'
          ? 'Transferencia'
          : 'Efectivo';

      tdPago.appendChild(etiqueta);
      fila.appendChild(tdPago);

      fila.appendChild(celda(dinero(venta.total), 'ventas__importe'));

      const tdAcciones = document.createElement('td');
      const boton = document.createElement('button');

      boton.type = 'button';
      boton.className = 'ventas__accion';
      boton.setAttribute('aria-label', `Ver venta ${venta.id}`);
      boton.textContent = '•••';

      boton.addEventListener('click', () => mostrarDetalle(venta));

      tdAcciones.appendChild(boton);
      fila.appendChild(tdAcciones);
      tabla.appendChild(fila);
    });

    sinVentas.hidden = total !== 0;

    contador.textContent = total === 0
      ? 'Mostrando 0 registros'
      : `Mostrando ${inicio + 1}–${Math.min(inicio + POR_PAGINA, total)} de ${total} registros`;

    // Paginación.
    paginacion.innerHTML = '';

    if (paginas > 1) {
      agregarPagina('‹', paginaActual - 1, paginaActual === 1);

      for (let n = 1; n <= paginas; n++) {
        agregarPagina(String(n), n, false, n === paginaActual);
      }

      agregarPagina('›', paginaActual + 1, paginaActual === paginas);
    }
  }

  function agregarPagina(texto, numero, deshabilitado, activo = false) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.textContent = texto;
    boton.disabled = deshabilitado;

    if (activo) boton.classList.add('activo');

    boton.addEventListener('click', () => {
      paginaActual = numero;
      mostrarTabla();
    });

    paginacion.appendChild(boton);
  }

  // Consultar la información de una venta.
  function mostrarDetalle(venta) {
    contenidoDetalle.replaceChildren();

    function agregarTexto(etiqueta, valor) {
      const p = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = etiqueta + ': ';
      p.append(strong, document.createTextNode(String(valor)));
      contenidoDetalle.appendChild(p);
    }

    agregarTexto('Venta', venta.id);
    agregarTexto('Cliente', venta.cliente);
    agregarTexto('Fecha', mostrarFecha(venta));
    agregarTexto('Medio de pago', venta.medioPago);
    agregarTexto('Total', dinero(venta.total));

    if (venta.productos && venta.productos.length) {
      const titulo = document.createElement('h3');
      titulo.textContent = 'Productos';
      contenidoDetalle.appendChild(titulo);

      const lista = document.createElement('ul');

      venta.productos.forEach(producto => {
        const item = document.createElement('li');
        item.textContent =
          `${producto.nombre} (${producto.presentacion}) × ${producto.cantidad}`;
        lista.appendChild(item);
      });

      contenidoDetalle.appendChild(lista);
    } else {
      agregarTexto('Productos', 'Detalle no disponible en datos de ejemplo');
    }

    dialogo.showModal();
  }

  document.getElementById('cerrarDetalle').addEventListener(
    'click', () => dialogo.close()
  );

  // Buscar y filtrar.
  function filtrar() {
    const texto = normalizar(buscador.value);
    const periodo = filtroFecha.value;
    const pago = filtroPago.value;

    filtradas = ventas.filter(venta => {
      const coincideTexto =
        normalizar(venta.id).includes(texto) ||
        normalizar(venta.cliente).includes(texto);

      const coincidePago =
        pago === 'todos' || venta.medioPago === pago;

      let coincideFecha = true;

      if (periodo === 'hoy') {
        coincideFecha = venta.fecha === fechaLocal();
      } else if (periodo === 'ayer') {
        coincideFecha = venta.fecha === fechaLocal(1);
      } else if (periodo === 'semana') {
        const inicioSemana = new Date();
        const dia = (inicioSemana.getDay() + 6) % 7;
        inicioSemana.setDate(inicioSemana.getDate() - dia);
        inicioSemana.setHours(0, 0, 0, 0);

        const fechaVenta = new Date(`${venta.fecha}T00:00:00`);
        coincideFecha = fechaVenta >= inicioSemana &&
          fechaVenta <= new Date();
      }

      return coincideTexto && coincidePago && coincideFecha;
    });

    paginaActual = 1;
    mostrarTabla();
  }

  // Exportar las ventas filtradas.
  document.getElementById('exportarVentas').addEventListener('click', () => {
    if (!filtradas.length) {
      alert('No hay ventas para exportar.');
      return;
    }

    const filas = [
      ['Venta', 'Cliente', 'Fecha', 'Medio de pago', 'Total'],
      ...filtradas.map(v => [
        v.id, v.cliente, v.fecha, v.medioPago, v.total
      ])
    ];

    const escapar = valor => {
      let texto = String(valor ?? '');
      if (/^\s*[=+\-@]/.test(texto)) texto = "'" + texto;
      return `"${texto.replace(/"/g, '""')}"`;
    };

    const csv = filas.map(
      fila => fila.map(escapar).join(';')
    ).join('\r\n');

    const blob = new Blob(
      ['\uFEFF' + csv],
      { type: 'text/csv;charset=utf-8' }
    );

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');

    enlace.href = url;
    enlace.download = 'ventas.csv';
    enlace.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  buscador.addEventListener('input', filtrar);
  filtroFecha.addEventListener('change', filtrar);
  filtroPago.addEventListener('change', filtrar);

  actualizarIndicadores();
  filtrar();

  if (window.lucide) window.lucide.createIcons();
});
