
/* ==========================================
   MÓDULO PRODUCTOS
   Salsamentaria Primavera
========================================== */

document.addEventListener('DOMContentLoaded', () => {

  const API_PRODUCTOS = 'http://localhost:4000/api/productos';

  const buscador = document.getElementById('buscarProducto');
  const categoria = document.getElementById('filtroCategoria');
  const estado = document.getElementById('filtroEstado');

  const tabla = document.getElementById('tablaProductos');
  const sinResultados = document.getElementById('sinResultados');
  const resumen = document.getElementById('resumenProductos');
  const paginacion = document.getElementById('paginacionProductos');

  // Ejecutar únicamente en la página Productos.
  if (!buscador || !categoria || !estado || !tabla) {
    return;
  }

  const registrosPorPagina = 5;

  let productos = [];
  let productosFiltrados = [];
  let paginaActual = 1;

  /* ========================================
     FUNCIONES AUXILIARES
  ======================================== */

  function normalizar(texto) {
    return String(texto ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function formatoPrecio(valor) {
    return Number(valor).toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    });
  }

  function obtenerEstado(producto) {

    if (
      producto.estado !== undefined &&
      Number(producto.estado) === 0
    ) {
      return 'inactivo';
    }

    if (
      Number(producto.stock_actual) <=
      Number(producto.stock_minimo)
    ) {
      return 'bajo';
    }

    return 'disponible';
  }

  function crearCelda(texto) {
    const celda = document.createElement('td');
    celda.textContent = texto;
    return celda;
  }

  /* ========================================
     CREAR FILAS DE PRODUCTOS
  ======================================== */

  function crearFila(producto) {

    const fila = document.createElement('tr');

    fila.dataset.nombre = producto.nombre;
    fila.dataset.codigo = producto.codigo;
    fila.dataset.categoria = producto.categoria;
    fila.dataset.estado = obtenerEstado(producto);

    // NOMBRE
    const celdaNombre = document.createElement('td');

    const contenedor = document.createElement('div');
    contenedor.className = 'productos__nombre';

    const icono = document.createElement('span');
    icono.className = 'productos__icono';

    const elementoIcono = document.createElement('i');
    elementoIcono.setAttribute('data-lucide', 'package');

    icono.appendChild(elementoIcono);

    const nombre = document.createElement('strong');
    nombre.textContent = producto.nombre;

    contenedor.append(icono, nombre);
    celdaNombre.appendChild(contenedor);

    fila.appendChild(celdaNombre);

    // CÓDIGO
    fila.appendChild(
      crearCelda(producto.codigo)
    );

    // CATEGORÍA
    fila.appendChild(
      crearCelda(producto.categoria)
    );

    // EXISTENCIAS
    const celdaStock = document.createElement('td');

    const stock = document.createElement('strong');
    stock.textContent =
      `${producto.stock_actual} unidades`;

    celdaStock.appendChild(stock);
    fila.appendChild(celdaStock);

    // PRECIO
    fila.appendChild(
      crearCelda(formatoPrecio(producto.precio_venta))
    );

    // ESTADO
    const celdaEstado = document.createElement('td');
    const etiqueta = document.createElement('span');

    const estadoProducto = obtenerEstado(producto);

    etiqueta.className =
      'productos__estado productos__estado--' +
      estadoProducto;

    const nombresEstado = {
      disponible: 'Disponible',
      bajo: 'Stock bajo',
      inactivo: 'Inactivo'
    };

    etiqueta.textContent = nombresEstado[estadoProducto];

    celdaEstado.appendChild(etiqueta);
    fila.appendChild(celdaEstado);

    // ACCIONES
    const celdaAcciones = document.createElement('td');
    
    const boton = document.createElement('button');

    boton.type = 'button';
    boton.className = 'productos__accion';

    // Identificar el producto que se desea editar.
    boton.dataset.editarProducto = producto.id_producto;

    boton.setAttribute(
      'aria-label',
      `Editar ${producto.nombre}`
    );

    boton.title = `Editar ${producto.nombre}`;


    const iconoAccion = document.createElement('i');
    iconoAccion.setAttribute('data-lucide', 'ellipsis');

    boton.appendChild(iconoAccion);
    celdaAcciones.appendChild(boton);

    fila.appendChild(celdaAcciones);

    return fila;
  }

  /* ========================================
     PAGINACIÓN
  ======================================== */

  function crearBoton(
    texto,
    pagina,
    deshabilitado,
    activo = false
  ) {

    const boton = document.createElement('button');

    boton.type = 'button';
    boton.textContent = texto;
    boton.disabled = deshabilitado;
    boton.className = 'productos__pagina';

    if (activo) {
      boton.classList.add('productos__pagina--activa');
      boton.setAttribute('aria-current', 'page');
    }

    boton.addEventListener('click', () => {
      paginaActual = pagina;
      mostrarPagina();
    });

    return boton;
  }

  function crearPaginacion(totalPaginas) {

    if (!paginacion) return;

    paginacion.replaceChildren();

    paginacion.appendChild(
      crearBoton(
        '‹',
        paginaActual - 1,
        paginaActual === 1
      )
    );

    for (
      let numero = 1;
      numero <= totalPaginas;
      numero++
    ) {

      paginacion.appendChild(
        crearBoton(
          String(numero),
          numero,
          false,
          numero === paginaActual
        )
      );
    }

    paginacion.appendChild(
      crearBoton(
        '›',
        paginaActual + 1,
        paginaActual === totalPaginas
      )
    );
  }

  function mostrarPagina() {

    const total = productosFiltrados.length;

    const totalPaginas = Math.max(
      1,
      Math.ceil(total / registrosPorPagina)
    );

    paginaActual = Math.min(
      Math.max(paginaActual, 1),
      totalPaginas
    );

    const inicio =
      (paginaActual - 1) * registrosPorPagina;

    const fin = inicio + registrosPorPagina;

    const productosPagina =
      productosFiltrados.slice(inicio, fin);

    tabla.replaceChildren();

    productosPagina.forEach(producto => {
      tabla.appendChild(crearFila(producto));
    });

    if (sinResultados) {
      sinResultados.textContent =
        'No se encontraron productos con esos filtros.';

      sinResultados.hidden = total !== 0;
    }

    if (resumen) {

      if (total === 0) {
        resumen.textContent = 'Mostrando 0 registros';
      } else {
        resumen.textContent =
          `Mostrando ${inicio + 1}–` +
          `${Math.min(fin, total)} de ${total} registros`;
      }
    }

    crearPaginacion(totalPaginas);

    window.lucide?.createIcons();
  }

  /* ========================================
     FILTROS
  ======================================== */

  function filtrarProductos() {

    const busqueda = normalizar(buscador.value);
    const categoriaSeleccionada = categoria.value;
    const estadoSeleccionado = estado.value;

    productosFiltrados = productos.filter(producto => {

      const coincideBusqueda = [
        producto.nombre,
        producto.codigo,
        producto.categoria
      ].some(valor =>
        normalizar(valor).includes(busqueda)
      );

      const coincideCategoria =
        categoriaSeleccionada === 'todos' ||
        producto.categoria === categoriaSeleccionada;

      const coincideEstado =
        estadoSeleccionado === 'todos' ||
        obtenerEstado(producto) === estadoSeleccionado;

      return (
        coincideBusqueda &&
        coincideCategoria &&
        coincideEstado
      );
    });

    paginaActual = 1;
    mostrarPagina();
  }

  /* ========================================
     CATEGORÍAS DESDE MYSQL
  ======================================== */

  function cargarCategorias() {

    const categorias = [
      ...new Set(
        productos.map(producto => producto.categoria)
      )
    ].sort((a, b) => a.localeCompare(b, 'es'));

    categoria.replaceChildren();

    categoria.add(
      new Option('Todas las categorías', 'todos')
    );

    categorias.forEach(nombre => {
      categoria.add(new Option(nombre, nombre));
    });
  }

  /* ========================================
     CONSULTAR PRODUCTOS DESDE MYSQL
  ======================================== */

  async function cargarProductos() {

    try {

      if (resumen) {
        resumen.textContent = 'Cargando productos...';
      }

      const respuesta = await fetch(API_PRODUCTOS);

      if (!respuesta.ok) {
        throw new Error(
          'No se pudieron consultar los productos'
        );
      }

      const datos = await respuesta.json();

      if (!Array.isArray(datos)) {
        throw new Error(
          'El servidor no devolvió una lista de productos'
        );
      }

      productos = datos;

      cargarCategorias();
      filtrarProductos();

      console.log(
        `${productos.length} productos cargados desde MySQL`
      );

    } catch (error) {

      console.error(
        'Error al cargar productos:',
        error
      );

      tabla.replaceChildren();

      productos = [];
      productosFiltrados = [];

      if (resumen) {
        resumen.textContent =
          'Error al cargar productos';
      }

      if (paginacion) {
        paginacion.replaceChildren();
      }

      if (sinResultados) {
        sinResultados.textContent =
          'No fue posible conectar con el servidor. ' +
          'Verifica que el backend esté activo.';

        sinResultados.hidden = false;
      }
    }
  }

  /* ========================================
     EVENTOS
  ======================================== */

  buscador.addEventListener(
    'input',
    filtrarProductos
  );

  categoria.addEventListener(
    'change',
    filtrarProductos
  );

  
estado.addEventListener(
  'change',
  filtrarProductos
);

/* ========================================
   EDITAR PRODUCTO
======================================== */

tabla.addEventListener('click', evento => {

  const boton = evento.target.closest(
    '[data-editar-producto]'
  );

  if (!boton) return;

  const idProducto = Number(
    boton.dataset.editarProducto
  );

  if (
    !Number.isSafeInteger(idProducto) ||
    idProducto <= 0
  ) {
    console.error('ID de producto no válido.');
    return;
  }

  // Abrir la pantalla de edición.
  window.location.href =
    `editar-producto.html?id=${idProducto}`;

});

// Cargar información al abrir la página.
cargarProductos();


});


