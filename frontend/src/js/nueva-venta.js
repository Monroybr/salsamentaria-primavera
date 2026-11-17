document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // ============================================
  // CONFIGURACIÓN
  // ============================================

  const API_URL = 'http://localhost:4000/api/ventas';

  const $ = (id) => document.getElementById(id);

  const elementos = {
    formulario: $('formNuevaVenta'),
    numeroVenta: $('numeroNuevaVenta'),
    buscarProducto: $('buscarProductoVenta'),
    productosDisponibles: $('productosDisponibles'),
    detalleProductos: $('detalleProductosVenta'),
    contadorProductos: $('contadorProductosVenta'),
    agregarProducto: $('agregarOtroProducto'),
    campoCliente: $('campoCliente'),
    cliente: $('clienteVenta'),
    campoMedioPago: $('campoMedioPago'),
    medioPago: $('medioPagoVenta'),
    campoValorRecibido: $('campoValorRecibido'),
    valorRecibido: $('valorRecibido'),
    campoCambio: $('campoCambio'),
    cambio: $('cambioVenta'),
    subtotal: $('subtotalVenta'),
    total: $('totalVenta'),
    notas: $('notasVenta'),
    mensaje: $('mensajeVenta'),
    botonRegistrar: $('registrarVenta')
  };

  if (!elementos.formulario) return;

  let catalogo = [];
  let carrito = [];
  let clientes = [];
  let tipoVenta = 'CONTADO';
  let guardando = false;
  let cargandoCatalogo = false;

  const formatoMoneda = (valor) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(Number(valor) || 0);

  const mostrarMensaje = (texto, esError = false) => {
    if (!elementos.mensaje) return;

    elementos.mensaje.hidden = false;
    elementos.mensaje.textContent = texto;
    elementos.mensaje.style.color = esError
      ? '#b91c1c'
      : '#15803d';
  };

  const limpiarMensaje = () => {
    if (!elementos.mensaje) return;
    elementos.mensaje.hidden = true;
    elementos.mensaje.textContent = '';
  };

  const actualizarIconos = () => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  };

  // Evitar insertar texto externo como HTML.
  const escaparHTML = (valor) =>
    String(valor ?? '').replace(/[&<>"']/g, (caracter) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[caracter]);

  // ============================================
  // CONSULTAR PRODUCTOS DESDE MYSQL
  // ============================================

  async function cargarProductos() {
    cargandoCatalogo = true;

    if (elementos.productosDisponibles) {
      elementos.productosDisponibles.textContent =
        'Cargando productos...';
    }

    try {
      const respuesta = await fetch(`${API_URL}/productos`, {
        cache: 'no-store'
      });

      if (!respuesta.ok) {
        throw new Error('No fue posible consultar los productos.');
      }

      const datos = await respuesta.json();

      if (!Array.isArray(datos)) {
        throw new Error('La respuesta de productos no es válida.');
      }

      catalogo = datos.map((producto) => ({
        id_producto: Number(producto.id_producto),
        id_presentacion: Number(producto.id_presentacion),
        codigo: String(producto.codigo ?? ''),
        nombre: String(producto.nombre ?? ''),
        peso_gramos: Number(producto.peso_gramos),
        stock_actual: Number(producto.stock_actual),
        precio_venta: Number(producto.precio_venta)
      })).filter((producto) =>
        Number.isSafeInteger(producto.id_producto) &&
        Number.isSafeInteger(producto.id_presentacion) &&
        producto.id_presentacion > 0 &&
        Number.isFinite(producto.stock_actual) &&
        Number.isFinite(producto.precio_venta)
      );

      renderizarProductos();
    } catch (error) {
      console.error('Error cargando productos:', error);
      catalogo = [];

      if (elementos.productosDisponibles) {
        elementos.productosDisponibles.textContent =
          'No fue posible cargar los productos desde MySQL.';
      }

      mostrarMensaje(error.message, true);
    } finally {
      cargandoCatalogo = false;
    }
  }

  // ============================================
  // CONSULTAR CLIENTES DESDE MYSQL
  // ============================================

  async function cargarClientes() {
    if (!elementos.cliente) return;

    elementos.cliente.innerHTML =
      '<option value="">Cargando clientes...</option>';

    try {
      const respuesta = await fetch(`${API_URL}/clientes`, {
        cache: 'no-store'
      });

      if (!respuesta.ok) {
        throw new Error('No fue posible consultar los clientes.');
      }

      const datos = await respuesta.json();

      if (!Array.isArray(datos)) {
        throw new Error('La respuesta de clientes no es válida.');
      }

      clientes = datos;

      elementos.cliente.innerHTML =
        '<option value="">Seleccionar cliente...</option>';

      clientes.forEach((cliente) => {
        const opcion = document.createElement('option');

        opcion.value = String(cliente.id_cliente);
        opcion.textContent = cliente.numero_documento
          ? `${cliente.nombre} - ${cliente.numero_documento}`
          : cliente.nombre;

        elementos.cliente.appendChild(opcion);
      });
    } catch (error) {
      console.error('Error cargando clientes:', error);

      clientes = [];

      elementos.cliente.innerHTML =
        '<option value="">No se pudieron cargar los clientes</option>';

      mostrarMensaje(error.message, true);
    }
  }

  // ============================================
  // MOSTRAR PRODUCTOS DISPONIBLES
  // ============================================

  function renderizarProductos() {
    const contenedor = elementos.productosDisponibles;

    if (!contenedor || cargandoCatalogo) return;

    const busqueda = (
      elementos.buscarProducto?.value || ''
    ).trim().toLowerCase();

    const productosFiltrados = catalogo.filter((producto) => {
      const texto =
        `${producto.nombre} ${producto.codigo} ${producto.peso_gramos}`
          .toLowerCase();

      return texto.includes(busqueda);
    });

    contenedor.innerHTML = '';

    if (productosFiltrados.length === 0) {
      contenedor.textContent =
        'No se encontraron productos disponibles.';
      return;
    }

    productosFiltrados.forEach((producto) => {
      const agotado = producto.stock_actual <= 0;
      const seleccionado = carrito.some(
        (item) => item.id_presentacion === producto.id_presentacion
      );

      const boton = document.createElement('button');

      boton.type = 'button';
      boton.className = 'nueva-venta__sugerencia';
      boton.disabled = agotado;

      boton.innerHTML = `
        <span>
          <strong>${escaparHTML(producto.nombre)}</strong>
          <small>
            ${escaparHTML(producto.codigo)}
            · ${producto.peso_gramos} g
            · Stock: ${producto.stock_actual}
          </small>
        </span>
        <span>
          <strong>${formatoMoneda(producto.precio_venta)}</strong>
          <small>
            ${agotado ? 'Agotado' : seleccionado ? 'Agregar más' : 'Agregar'}
          </small>
        </span>
      `;

      boton.addEventListener('click', () => {
        agregarAlCarrito(producto.id_presentacion);
      });

      contenedor.appendChild(boton);
    });
  }

  // ============================================
  // AGREGAR PRODUCTOS AL CARRITO
  // ============================================

  function agregarAlCarrito(idPresentacion) {
    limpiarMensaje();

    const producto = catalogo.find(
      (item) => item.id_presentacion === Number(idPresentacion)
    );

    if (!producto) {
      mostrarMensaje('El producto seleccionado no existe.', true);
      return;
    }

    if (producto.stock_actual <= 0) {
      mostrarMensaje('Esta presentación no tiene existencias.', true);
      return;
    }

    const existente = carrito.find(
      (item) => item.id_presentacion === producto.id_presentacion
    );

    if (existente) {
      if (existente.cantidad >= producto.stock_actual) {
        mostrarMensaje(
          'No puedes agregar más unidades que las disponibles.',
          true
        );
        return;
      }

      existente.cantidad += 1;
    } else {
      carrito.push({
        id_producto: producto.id_producto,
        id_presentacion: producto.id_presentacion,
        codigo: producto.codigo,
        nombre: producto.nombre,
        peso_gramos: producto.peso_gramos,
        precio_unitario: producto.precio_venta,
        stock_actual: producto.stock_actual,
        cantidad: 1
      });
    }

    renderizarCarrito();
    renderizarProductos();
  }

  // ============================================
  // CAMBIAR CANTIDAD
  // ============================================

  function cambiarCantidad(idPresentacion, nuevaCantidad) {
    const item = carrito.find(
      (producto) => producto.id_presentacion === Number(idPresentacion)
    );

    if (!item) return;

    const cantidad = Number(nuevaCantidad);

    if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
      mostrarMensaje('La cantidad debe ser un número entero positivo.', true);
      renderizarCarrito();
      return;
    }

    if (cantidad > item.stock_actual) {
      mostrarMensaje(
        `Solo hay ${item.stock_actual} unidades disponibles.`,
        true
      );
      renderizarCarrito();
      return;
    }

    limpiarMensaje();
    item.cantidad = cantidad;

    renderizarCarrito();
  }

  // ============================================
  // ELIMINAR PRODUCTO
  // ============================================

  function eliminarProducto(idPresentacion) {
    carrito = carrito.filter(
      (item) => item.id_presentacion !== Number(idPresentacion)
    );

    limpiarMensaje();
    renderizarCarrito();
    renderizarProductos();
  }

  // ============================================
  // MOSTRAR CARRITO
  // ============================================

  function renderizarCarrito() {
    const tabla = elementos.detalleProductos;

    if (!tabla) return;

    tabla.innerHTML = '';

    carrito.forEach((item) => {
      const fila = document.createElement('tr');

      fila.innerHTML = `
        <td>
          <strong>${escaparHTML(item.nombre)}</strong>
          <small>${escaparHTML(item.codigo)}</small>
        </td>

        <td>${item.peso_gramos} g</td>

        <td>
          <input
            type="number"
            class="cantidad-producto-venta"
            min="1"
            max="${item.stock_actual}"
            step="1"
            value="${item.cantidad}"
            aria-label="Cantidad de ${escaparHTML(item.nombre)}"
          >
        </td>

        <td>${formatoMoneda(item.precio_unitario)}</td>

        <td>
          <strong>
            ${formatoMoneda(item.cantidad * item.precio_unitario)}
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

      inputCantidad.addEventListener('change', () => {
        cambiarCantidad(item.id_presentacion, inputCantidad.value);
      });

      const botonEliminar = fila.querySelector(
        '.eliminar-producto-venta'
      );

      botonEliminar.addEventListener('click', () => {
        eliminarProducto(item.id_presentacion);
      });

      tabla.appendChild(fila);
    });

    const cantidadTotal = carrito.reduce(
      (acumulado, item) => acumulado + item.cantidad,
      0
    );

    if (elementos.contadorProductos) {
      elementos.contadorProductos.textContent =
        `${cantidadTotal} producto${cantidadTotal === 1 ? '' : 's'}`;
    }

    actualizarTotales();
    actualizarIconos();
  }

  // ============================================
  // CALCULAR TOTALES
  // ============================================

  function obtenerTotal() {
    return carrito.reduce(
      (acumulado, item) =>
        acumulado + item.cantidad * item.precio_unitario,
      0
    );
  }

  function actualizarTotales() {
    const total = obtenerTotal();

    if (elementos.subtotal) {
      elementos.subtotal.textContent = formatoMoneda(total);
    }

    if (elementos.total) {
      elementos.total.textContent = formatoMoneda(total);
    }

    actualizarCambio();
  }

  // ============================================
  // CALCULAR CAMBIO
  // ============================================

  function actualizarCambio() {
    if (!elementos.cambio) return;

    if (tipoVenta === 'CREDITO') {
      elementos.cambio.textContent = formatoMoneda(0);
      return;
    }

    const recibido = Number(elementos.valorRecibido?.value || 0);
    const total = obtenerTotal();

    elementos.cambio.textContent =
      formatoMoneda(Math.max(0, recibido - total));
  }

  // ============================================
  // TIPO DE VENTA
  // ============================================

  function actualizarTipoVenta() {
    const seleccionado = document.querySelector(
      'input[name="tipoVenta"]:checked'
    );

    tipoVenta = seleccionado?.value === 'credito'
      ? 'CREDITO'
      : 'CONTADO';

    const esCredito = tipoVenta === 'CREDITO';

    if (elementos.campoCliente) {
      elementos.campoCliente.hidden = !esCredito;
    }

    if (elementos.cliente) {
      elementos.cliente.required = esCredito;
    }

    if (elementos.campoMedioPago) {
      elementos.campoMedioPago.hidden = esCredito;
    }

    if (elementos.campoValorRecibido) {
      elementos.campoValorRecibido.hidden = esCredito;
    }

    if (elementos.campoCambio) {
      elementos.campoCambio.hidden = esCredito;
    }

    document.querySelectorAll('.nueva-venta__tipo').forEach(
      (etiqueta) => {
        const radio = etiqueta.querySelector(
          'input[name="tipoVenta"]'
        );

        etiqueta.classList.toggle(
          'activo',
          Boolean(radio?.checked)
        );
      }
    );

    actualizarCambio();
  }

  // ============================================
  // VALIDAR VENTA
  // ============================================

  function validarVenta() {
    if (carrito.length === 0) {
      mostrarMensaje(
        'Debes agregar al menos un producto a la venta.',
        true
      );
      return false;
    }

    for (const item of carrito) {
      if (
        !Number.isSafeInteger(item.cantidad) ||
        item.cantidad <= 0 ||
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
      const idCliente = Number(elementos.cliente?.value);

      if (!Number.isSafeInteger(idCliente) || idCliente <= 0) {
        mostrarMensaje(
          'Selecciona un cliente para registrar la venta a crédito.',
          true
        );
        return false;
      }
    }

    if (tipoVenta === 'CONTADO') {
      const medio = elementos.medioPago?.value;

      if (!['efectivo', 'transferencia'].includes(medio)) {
        mostrarMensaje('Selecciona un medio de pago válido.', true);
        return false;
      }

      if (medio === 'efectivo') {
        const recibido = Number(elementos.valorRecibido?.value);

        if (
          !elementos.valorRecibido?.value ||
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

  // ============================================
  // REGISTRAR VENTA EN MYSQL
  // ============================================

  async function registrarVenta(evento) {
    evento.preventDefault();

    if (guardando) return;

    limpiarMensaje();

    if (!validarVenta()) return;

    const medioPago = tipoVenta === 'CONTADO'
      ? elementos.medioPago.value.toUpperCase()
      : null;

    const datosVenta = {
      id_cliente: tipoVenta === 'CREDITO'
        ? Number(elementos.cliente.value)
        : null,

      tipo_venta: tipoVenta,

      metodo_pago: medioPago,

      observaciones: elementos.notas?.value.trim() || null,

      productos: carrito.map((item) => ({
        id_presentacion: item.id_presentacion,
        cantidad: item.cantidad
      }))
    };

    guardando = true;

    if (elementos.botonRegistrar) {
      elementos.botonRegistrar.disabled = true;
      elementos.botonRegistrar.textContent = 'Registrando venta...';
    }

    try {
      const respuesta = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(datosVenta)
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.mensaje || 'No fue posible registrar la venta.'
        );
      }

      mostrarMensaje(
        `Venta N.º ${resultado.id_venta} registrada correctamente. ` +
        `Total: ${formatoMoneda(resultado.total)}`
      );

      if (elementos.numeroVenta) {
        elementos.numeroVenta.textContent =
          `V-${resultado.id_venta}`;
      }

      carrito = [];
      elementos.formulario.reset();

      renderizarCarrito();
      actualizarTipoVenta();

      await cargarProductos();

      // Regresar al listado después del registro.
      // Se espera unos segundos para mostrar la confirmación.
      setTimeout(() => {
        window.location.href = 'ventas.html';
      }, 1800);

    } catch (error) {
      console.error('Error registrando venta:', error);

      mostrarMensaje(error.message, true);

      // Si se perdió la respuesta del servidor, no se debe
      // reenviar automáticamente: la venta pudo haberse guardado.
    } finally {
      guardando = false;

      if (elementos.botonRegistrar) {
        elementos.botonRegistrar.disabled = false;
        elementos.botonRegistrar.innerHTML = `
          <i data-lucide="check-circle"></i>
          Registrar venta
        `;

        actualizarIconos();
      }
    }
  }

  // ============================================
  // EVENTOS
  // ============================================

  elementos.buscarProducto?.addEventListener(
    'input',
    renderizarProductos
  );

  elementos.agregarProducto?.addEventListener('click', () => {
    elementos.buscarProducto?.focus();
    renderizarProductos();
  });

  elementos.valorRecibido?.addEventListener(
    'input',
    actualizarCambio
  );

  document.querySelectorAll(
    'input[name="tipoVenta"]'
  ).forEach((radio) => {
    radio.addEventListener('change', () => {
      limpiarMensaje();
      actualizarTipoVenta();
    });
  });

  elementos.formulario.addEventListener(
    'submit',
    registrarVenta
  );

  // ============================================
  // INICIALIZAR
  // ============================================

  actualizarTipoVenta();
  renderizarCarrito();

  Promise.all([
    cargarProductos(),
    cargarClientes()
  ]);

  actualizarIconos();
});
