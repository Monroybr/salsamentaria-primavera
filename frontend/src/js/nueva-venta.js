
document.addEventListener('DOMContentLoaded', () => {

  // =====================================
  // ELEMENTOS DEL FORMULARIO
  // =====================================

  const formulario = document.getElementById('formNuevaVenta');
  if (!formulario) return;

  const buscador = document.getElementById('buscarProductoVenta');
  const disponibles = document.getElementById('productosDisponibles');
  const tabla = document.getElementById('detalleProductosVenta');
  const contador = document.getElementById('contadorProductosVenta');

  const campoCliente = document.getElementById('campoCliente');
  const cliente = document.getElementById('clienteVenta');
  const campoMedio = document.getElementById('campoMedioPago');
  const medioPago = document.getElementById('medioPagoVenta');
  const campoRecibido = document.getElementById('campoValorRecibido');
  const recibido = document.getElementById('valorRecibido');
  const campoCambio = document.getElementById('campoCambio');
  const cambio = document.getElementById('cambioVenta');

  const subtotalTexto = document.getElementById('subtotalVenta');
  const totalTexto = document.getElementById('totalVenta');
  const mensaje = document.getElementById('mensajeVenta');
  const botonGuardar = document.getElementById('registrarVenta');

  const CLAVE_VENTAS = 'salsamentaria_ventas';
  const CLAVE_CARTERA = 'salsamentaria_cartera';

  // =====================================
  // CATÁLOGO DE EJEMPLO
  // =====================================

  // Más adelante estos datos vendrán de MySQL.
  // Cada producto puede tener varias presentaciones.
  const catalogo = [
    {
      id: 'SAL-001',
      nombre: 'Jamón de cerdo premium',
      stock: 50,
      presentaciones: [
        { nombre: 'Una libra - 500 g', precio: 14250 },
        { nombre: 'Un kilogramo - 1.000 g', precio: 28500 }
      ]
    },
    {
      id: 'EMB-008',
      nombre: 'Salchicha ranchera',
      stock: 24,
      presentaciones: [
        { nombre: 'Paquete - 6 unidades', precio: 12400 }
      ]
    },
    {
      id: 'LAC-014',
      nombre: 'Queso campesino',
      stock: 8,
      presentaciones: [
        { nombre: 'Media libra - 250 g', precio: 9900 },
        { nombre: 'Una libra - 500 g', precio: 19800 }
      ]
    },
    {
      id: 'EMB-011',
      nombre: 'Chorizo santarrosano',
      stock: 8,
      presentaciones: [
        { nombre: 'Paquete - 5 unidades', precio: 16900 }
      ]
    },
    {
      id: 'SAL-022',
      nombre: 'Mortadela tradicional',
      stock: 32,
      presentaciones: [
        { nombre: 'Media libra - 250 g', precio: 8800 },
        { nombre: 'Una libra - 500 g', precio: 17600 }
      ]
    },
    {
      id: 'GRA-001',
      nombre: 'Harina de trigo',
      stock: 40,
      presentaciones: [
        { nombre: 'Media libra - 250 g', precio: 1200 },
        { nombre: 'Una libra - 500 g', precio: 2300 },
        { nombre: 'Un kilogramo - 1.000 g', precio: 4500 }
      ]
    }
  ];

  // Productos agregados a la venta.
  const carrito = [];

  function dinero(valor) {
    return '$' + Number(valor).toLocaleString('es-CO', {
      maximumFractionDigits: 0
    });
  }

  function leerDatos(clave) {
    try {
      const datos = JSON.parse(localStorage.getItem(clave) || '[]');
      return Array.isArray(datos) ? datos : [];
    } catch {
      return [];
    }
  }

  function normalizar(texto) {
    return String(texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function mostrarMensaje(texto) {
    mensaje.textContent = texto;
    mensaje.hidden = false;
  }

  function ocultarMensaje() {
    mensaje.hidden = true;
  }

  // =====================================
  // NÚMERO DE LA SIGUIENTE VENTA
  // =====================================

  function siguienteNumero() {
    const ventas = leerDatos(CLAVE_VENTAS);

    const numeros = ventas
      .map(v => Number(String(v.id).replace('V-', '')))
      .filter(Number.isFinite);

    const ultimo = Math.max(1048, ...numeros);

    return `V-${ultimo + 1}`;
  }

  document.getElementById('numeroNuevaVenta').textContent =
    siguienteNumero();

  // =====================================
  // PRODUCTOS DISPONIBLES
  // =====================================

  function mostrarDisponibles() {
    disponibles.replaceChildren();

    const texto = normalizar(buscador.value);

    const resultados = catalogo.filter(producto =>
      normalizar(producto.nombre).includes(texto) ||
      normalizar(producto.id).includes(texto)
    );

    resultados.slice(0, 3).forEach(producto => {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'nueva-venta__sugerencia';

      const icono = document.createElement('span');
      icono.className = 'nueva-venta__icono';
      icono.innerHTML = '<i data-lucide="package"></i>';

      const informacion = document.createElement('span');

      const nombre = document.createElement('strong');
      nombre.textContent = producto.nombre;

      const stock = document.createElement('small');
      stock.textContent = `Disponible: ${producto.stock} unidades`;

      informacion.append(nombre, stock);

      const mas = document.createElement('i');
      mas.setAttribute('data-lucide', 'plus');

      boton.append(icono, informacion, mas);

      boton.addEventListener('click', () => agregarProducto(producto));

      disponibles.appendChild(boton);
    });

    if (!resultados.length) {
      const aviso = document.createElement('p');
      aviso.textContent = 'No se encontraron productos.';
      disponibles.appendChild(aviso);
    }

    if (window.lucide) window.lucide.createIcons();
  }

  // =====================================
  // AGREGAR PRODUCTOS
  // =====================================

  function agregarProducto(producto) {
    ocultarMensaje();

    const existente = carrito.find(item => item.id === producto.id);

    if (existente) {
      if (existente.cantidad >= producto.stock) {
        mostrarMensaje('No hay más unidades disponibles de este producto.');
        return;
      }

      existente.cantidad++;
    } else {
      if (producto.stock <= 0) {
        mostrarMensaje('Este producto no tiene existencias.');
        return;
      }

      carrito.push({
        id: producto.id,
        nombre: producto.nombre,
        stock: producto.stock,
        presentaciones: producto.presentaciones,
        presentacionIndice: 0,
        cantidad: 1
      });
    }

    mostrarCarrito();
  }

  // =====================================
  // MOSTRAR PRODUCTOS SELECCIONADOS
  // =====================================

  function mostrarCarrito() {
    tabla.replaceChildren();

    carrito.forEach(item => {
      const fila = document.createElement('tr');

      // Nombre del producto.
      const tdProducto = document.createElement('td');
      const nombre = document.createElement('strong');
      nombre.textContent = item.nombre;

      const disponible = document.createElement('small');
      disponible.style.display = 'block';
      disponible.style.color = '#66766e';
      disponible.textContent = `Disponible: ${item.stock}`;

      tdProducto.append(nombre, disponible);
      fila.appendChild(tdProducto);

      // Selector de presentación.
      const tdPresentacion = document.createElement('td');
      const selector = document.createElement('select');

      item.presentaciones.forEach((presentacion, indice) => {
        const opcion = document.createElement('option');
        opcion.value = String(indice);
        opcion.textContent = presentacion.nombre;
        selector.appendChild(opcion);
      });

      selector.value = String(item.presentacionIndice);

      selector.addEventListener('change', () => {
        item.presentacionIndice = Number(selector.value);
        mostrarCarrito();
      });

      tdPresentacion.appendChild(selector);
      fila.appendChild(tdPresentacion);

      // Controles para aumentar o disminuir.
      const tdCantidad = document.createElement('td');
      const controles = document.createElement('div');
      controles.className = 'nueva-venta__cantidad';

      const menos = document.createElement('button');
      menos.type = 'button';
      menos.textContent = '−';

      menos.addEventListener('click', () => {
        if (item.cantidad > 1) {
          item.cantidad--;
          mostrarCarrito();
        }
      });

      const cantidad = document.createElement('span');
      cantidad.textContent = item.cantidad;

      const mas = document.createElement('button');
      mas.type = 'button';
      mas.textContent = '+';

      mas.addEventListener('click', () => {
        if (item.cantidad < item.stock) {
          item.cantidad++;
          mostrarCarrito();
        } else {
          mostrarMensaje('Cantidad superior al stock disponible.');
        }
      });

      controles.append(menos, cantidad, mas);
      tdCantidad.appendChild(controles);
      fila.appendChild(tdCantidad);

      // Precio de la presentación seleccionada.
      const presentacion = item.presentaciones[item.presentacionIndice];
      const precio = presentacion.precio;

      const tdPrecio = document.createElement('td');
      tdPrecio.textContent = dinero(precio);
      fila.appendChild(tdPrecio);

      // Subtotal de este producto.
      const tdTotal = document.createElement('td');
      tdTotal.textContent = dinero(precio * item.cantidad);
      tdTotal.style.fontWeight = '600';
      fila.appendChild(tdTotal);

      // Eliminar el producto.
      const tdEliminar = document.createElement('td');
      const eliminar = document.createElement('button');

      eliminar.type = 'button';
      eliminar.className = 'nueva-venta__eliminar';
      eliminar.textContent = '×';
      eliminar.setAttribute('aria-label', `Eliminar ${item.nombre}`);

      eliminar.addEventListener('click', () => {
        const indice = carrito.indexOf(item);
        carrito.splice(indice, 1);
        mostrarCarrito();
      });

      tdEliminar.appendChild(eliminar);
      fila.appendChild(tdEliminar);

      tabla.appendChild(fila);
    });

    contador.textContent =
      `${carrito.length} ${carrito.length === 1 ? 'producto' : 'productos'}`;

    actualizarTotal();
  }

  // =====================================
  // CALCULAR TOTAL Y CAMBIO
  // =====================================

  function obtenerTotal() {
    return carrito.reduce((suma, item) => {
      const precio = item.presentaciones[item.presentacionIndice].precio;
      return suma + precio * item.cantidad;
    }, 0);
  }

  function actualizarTotal() {
    const total = obtenerTotal();

    subtotalTexto.textContent = dinero(total);
    totalTexto.textContent = dinero(total);

    const valor = Number(recibido.value) || 0;
    const cambioCalculado = Math.max(0, valor - total);

    cambio.textContent = dinero(cambioCalculado);
  }

  // =====================================
  // CONTADO O CRÉDITO
  // =====================================

  function tipoSeleccionado() {
    return document.querySelector('input[name="tipoVenta"]:checked').value;
  }

  function actualizarFormaPago() {
    const credito = tipoSeleccionado() === 'credito';

    campoCliente.hidden = !credito;
    campoMedio.hidden = credito;
    campoRecibido.hidden = credito || medioPago.value !== 'efectivo';
    campoCambio.hidden = credito || medioPago.value !== 'efectivo';

    cliente.required = credito;

    document.querySelectorAll('.nueva-venta__tipo').forEach(opcion => {
      opcion.classList.toggle(
        'activo',
        opcion.querySelector('input').checked
      );
    });

    actualizarTotal();
  }

  document.querySelectorAll('input[name="tipoVenta"]').forEach(radio => {
    radio.addEventListener('change', actualizarFormaPago);
  });

  medioPago.addEventListener('change', actualizarFormaPago);
  recibido.addEventListener('input', actualizarTotal);

  // =====================================
  // GUARDAR LA VENTA
  // =====================================

  formulario.addEventListener('submit', evento => {
    evento.preventDefault();
    ocultarMensaje();

    if (!carrito.length) {
      mostrarMensaje('Agrega al menos un producto a la venta.');
      return;
    }

    const tipo = tipoSeleccionado();
    const total = obtenerTotal();

    if (tipo === 'credito' && !cliente.value) {
      mostrarMensaje('Selecciona un cliente para registrar el crédito.');
      return;
    }

    if (tipo === 'contado' && medioPago.value === 'efectivo') {
      if (recibido.value === '' || Number(recibido.value) < total) {
        mostrarMensaje('El valor recibido debe cubrir el total de la venta.');
        return;
      }
    }

    // Fecha y hora del registro.
    const ahora = new Date();

    const fecha = [
      ahora.getFullYear(),
      String(ahora.getMonth() + 1).padStart(2, '0'),
      String(ahora.getDate()).padStart(2, '0')
    ].join('-');

    const hora = ahora.toLocaleTimeString('es-CO', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const id = siguienteNumero();

    // Información de la venta.
    const venta = {
      id,
      cliente: tipo === 'credito'
        ? cliente.value
        : 'Consumidor final',
      fecha,
      hora,
      tipo,
      medioPago: tipo === 'credito' ? 'credito' : medioPago.value,
      total,
      valorRecibido: tipo === 'contado' && medioPago.value === 'efectivo'
        ? Number(recibido.value)
        : total,
      notas: document.getElementById('notasVenta').value.trim(),

      productos: carrito.map(item => {
        const presentacion = item.presentaciones[item.presentacionIndice];

        return {
          id: item.id,
          nombre: item.nombre,
          presentacion: presentacion.nombre,
          cantidad: item.cantidad,
          precio: presentacion.precio,
          subtotal: presentacion.precio * item.cantidad
        };
      })
    };

    // Preparar los datos antes de guardarlos.
    const ventas = leerDatos(CLAVE_VENTAS);
    ventas.unshift(venta);

    // Las ventas a crédito generan una cuenta por cobrar.
    const cartera = leerDatos(CLAVE_CARTERA);

    if (tipo === 'credito') {
      cartera.unshift({
        id: `CC-${id}`,
        ventaId: id,
        cliente: cliente.value,
        montoTotal: total,
        saldoPendiente: total,
        estado: 'pendiente',
        fecha
      });
    }

    // Guardar los datos del prototipo.
    try {
      localStorage.setItem(CLAVE_VENTAS, JSON.stringify(ventas));

      if (tipo === 'credito') {
        localStorage.setItem(CLAVE_CARTERA, JSON.stringify(cartera));
      }
    } catch (error) {
      console.error('Error al guardar la venta:', error);
      mostrarMensaje('No fue posible guardar la venta.');
      return;
    }

    // Evita registrar la misma venta dos veces.
    botonGuardar.disabled = true;

    alert(`Venta ${id} registrada correctamente.`);

    // Regresar al listado.
    window.location.href = 'ventas.html';
  });

  // =====================================
  // EVENTOS DE PRODUCTOS
  // =====================================

  buscador.addEventListener('input', mostrarDisponibles);

  document.getElementById('agregarOtroProducto').addEventListener(
    'click',
    () => {
      buscador.focus();
      buscador.select();
    }
  );

  // =====================================
  // INICIAR PANTALLA
  // =====================================

  mostrarDisponibles();

  // Agregamos dos productos para visualizar
  // el formulario como aparece en el mockup.
  agregarProducto(catalogo[0]);
  agregarProducto(catalogo[1]);
  agregarProducto(catalogo[0]);

  recibido.value = obtenerTotal();

  actualizarFormaPago();

  if (window.lucide) window.lucide.createIcons();
});