/* ==========================================
   FORMULARIO NUEVO PRODUCTO
========================================== */

document.addEventListener('DOMContentLoaded', () => {

  const formulario =
    document.getElementById('formNuevoProducto');

  const nombre =
    document.getElementById('nombreProducto');

  const unidad =
    document.getElementById('unidadProducto');

  const existencia =
    document.getElementById('existenciaProducto');

  const vistaNombre =
    document.getElementById('vistaNombre');

  const vistaTipo =
    document.getElementById('vistaTipo');

  const vistaInventario =
    document.getElementById('vistaInventario');

  const aviso =
    document.getElementById('avisoPresentacion');

  const mensaje =
    document.getElementById('mensajeProducto');

  const opciones =
    document.querySelectorAll('.nuevo-producto__opcion');

  const radios =
    document.querySelectorAll(
      'input[name="tipoProducto"]'
    );

  if (!formulario) return;

  /* ========================================
     TIPO DE PRODUCTO
  ======================================== */

  function obtenerTipo() {
    return document.querySelector(
      'input[name="tipoProducto"]:checked'
    )?.value || 'granel';
  }

  /* ========================================
     VISTA PREVIA
  ======================================== */

  function actualizarVista() {

    vistaNombre.textContent =
      nombre.value.trim() || 'Vista del producto';

    vistaTipo.textContent =
      obtenerTipo() === 'granel'
        ? 'A granel'
        : 'Empacado';

    vistaInventario.textContent =
      `${existencia.value || 0} ${unidad.value}`;
  }

  /* ========================================
     UNIDADES SEGÚN TIPO
  ======================================== */

  function cambiarTipo() {

    const tipo = obtenerTipo();

    opciones.forEach(opcion => {

      const radio = opcion.querySelector('input');

      opcion.classList.toggle(
        'nuevo-producto__opcion--activa',
        radio.checked
      );
    });

    if (tipo === 'granel') {

      unidad.innerHTML = `
        <option value="kg">Kilogramos (kg)</option>
        <option value="g">Gramos (g)</option>
        <option value="lb">Libras (lb)</option>
      `;

      aviso.hidden = false;

    } else {

      unidad.innerHTML = `
        <option value="und">Unidades (und)</option>
        <option value="paq">Paquetes (paq)</option>
      `;

      aviso.hidden = true;
    }

    actualizarVista();
  }

  /* ========================================
     EVENTOS
  ======================================== */

  nombre.addEventListener(
    'input',
    actualizarVista
  );

  unidad.addEventListener(
    'change',
    actualizarVista
  );

  existencia.addEventListener(
    'input',
    actualizarVista
  );

  radios.forEach(radio => {
    radio.addEventListener(
      'change',
      cambiarTipo
    );
  });

  /* ========================================
     GUARDAR DEMOSTRACIÓN LOCAL
  ======================================== */

  formulario.addEventListener('submit', evento => {

    evento.preventDefault();

    if (!formulario.reportValidity()) return;

    const datos = Object.fromEntries(
      new FormData(formulario).entries()
    );

    // Esta función todavía no registra
    // productos en MySQL.

    try {

      localStorage.setItem(
        'salsamentaria_producto_demo',
        JSON.stringify(datos)
      );

      mensaje.textContent =
        'Formulario validado. ' +
        'Producto guardado como demostración local.';

      mensaje.style.color = '#155b3d';

    } catch (error) {

      mensaje.textContent =
        'Formulario validado, pero no fue ' +
        'posible guardar la demostración.';

      mensaje.style.color = '#b42318';
    }
  });

  // Estado inicial.
  cambiarTipo();

});
