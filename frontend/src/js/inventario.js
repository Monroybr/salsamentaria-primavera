
document.addEventListener('DOMContentLoaded', () => {

  // Datos de ejemplo mientras desarrollamos el backend.
  const productos = [
    {
      nombre: 'Jamón de cerdo premium',
      codigo: 'SAL-001',
      detalle: 'Producto base',
      tipo: 'granel',
      existencia: '18,5 kg',
      nivel: 75,
      minimo: '5 kg',
      estado: 'disponible'
    },
    {
      nombre: 'Jamón premium - Media libra',
      codigo: 'SAL-001-250',
      detalle: 'Presentación empacada',
      tipo: 'empacado',
      existencia: '36 bolsas',
      nivel: 65,
      minimo: '12 bolsas',
      estado: 'disponible'
    },
    {
      nombre: 'Jamón premium - Una libra',
      codigo: 'SAL-001-500',
      detalle: 'Presentación empacada',
      tipo: 'empacado',
      existencia: '14 bolsas',
      nivel: 35,
      minimo: '10 bolsas',
      estado: 'disponible'
    },
    {
      nombre: 'Queso campesino',
      codigo: 'LAC-014',
      detalle: 'Producto base',
      tipo: 'granel',
      existencia: '3,2 kg',
      nivel: 15,
      minimo: '5 kg',
      estado: 'bajo'
    },
    {
      nombre: 'Chorizo santarrosano - 1 kg',
      codigo: 'EMB-011',
      detalle: 'Presentación empacada',
      tipo: 'empacado',
      existencia: '8 bolsas',
      nivel: 25,
      minimo: '10 bolsas',
      estado: 'bajo'
    },
    {
      nombre: 'Mortadela tradicional',
      codigo: 'SAL-022',
      detalle: 'Producto base',
      tipo: 'granel',
      existencia: '12,7 kg',
      nivel: 65,
      minimo: '5 kg',
      estado: 'disponible'
    }
  ];

  const movimientos = [
    {
      fecha: 'Hoy, 9:30 a. m.',
      producto: 'Harina de trigo',
      tipo: 'Entrada',
      cantidad: '+10 kg',
      responsable: 'Ana Martínez'
    },
    {
      fecha: 'Hoy, 8:15 a. m.',
      producto: 'Queso campesino',
      tipo: 'Salida',
      cantidad: '-2 kg',
      responsable: 'Ana Martínez'
    },
    {
      fecha: 'Ayer, 4:20 p. m.',
      producto: 'Mortadela tradicional',
      tipo: 'Ajuste',
      cantidad: '-0,5 kg',
      responsable: 'Ana Martínez'
    }
  ];

  const tabla = document.getElementById('tablaInventario');
  const buscador = document.getElementById('buscarInventario');
  const filtroTipo = document.getElementById('filtroTipo');
  const filtroEstado = document.getElementById('filtroInventarioEstado');
  const textoPagina = document.getElementById('inventarioPaginacionTexto');
  const botonesPagina = document.getElementById('inventarioPaginacionBotones');

  let paginaActual = 1;
  const porPagina = 5;

  // Evita insertar texto del usuario como código HTML.
  function escapar(texto) {
    return String(texto).replace(/[&<>"']/g, caracter => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[caracter]);
  }

  function normalizar(texto) {
    return String(texto)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  // Filtra los productos por búsqueda, tipo y estado.
  function obtenerFiltrados() {
    const texto = normalizar(buscador.value);
    return productos.filter(producto => {
      const coincideTexto = normalizar(
        producto.nombre + ' ' + producto.codigo
      ).includes(texto);

      const coincideTipo = filtroTipo.value === 'todos' ||
        producto.tipo === filtroTipo.value;

      const coincideEstado = filtroEstado.value === 'todos' ||
        producto.estado === filtroEstado.value;

      return coincideTexto && coincideTipo && coincideEstado;
    });
  }

  // Construye las filas de la tabla.
  function renderizarInventario() {
    const filtrados = obtenerFiltrados();
    const totalPaginas = Math.max(
      1, Math.ceil(filtrados.length / porPagina)
    );

    paginaActual = Math.min(paginaActual, totalPaginas);

    const inicio = (paginaActual - 1) * porPagina;
    const visibles = filtrados.slice(inicio, inicio + porPagina);

    tabla.innerHTML = visibles.map(producto => {
      const bajo = producto.estado === 'bajo';
      const tipoTexto = producto.tipo === 'granel'
        ? 'A granel' : 'Empacado';

      return `
        <tr>
          <td>
            <div class="inventario__producto">
              <span class="inventario__producto-icono">
                <i data-lucide="${producto.tipo === 'granel'
                  ? 'package' : 'archive'}"></i>
              </span>
              <div>
                <strong>${escapar(producto.nombre)}</strong>
                <small>${escapar(producto.codigo)} ·
                  ${escapar(producto.detalle)}</small>
              </div>
            </div>
          </td>
          <td>
            <span class="inventario__tipo inventario__tipo--${producto.tipo}">
              ${tipoTexto}
            </span>
          </td>
          <td><strong>${escapar(producto.existencia)}</strong></td>
          <td>
            <div class="inventario__nivel">
              <div class="inventario__nivel-pista">
                <span class="${bajo ? 'bajo' : ''}"
                      style="width:${producto.nivel}%"></span>
              </div>
              <small>${producto.nivel}%</small>
            </div>
          </td>
          <td>${escapar(producto.minimo)}</td>
          <td>
            <span class="inventario__estado ${bajo ? 'bajo' : ''}">
              ${bajo ? 'Stock bajo' : 'Disponible'}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    document.getElementById('inventarioSinResultados').hidden =
      filtrados.length > 0;

    const desde = filtrados.length ? inicio + 1 : 0;
    const hasta = Math.min(inicio + porPagina, filtrados.length);

    textoPagina.textContent =
      `Mostrando ${desde}–${hasta} de ${filtrados.length} registros`;

    // Crea los controles de paginación.
    botonesPagina.innerHTML = '';

    function agregarBoton(texto, pagina, deshabilitado, activo = false) {
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

    agregarBoton('‹', paginaActual - 1, paginaActual === 1);

    for (let numero = 1; numero <= totalPaginas; numero++) {
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

    window.lucide?.createIcons();
  }

  // Cambia el contenido según la pestaña seleccionada.
  const pestanas = document.querySelectorAll('.inventario__pestana');

  function cambiarPestana(nombre) {
    pestanas.forEach(boton => {
      const activa = boton.dataset.tab === nombre;
      boton.classList.toggle('activa', activa);
      boton.setAttribute('aria-selected', String(activa));
    });

    document.querySelectorAll('.inventario__panel')
      .forEach(panel => {
        panel.hidden = panel.id !== `panel-${nombre}`;
      });
  }

  pestanas.forEach(boton => {
    boton.addEventListener('click', () => {
      cambiarPestana(boton.dataset.tab);
    });
  });

  document.getElementById('verTodasAlertas')
    ?.addEventListener('click', () => cambiarPestana('alertas'));

  // Muestra los movimientos de ejemplo.
  const tablaMovimientos = document.getElementById('tablaMovimientos');

  tablaMovimientos.innerHTML = movimientos.map(movimiento => `
    <tr>
      <td>${escapar(movimiento.fecha)}</td>
      <td>${escapar(movimiento.producto)}</td>
      <td>${escapar(movimiento.tipo)}</td>
      <td><strong>${escapar(movimiento.cantidad)}</strong></td>
      <td>${escapar(movimiento.responsable)}</td>
    </tr>
  `).join('');

  // Muestra las alertas de los productos de ejemplo.
  const listaAlertas = document.getElementById('listaAlertas');
  const productosBajos = productos.filter(p => p.estado === 'bajo');

  listaAlertas.innerHTML = productosBajos.map(producto => `
    <article class="inventario__alerta">
      <i data-lucide="alert-triangle"></i>
      <div>
        <strong>${escapar(producto.nombre)}</strong>
        <small>Disponible: ${escapar(producto.existencia)}</small>
        <small>Stock mínimo: ${escapar(producto.minimo)}</small>
      </div>
    </article>
  `).join('');

  // Actualiza la tabla cuando se modifican los filtros.
  [buscador, filtroTipo, filtroEstado].forEach(control => {
    control.addEventListener(
      control === buscador ? 'input' : 'change',
      () => {
        paginaActual = 1;
        renderizarInventario();
      }
    );
  });

  renderizarInventario();
  cambiarPestana('existencias');
});
