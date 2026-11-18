document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const API_BASE = 'http://localhost:4000/api';

  const $ = (id) => document.getElementById(id);

  const el = {
    formulario: $('formNuevaVenta'),
    numero: $('numeroNuevaVenta'),
    buscar: $('buscarProductoVenta'),
    disponibles: $('productosDisponibles'),
    detalle: $('detalleProductosVenta'),
    contador: $('contadorProductosVenta'),
    agregar: $('agregarOtroProducto'),
    campoCliente: $('campoCliente'),
    cliente: $('clienteVenta'),
    campoMedio: $('campoMedioPago'),
    medio: $('medioPagoVenta'),
    campoRecibido: $('campoValorRecibido'),
    recibido: $('valorRecibido'),
    campoCambio: $('campoCambio'),
    cambio: $('cambioVenta'),
    subtotal: $('subtotalVenta'),
    total: $('totalVenta'),
    notas: $('notasVenta'),
    mensaje: $('mensajeVenta'),
    guardar: $('registrarVenta')
  };

  if (!el.formulario) return;

  let catalogo = [];
  let carrito = [];
  let tipoVenta = 'CONTADO';
  let guardando = false;
  let cargaFallida = false;

  // ==========================================
  // FUNCIONES GENERALES
  // ==========================================

  const moneda = (valor) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(Number(valor) || 0);

  const escaparHTML = (valor) =>
    String(valor ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[c]);

  const actualizarIconos = () => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  };

  function mostrarMensaje(texto, esError = false) {
    if (!el.mensaje) return;

    el.mensaje.hidden = !texto;
    el.mensaje.textContent = texto;
    el.mensaje.style.color = esError
      ? '#b91c1c'
      : '#15803d';
  }

  // ==========================================
  // CONEXIÓN CON EL BACKEND
  // ==========================================

  async function solicitar(ruta, opciones = {}) {
    const headers = {
      Accept: 'application/json',
      ...(opciones.headers || {})
    };

    const token =
      window.PrimaveraAuth?.obtenerToken?.();

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const respuesta = await fetch(
      `${API_BASE}${ruta}`,
      {
        cache: 'no-store',
        ...opciones,
        headers
      }
    );

    const texto = await respuesta.text();

    let datos;

    try {
      datos = texto ? JSON.parse(texto) : null;
    } catch {
      throw new Error(
        'El servidor no devolvió JSON válido.'
      );
    }

    if (!respuesta.ok) {
      throw new Error(
        datos?.mensaje ||
        datos?.error ||
        `Error HTTP ${respuesta.status}`
      );
    }

    return datos;
  }

  // ==========================================
  // NORMALIZAR PRODUCTOS
  // ==========================================

  function normalizarProducto(producto) {
    const idProducto = Number(
      producto.id_producto
    );

    const idPresentacion =
      producto.id_presentacion == null
        ? null
        : Number(producto.id_presentacion);

    const esPresentacion =
      Number.isSafeInteger(idPresentacion) &&
      idPresentacion > 0;

    const precio = Number(
      producto.precio_venta
    );

    const stock = Number(
      producto.stock_actual
    );

    if (
      !Number.isSafeInteger(idProducto) ||
      idProducto <= 0 ||
      !Number.isFinite(precio) ||
      precio < 0 ||
      !Number.isFinite(stock) ||
      stock < 0
    ) {
      return null;
    }

    const clave = esPresentacion
      ? `presentacion-${idPresentacion}`
      : `producto-${idProducto}`;

    return {
      clave,
      id_producto: idProducto,
      id_presentacion: esPresentacion
        ? idPresentacion
        : null,
      codigo: String(producto.codigo ?? ''),
      nombre: String(producto.nombre ?? ''),
      peso_gramos: esPresentacion
        ? Number(producto.peso_gramos)
        : null,
      stock_actual: stock,
      precio_unitario: precio,
      descripcion: esPresentacion
        ? `${Number(producto.peso_gramos)} g`
        : 'Venta directa'
    };
  }

  // ==========================================
  // CARGAR PRODUCTOS DESDE MYSQL
  // ==========================================

  async function cargarProductos() {
    cargaFallida = false;

    if (el.disponibles) {
      el.disponibles.textContent =
        'Cargando productos...';
    }

    try {
      const datos = await solicitar(
        '/ventas/productos'
      );

      if (!Array.isArray(datos)) {
        throw new Error(
          'El catálogo de productos no es válido.'
        );
      }

      catalogo = datos
        .map(normalizarProducto)
        .filter(Boolean);

      renderizarProductos();

    } catch (error) {
      cargaFallida = true;
      catalogo = [];

      if (el.disponibles) {
        el.disponibles.textContent =
          'No se pudieron cargar los productos.';
      }

      mostrarMensaje(error.message, true);
      console.error(
        'Error cargando productos:',
        error
      );
    }
  }

  // ==========================================
  // CARGAR CLIENTES
  // ==========================================

  async function cargarClientes() {
    if (!el.cliente) return;

    el.cliente.innerHTML =
      '<option value="">Cargando clientes...</option>';

    try {
      const datos = await solicitar(
        '/ventas/clientes'
      );

      if (!Array.isArray(datos)) {
        throw new Error(
          'La lista de clientes no es válida.'
        );
      }

      el.cliente.innerHTML =
        '<option value="">Seleccionar cliente...</option>';

      datos.forEach((cliente) => {
        const opcion =
          document.createElement('option');

        opcion.value = String(
          cliente.id_cliente
        );

        opcion.textContent =
          cliente.numero_documento
            ? `${cliente.nombre} - ${cliente.numero_documento}`
            : String(cliente.nombre ?? 'Cliente');

        el.cliente.appendChild(opcion);
      });

    } catch (error) {
      el.cliente.innerHTML =
        '<option value="">No se pudieron cargar los clientes</option>';

      mostrarMensaje(error.message, true);

      console.error(
        'Error cargando clientes:',
        error
      );
    }
  }

  // ==========================================
  // MOSTRAR PRODUCTOS DISPONIBLES
  // ==========================================

  function renderizarProductos() {
    if (!el.disponibles || cargaFallida) {
      return;
    }

    const busqueda = (
      el.buscar?.value || ''
    ).trim().toLowerCase();

    const filtrados = catalogo.filter(
      (producto) => {
        const texto = `
          ${producto.nombre}
          ${producto.codigo}
          ${producto.descripcion}
        `.toLowerCase();

        return texto.includes(busqueda);
      }
    );

    el.disponibles.innerHTML = '';

    if (filtrados.length === 0) {
      el.disponibles.textContent =
        'No se encontraron productos disponibles.';
      return;
    }

    filtrados.forEach((producto) => {
      const agotado =
        producto.stock_actual < 1;

      const seleccionado = carrito.find(
        (item) => item.clave === producto.clave
      );

      const boton =
        document.createElement('button');

      boton.type = 'button';
      boton.className =
        'nueva-venta__sugerencia';

      boton.disabled = agotado;

      boton.innerHTML = `
        <span>
          <strong>
            ${escaparHTML(producto.nombre)}
          </strong>

          <small>
            ${escaparHTML(producto.codigo)}
            · ${escaparHTML(producto.descripcion)}
            · Stock: ${producto.stock_actual}
          </small>
        </span>

        <span>
          <strong>
            ${moneda(producto.precio_unitario)}
          </strong>

          <small>
            ${
              agotado
                ? 'Agotado'
                : seleccionado
                  ? 'Agregar más'
                  : 'Agregar'
            }
          </small>
        </span>
      `;

      boton.addEventListener('click', () => {
        agregarAlCarrito(producto.clave);
      });

      el.disponibles.appendChild(boton);
    });
  }

  // ==========================================
  // AGREGAR PRODUCTO AL CARRITO
  // ==========================================

  function agregarAlCarrito(clave) {
    mostrarMensaje('');

    const producto = catalogo.find(
      (item) => item.clave === clave
    );

    if (!producto) {
      mostrarMensaje(
        'El producto ya no está disponible.',
        true
      );
      return;
    }

    const existente = carrito.find(
      (item) => item.clave === clave
    );

    if (existente) {
      if (
        existente.cantidad + 1 >
        Math.floor(producto.stock_actual)
      ) {
        mostrarMensaje(
          'La cantidad supera las existencias disponibles.',
          true
        );
        return;
      }

      existente.cantidad += 1;

    } else {
      if (producto.stock_actual < 1) {
        mostrarMensaje(
          'Producto agotado.',
          true
        );
        return;
      }

      carrito.push({
        ...producto,
        cantidad: 1
      });
    }

    renderizarCarrito();
    renderizarProductos();
  }

  // ==========================================
  // CAMBIAR CANTIDAD
  // ==========================================

  function cambiarCantidad(clave, valor) {
    const item = carrito.find(
      (producto) => producto.clave === clave
    );

    if (!item) return;

    const cantidad = Number(valor);

    if (
      !Number.isSafeInteger(cantidad) ||
      cantidad < 1 ||
      cantidad > Math.floor(item.stock_actual)
    ) {
      mostrarMensaje(
        `Ingresa una cantidad válida. Stock disponible: ${item.stock_actual}.`,
        true
      );

      renderizarCarrito();
      return;
    }

    item.cantidad = cantidad;

    mostrarMensaje('');
    renderizarCarrito();
  }

  // ==========================================
  // ELIMINAR PRODUCTO
  // ==========================================

  function eliminarProducto(clave) {
    carrito = carrito.filter(
      (item) => item.clave !== clave
    );

    renderizarCarrito();
    renderizarProductos();
  }

  // ==========================================
  // CALCULAR TOTAL
  // ==========================================

  function obtenerTotal() {
    return carrito.reduce(
      (suma, producto) =>
        suma +
        producto.cantidad *
        producto.precio_unitario,
      0
    );
  }

  // ==========================================
  // CALCULAR CAMBIO
  // ==========================================

  function actualizarCambio() {
    if (!el.cambio) return;

    const recibido = Number(
      el.recibido?.value || 0
    );

    const cambio =
      tipoVenta === 'CREDITO'
        ? 0
        : Math.max(0, recibido - obtenerTotal());

    el.cambio.textContent = moneda(cambio);
  }

  // ==========================================
  // ACTUALIZAR TOTALES
  // ==========================================

  function actualizarTotales() {
    const total = obtenerTotal();

    if (el.subtotal) {
      el.subtotal.textContent = moneda(total);
    }

    if (el.total) {
      el.total.textContent = moneda(total);
    }

    actualizarCambio();
  }

  // ==========================================
  // MOSTRAR CARRITO
  // ==========================================

  function renderizarCarrito() {
    if (!el.detalle) return;

    el.detalle.innerHTML = '';

    carrito.forEach((item) => {
      const fila = document.createElement('tr');

      fila.innerHTML = `
        <td>
          <strong>
            ${escaparHTML(item.nombre)}
          </strong>

          <small>
            ${escaparHTML(item.codigo)}
          </small>
        </td>

        <td>
          ${escaparHTML(item.descripcion)}
        </td>

        <td>
          <input
            type="number"
            class="cantidad-producto-venta"
            min="1"
            max="${Math.floor(item.stock_actual)}"
            step="1"
            value="${item.cantidad}"
            aria-label="Cantidad de ${escaparHTML(item.nombre)}"
          >
        </td>

        <td>
          ${moneda(item.precio_unitario)}
        </td>

        <td>
          <strong>
            ${moneda(
              item.cantidad * item.precio_unitario
            )}
          </strong>
        </td>

        <td>
          <button
            type="button"
            class="eliminar-producto-venta"
            aria-label="Eliminar ${escaparHTML(item.nombre)}"
          >
            <i data-lucide="trash-2"></i>
          </button>
        </td>
      `;

      const inputCantidad = fila.querySelector(
        '.cantidad-producto-venta'
      );

      inputCantidad.addEventListener(
        'change',
        (evento) => {
          cambiarCantidad(
            item.clave,
            evento.target.value
          );
        }
      );

      const botonEliminar = fila.querySelector(
        '.eliminar-producto-venta'
      );

      botonEliminar.addEventListener(
        'click',
        () => {
          eliminarProducto(item.clave);
        }
      );

      el.detalle.appendChild(fila);
    });

    const cantidad = carrito.reduce(
      (suma, item) => suma + item.cantidad,
      0
    );

    if (el.contador) {
      el.contador.textContent =
        `${cantidad} producto${cantidad === 1 ? '' : 's'}`;
    }

    actualizarTotales();
    actualizarIconos();
  }

  // ==========================================
  // ACTUALIZAR FORMA DE PAGO
  // ==========================================

  function actualizarTipoVenta() {
    const seleccionado = document.querySelector(
      'input[name="tipoVenta"]:checked'
    );

    tipoVenta =
      seleccionado?.value === 'credito'
        ? 'CREDITO'
        : 'CONTADO';

    const esCredito =
      tipoVenta === 'CREDITO';

    if (el.campoCliente) {
      el.campoCliente.hidden = !esCredito;
    }

    if (el.cliente) {
      el.cliente.required = esCredito;
    }

    if (el.campoMedio) {
      el.campoMedio.hidden = esCredito;
    }

    if (el.campoRecibido) {
      el.campoRecibido.hidden = esCredito;
    }

    if (el.campoCambio) {
      el.campoCambio.hidden = esCredito;
    }

    document.querySelectorAll(
      '.nueva-venta__tipo'
    ).forEach((etiqueta) => {
      const radio = etiqueta.querySelector(
        'input[name="tipoVenta"]'
      );

      etiqueta.classList.toggle(
        'activo',
        Boolean(radio?.checked)
      );
    });

    actualizarCambio();
  }

  // ==========================================
  // VALIDAR VENTA
  // ==========================================

  function validarVenta() {
    if (carrito.length === 0) {
      mostrarMensaje(
        'Debes agregar al menos un producto.',
        true
      );
      return false;
    }

    for (const item of carrito) {
      if (
        !Number.isSafeInteger(item.cantidad) ||
        item.cantidad < 1 ||
        item.cantidad > item.stock_actual
      ) {
        mostrarMensaje(
          `Verifica la cantidad de ${item.nombre}.`,
          true
        );
        return false;
      }
    }

    if (tipoVenta === 'CREDITO') {
      const idCliente = Number(
        el.cliente?.value
      );

      if (
        !Number.isSafeInteger(idCliente) ||
        idCliente <= 0
      ) {
        mostrarMensaje(
          'Selecciona un cliente para la venta a crédito.',
          true
        );
        return false;
      }

    } else {
      const medio = el.medio?.value;

      if (
        !['efectivo', 'transferencia'].includes(medio)
      ) {
        mostrarMensaje(
          'Selecciona un medio de pago válido.',
          true
        );
        return false;
      }

      if (medio === 'efectivo') {
        const recibido = Number(
          el.recibido?.value
        );

        if (
          !el.recibido?.value ||
          !Number.isFinite(recibido) ||
          recibido < obtenerTotal()
        ) {
          mostrarMensaje(
            'El valor recibido debe ser igual o superior al total.',
            true
          );
          return false;
        }
      }
    }

    return true;
  }

  // ==========================================
  // REGISTRAR VENTA EN MYSQL
  // ==========================================

  async function registrarVenta(evento) {
    evento.preventDefault();

    if (guardando) return;

    mostrarMensaje('');

    if (!validarVenta()) return;

    const datosVenta = {
      id_cliente:
        tipoVenta === 'CREDITO'
          ? Number(el.cliente.value)
          : null,

      tipo_venta: tipoVenta,

      metodo_pago:
        tipoVenta === 'CONTADO'
          ? el.medio.value.toUpperCase()
          : null,

      observaciones:
        el.notas?.value.trim() || null,

      productos: carrito.map((item) => ({
        id_producto: item.id_producto,
        id_presentacion: item.id_presentacion,
        cantidad: item.cantidad
      }))
    };

    guardando = true;

    if (el.guardar) {
      el.guardar.disabled = true;
      el.guardar.textContent =
        'Registrando venta...';
    }

    try {
      const resultado = await solicitar(
        '/ventas',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(datosVenta)
        }
      );

      mostrarMensaje(
        `Venta N.º ${resultado.id_venta} registrada correctamente. Total: ${moneda(resultado.total)}`
      );

      if (el.numero) {
        el.numero.textContent =
          `V-${resultado.id_venta}`;
      }

      carrito = [];
      el.formulario.reset();

      renderizarCarrito();
      actualizarTipoVenta();

      await cargarProductos();

      setTimeout(() => {
        window.location.href = 'ventas.html';
      }, 1800);

    } catch (error) {
      console.error(
        'Error al registrar venta:',
        error
      );

      mostrarMensaje(
        error.message,
        true
      );

      // No reenviar automáticamente.
      // El servidor podría haber guardado la venta.

    } finally {
      guardando = false;

      if (el.guardar) {
        el.guardar.disabled = false;

        el.guardar.innerHTML = `
          <i data-lucide="check-circle"></i>
          Registrar venta
        `;

        actualizarIconos();
      }
    }
  }

  // ==========================================
  // EVENTOS
  // ==========================================

  el.buscar?.addEventListener(
    'input',
    renderizarProductos
  );

  el.agregar?.addEventListener(
    'click',
    () => {
      el.buscar?.focus();
      renderizarProductos();
    }
  );

  el.recibido?.addEventListener(
    'input',
    actualizarCambio
  );

  document.querySelectorAll(
    'input[name="tipoVenta"]'
  ).forEach((radio) => {
    radio.addEventListener(
      'change',
      () => {
        mostrarMensaje('');
        actualizarTipoVenta();
      }
    );
  });

  el.formulario.addEventListener(
    'submit',
    registrarVenta
  );

  // ==========================================
  // INICIALIZAR
  // ==========================================

  actualizarTipoVenta();
  renderizarCarrito();

  Promise.all([
    cargarProductos(),
    cargarClientes()
  ]);

  actualizarIconos();
});
