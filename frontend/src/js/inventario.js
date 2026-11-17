document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // CONFIGURACIÓN
  // ==========================================

  const API_URL = 'http://localhost:4000/api';
  const porPagina = 5;

  let productos = [];
  let movimientos = [];
  let paginaActual = 1;

  // ==========================================
  // ELEMENTOS HTML
  // ==========================================

  const obtener = id => document.getElementById(id);

  const tabla = obtener('tablaInventario');
  const buscador = obtener('buscarInventario');
  const filtroTipo = obtener('filtroTipo');
  const filtroEstado = obtener('filtroInventarioEstado');
  const botonesPagina = obtener('inventarioPaginacionBotones');
  const tablaMovimientos = obtener('tablaMovimientos');
  const listaAlertas = obtener('listaAlertas');
  const alertasLaterales = obtener('alertasLaterales');

  // ==========================================
  // FUNCIONES AUXILIARES
  // ==========================================

  function escapar(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, caracter => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[caracter]);
  }

  function normalizar(texto) {
    return String(texto ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function escribir(id, texto) {
    const elemento = obtener(id);

    if (elemento) {
      elemento.textContent = String(texto);
    }
  }

  function actualizarIconos() {
    window.lucide?.createIcons();
  }

  function formatearNumero(numero) {
    return Number(numero).toLocaleString('es-CO', {
      maximumFractionDigits: 2
    });
  }

  // ==========================================
  // NORMALIZAR PRODUCTOS DE MYSQL
  // ==========================================

  function transformarProducto(producto) {
    const stock = Number(producto.stock_actual);
    const minimo = Number(producto.stock_minimo);

    const stockValido =
      producto.stock_actual != null &&
      Number.isFinite(stock) &&
      stock >= 0;

    const minimoValido =
      producto.stock_minimo != null &&
      Number.isFinite(minimo) &&
      minimo >= 0;

    const stockActual = stockValido ? stock : null;
    const stockMinimo = minimoValido ? minimo : null;

    const tipoRecibido = normalizar(
      producto.tipo_presentacion ??
      producto.tipo ??
      ''
    );

    let tipo = 'sin-clasificar';

    if (['granel', 'a granel'].includes(tipoRecibido)) {
      tipo = 'granel';
    }

    if (['empacado', 'empaque'].includes(tipoRecibido)) {
      tipo = 'empacado';
    }

    const bajo =
      stockValido &&
      minimoValido &&
      stockActual <= stockMinimo;

    const nivel = stockValido && minimoValido
      ? Math.min(
          100,
          Math.round(
            stockActual / Math.max(stockMinimo * 2, 1) * 100
          )
        )
      : null;

    return {
      id: producto.id_producto,
      nombre: producto.nombre || 'Producto sin nombre',
      codigo: producto.codigo || 'Sin código',
      detalle: producto.descripcion || 'Sin descripción',
      tipo,
      stockActual,
      stockMinimo,
      unidad: String(producto.unidad_medida || 'unidades'),
      nivel,
      estado: !stockValido || !minimoValido
        ? 'sin-datos'
        : bajo ? 'bajo' : 'disponible'
    };
  }

  // ==========================================
  // CONSULTAR API
  // ==========================================

  async function consultar(ruta) {
    const respuesta = await fetch(
      `${API_URL}/${ruta}`,
      { cache: 'no-store' }
    );

    if (!respuesta.ok) {
      throw new Error(
        `Error HTTP ${respuesta.status} en ${ruta}`
      );
    }

    const datos = await respuesta.json();

    if (!Array.isArray(datos)) {
      throw new Error(
        `Respuesta no válida en ${ruta}`
      );
    }

    return datos;
  }

  // ==========================================
  // CARGAR PRODUCTOS DESDE MYSQL
  // ==========================================

  async function cargarProductos() {
    escribir('totalAlertas', 'Cargando...');

    try {
      productos = (
        await consultar('productos')
      ).map(transformarProducto);

      paginaActual = 1;

      actualizarIndicadores();
      renderizarInventario();
      renderizarAlertas();

      console.log(
        'Productos cargados desde MySQL:',
        productos.length
      );

    } catch (error) {
      console.error(
        'No fue posible consultar productos:',
        error
      );

      productos = [];

      actualizarIndicadores();
      renderizarInventario();
      renderizarAlertas();

      escribir('totalAlertas', 'Sin conexión');

      escribir(
        'inventarioPaginacionTexto',
        'No fue posible cargar el inventario'
      );

      if (alertasLaterales) {
        alertasLaterales.textContent =
          'No se pudieron consultar las alertas.';
      }

      if (listaAlertas) {
        listaAlertas.textContent =
          'No se pudieron consultar las alertas.';
      }
    }
  }

  // ==========================================
  // INDICADORES DE INVENTARIO
  // ==========================================

  function actualizarIndicadores() {
    const granel = productos.filter(
      p => p.tipo === 'granel'
    ).length;

    const empacados = productos.filter(
      p => p.tipo === 'empacado'
    ).length;

    const sinClasificar = productos.some(
      p => p.tipo === 'sin-clasificar'
    );

    const alertas = productos.filter(
      p => p.estado === 'bajo'
    ).length;

    escribir(
      'totalGranel',
      sinClasificar
        ? 'Por clasificar'
        : `${granel} referencias`
    );

    escribir(
      'totalEmpacados',
      sinClasificar
        ? 'Por clasificar'
        : `${empacados} referencias`
    );

    escribir('totalAlertas', `${alertas} alertas`);
    escribir('contadorAlertasPestana', alertas);
    escribir('contadorAlertasLateral', alertas);
  }

  // ==========================================
  // FILTRAR PRODUCTOS
  // ==========================================

  function obtenerFiltrados() {
    const texto = normalizar(buscador?.value || '');

    return productos.filter(producto => {
      const coincideTexto = normalizar(
        `${producto.nombre} ${producto.codigo}`
      ).includes(texto);

      const coincideTipo =
        !filtroTipo ||
        filtroTipo.value === 'todos' ||
        producto.tipo === filtroTipo.value;

      const coincideEstado =
        !filtroEstado ||
        filtroEstado.value === 'todos' ||
        producto.estado === filtroEstado.value;

      return (
        coincideTexto &&
        coincideTipo &&
        coincideEstado
      );
    });
  }

  // ==========================================
  // MOSTRAR INVENTARIO
  // ==========================================

  function renderizarInventario() {
    if (!tabla) return;

    const filtrados = obtenerFiltrados();

    const totalPaginas = Math.max(
      1,
      Math.ceil(filtrados.length / porPagina)
    );

    paginaActual = Math.min(
      paginaActual,
      totalPaginas
    );

    const inicio = (paginaActual - 1) * porPagina;

    const visibles = filtrados.slice(
      inicio,
      inicio + porPagina
    );

    tabla.innerHTML = visibles.map(producto => {
      const bajo = producto.estado === 'bajo';

      const tipoTexto = {
        granel: 'A granel',
        empacado: 'Empacado',
        'sin-clasificar': 'Sin clasificar'
      }[producto.tipo];

      const existencia = producto.stockActual === null
        ? 'Sin dato'
        : `${formatearNumero(producto.stockActual)} ${producto.unidad}`;

      const minimo = producto.stockMinimo === null
        ? 'Sin dato'
        : `${formatearNumero(producto.stockMinimo)} ${producto.unidad}`;

      const estadoTexto = producto.estado === 'sin-datos'
        ? 'Sin datos'
        : bajo ? 'Stock bajo' : 'Disponible';

      const nivelHTML = producto.nivel === null
        ? 'Sin dato'
        : `
          <div class="inventario__nivel">
            <div class="inventario__nivel-pista">
              <span
                class="${bajo ? 'bajo' : ''}"
                style="width:${producto.nivel}%">
              </span>
            </div>
            <small>${producto.nivel}%</small>
          </div>
        `;

      return `
        <tr>
          <td>
            <div class="inventario__producto">
              <span class="inventario__producto-icono">
                <i data-lucide="package"></i>
              </span>

              <div>
                <strong>${escapar(producto.nombre)}</strong>
                <small>
                  ${escapar(producto.codigo)} ·
                  ${escapar(producto.detalle)}
                </small>
              </div>
            </div>
          </td>

          <td>
            <span class="inventario__tipo inventario__tipo--${producto.tipo}">
              ${tipoTexto}
            </span>
          </td>

          <td>
            <strong>${escapar(existencia)}</strong>
          </td>

          <td>${nivelHTML}</td>

          <td>${escapar(minimo)}</td>

          <td>
            <span class="inventario__estado ${bajo ? 'bajo' : ''}">
              ${estadoTexto}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    const sinResultados = obtener(
      'inventarioSinResultados'
    );

    if (sinResultados) {
      sinResultados.hidden = filtrados.length > 0;
    }

    const desde = filtrados.length ? inicio + 1 : 0;

    const hasta = Math.min(
      inicio + porPagina,
      filtrados.length
    );

    escribir(
      'inventarioPaginacionTexto',
      `Mostrando ${desde}–${hasta} de ${filtrados.length} registros`
    );

    renderizarPaginacion(totalPaginas);
    actualizarIconos();
  }

  // ==========================================
  // PAGINACIÓN
  // ==========================================

  function renderizarPaginacion(totalPaginas) {
    if (!botonesPagina) return;

    botonesPagina.innerHTML = '';

    function agregarBoton(
      texto,
      pagina,
      deshabilitado,
      activo = false
    ) {
      const boton = document.createElement('button');

      boton.type = 'button';
      boton.textContent = texto;
      boton.disabled = deshabilitado;
      boton.className = activo ? 'activo' : '';

      boton.addEventListener('click', () => {
        paginaActual = pagina;
        renderizarInventario();
      });

      botonesPagina.appendChild(boton);
    }

    agregarBoton(
      '‹',
      paginaActual - 1,
      paginaActual === 1
    );

    for (
      let numero = 1;
      numero <= totalPaginas;
      numero++
    ) {
      agregarBoton(
        String(numero),
        numero,
        false,
        numero === paginaActual
      );
    }

    agregarBoton(
      '›',
      paginaActual + 1,
      paginaActual === totalPaginas
    );
  }

  // ==========================================
  // ALERTAS DE INVENTARIO
  // ==========================================

  function renderizarAlertas() {
    const productosBajos = productos.filter(
      p => p.estado === 'bajo'
    );

    const crearAlerta = producto => {
      const existencia =
        `${formatearNumero(producto.stockActual)} ${producto.unidad}`;

      const minimo =
        `${formatearNumero(producto.stockMinimo)} ${producto.unidad}`;

      return `
        <article class="inventario__alerta">
          <i data-lucide="alert-triangle"></i>

          <div>
            <strong>${escapar(producto.nombre)}</strong>
            <small>Disponible: ${escapar(existencia)}</small>
            <small>Stock mínimo: ${escapar(minimo)}</small>
          </div>
        </article>
      `;
    };

    if (listaAlertas) {
      listaAlertas.innerHTML = productosBajos.length
        ? productosBajos.map(crearAlerta).join('')
        : '<p>No hay productos con stock bajo.</p>';
    }

    if (alertasLaterales) {
      alertasLaterales.innerHTML = productosBajos.length
        ? productosBajos.slice(0, 3).map(crearAlerta).join('')
        : '<p>No hay alertas pendientes.</p>';
    }

    actualizarIconos();
  }

  // ==========================================
  // FECHAS DE MOVIMIENTOS
  // ==========================================

  const zonaHoraria = 'America/Bogota';

  const formatoDia = new Intl.DateTimeFormat('en-CA', {
    timeZone: zonaHoraria,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const formatoFecha = new Intl.DateTimeFormat('es-CO', {
    timeZone: zonaHoraria,
    dateStyle: 'short',
    timeStyle: 'short'
  });

  function fechaValida(valor) {
    if (!valor) return null;

    const fecha = new Date(valor);

    return Number.isNaN(fecha.getTime())
      ? null
      : fecha;
  }

  function diaColombia(fecha) {
    return formatoDia.format(fecha);
  }

  // ==========================================
  // INDICADOR MOVIMIENTOS DE HOY
  // ==========================================

  function actualizarMovimientosHoy() {
    const hoy = diaColombia(new Date());

    const cantidad = movimientos.filter(movimiento => {
      const fecha = fechaValida(
        movimiento.fecha_movimiento
      );

      return fecha && diaColombia(fecha) === hoy;
    }).length;

    escribir(
      'totalMovimientos',
      `${cantidad} registros`
    );
  }

  // ==========================================
  // MOSTRAR MOVIMIENTOS DE MYSQL
  // ==========================================

  function renderizarMovimientos() {
    if (!tablaMovimientos) return;

    if (!movimientos.length) {
      tablaMovimientos.innerHTML = `
        <tr>
          <td colspan="5">
            No hay movimientos registrados.
          </td>
        </tr>
      `;

      escribir(
        'mensajeMovimientos',
        'No hay movimientos registrados.'
      );

      return;
    }

    tablaMovimientos.innerHTML = movimientos.map(
      movimiento => {
        const fecha = fechaValida(
          movimiento.fecha_movimiento
        );

        const fechaTexto = fecha
          ? formatoFecha.format(fecha)
          : 'Sin fecha';

        const tipo = String(
          movimiento.tipo_movimiento || ''
        ).toUpperCase();

        const signo = tipo === 'ENTRADA'
          ? '+'
          : tipo === 'SALIDA' ? '−' : '';

        const tipoTexto = {
          ENTRADA: 'Entrada',
          SALIDA: 'Salida',
          AJUSTE: 'Ajuste'
        }[tipo] || tipo || 'Sin tipo';

        const cantidad =
          `${signo}${formatearNumero(movimiento.cantidad ?? 0)}`;

        const responsable =
          movimiento.responsable || 'No registrado';

        return `
          <tr>
            <td>${escapar(fechaTexto)}</td>
            <td>
              ${escapar(
                movimiento.producto || 'Producto sin nombre'
              )}
            </td>
            <td>${escapar(tipoTexto)}</td>
            <td>
              <strong>${escapar(cantidad)}</strong>
            </td>
            <td>${escapar(responsable)}</td>
          </tr>
        `;
      }
    ).join('');

    escribir('mensajeMovimientos', '');
  }

  // ==========================================
  // CARGAR MOVIMIENTOS DESDE MYSQL
  // ==========================================

  async function cargarMovimientos() {
    escribir('totalMovimientos', 'Cargando...');

    escribir(
      'mensajeMovimientos',
      'Consultando movimientos...'
    );

    try {
      movimientos = await consultar('movimientos');

      renderizarMovimientos();
      actualizarMovimientosHoy();

      console.log(
        'Movimientos cargados desde MySQL:',
        movimientos.length
      );

    } catch (error) {
      console.error(
        'No fue posible consultar movimientos:',
        error
      );

      movimientos = [];

      if (tablaMovimientos) {
        tablaMovimientos.innerHTML = `
          <tr>
            <td colspan="5">
              No fue posible cargar los movimientos.
            </td>
          </tr>
        `;
      }

      escribir(
        'mensajeMovimientos',
        'No fue posible conectar con la API de movimientos.'
      );

      escribir(
        'totalMovimientos',
        'Sin conexión'
      );
    }
  }

  // ==========================================
  // PESTAÑAS
  // ==========================================

  const pestanas = document.querySelectorAll(
    '.inventario__pestana'
  );

  function cambiarPestana(nombre) {
    pestanas.forEach(boton => {
      const activa = boton.dataset.tab === nombre;

      boton.classList.toggle('activa', activa);

      boton.setAttribute(
        'aria-selected',
        String(activa)
      );
    });

    document.querySelectorAll('.inventario__panel')
      .forEach(panel => {
        panel.hidden = panel.id !== `panel-${nombre}`;
      });
  }

  pestanas.forEach(boton => {
    boton.addEventListener('click', () => {
      cambiarPestana(boton.dataset.tab);

      if (boton.dataset.tab === 'movimientos') {
        cargarMovimientos();
      }
    });
  });

  obtener('verTodasAlertas')
    ?.addEventListener('click', () => {
      cambiarPestana('alertas');
    });

  // ==========================================
  // EVENTOS DE FILTROS
  // ==========================================

  [buscador, filtroTipo, filtroEstado]
    .filter(Boolean)
    .forEach(control => {
      control.addEventListener(
        control === buscador ? 'input' : 'change',
        () => {
          paginaActual = 1;
          renderizarInventario();
        }
      );
    });

  // ==========================================
  // INICIALIZACIÓN
  // ==========================================

  cambiarPestana('existencias');

  cargarProductos();
  cargarMovimientos();
});
