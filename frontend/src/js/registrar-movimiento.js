document.addEventListener('DOMContentLoaded', () => {

  const API_URL = 'http://localhost:4000/api';

  // Productos obtenidos de MySQL
  let productos = [];

  // Motivos según el tipo de movimiento
  const motivos = {
    entrada: [
      'Compra a proveedor',
      'Devolución de cliente',
      'Ingreso de inventario',
      'Otro'
    ],
    salida: [
      'Producto dañado',
      'Merma',
      'Consumo interno',
      'Devolución a proveedor',
      'Otro'
    ],
    ajuste: [
      'Conteo físico',
      'Corrección de inventario',
      'Otro'
    ]
  };

  // Elementos del formulario
  const formulario = document.getElementById('formMovimiento');
  const selectorProducto = document.getElementById('productoMovimiento');
  const cantidad = document.getElementById('cantidadMovimiento');
  const motivo = document.getElementById('motivoMovimiento');
  const unidad = document.getElementById('unidadMovimiento');
  const etiquetaCantidad = document.getElementById('etiquetaCantidad');

  const documento = document.getElementById('documentoMovimiento');
  const proveedor = document.getElementById('proveedorMovimiento');
  const observaciones = document.getElementById('observacionesMovimiento');

  // Elementos del resumen
  const resumenProducto = document.getElementById('resumenProducto');
  const resumenActual = document.getElementById('resumenActual');
  const resumenTipo = document.getElementById('resumenTipo');
  const resumenCantidad = document.getElementById('resumenCantidad');
  const resumenResultado = document.getElementById('resumenResultado');

  const error = document.getElementById('errorMovimiento');
  const guardar = document.getElementById('guardarMovimiento');

  let guardando = false;

  // Obtener el tipo de movimiento seleccionado
  function tipoSeleccionado() {
    return document.querySelector(
      'input[name="tipoMovimiento"]:checked'
    )?.value || 'entrada';
  }

  // Formatear cantidades
  function formato(numero) {
    return Number(numero).toLocaleString('es-CO', {
      maximumFractionDigits: 0
    });
  }

  // Mostrar mensajes de error
  function mostrarError(mensaje) {
    error.textContent = mensaje;
    error.hidden = !mensaje;
  }

  // Obtener el producto seleccionado
  function productoSeleccionado() {
    const id = Number(selectorProducto.value);

    return productos.find(
      producto => Number(producto.id_producto) === id
    );
  }

  // Cargar productos desde MySQL
  async function cargarProductos() {
    selectorProducto.disabled = true;
    guardar.disabled = true;

    selectorProducto.innerHTML =
      '<option value="">Cargando productos...</option>';

    try {
      const respuesta = await fetch(`${API_URL}/productos`);

      if (!respuesta.ok) {
        throw new Error('No se pudieron consultar los productos.');
      }

      const datos = await respuesta.json();

      if (!Array.isArray(datos)) {
        throw new Error('La respuesta de productos no es válida.');
      }

      productos = datos.filter(
        producto => Number(producto.estado) === 1
      );

      selectorProducto.innerHTML =
        '<option value="">Seleccionar producto...</option>';

      productos.forEach(producto => {
        const opcion = document.createElement('option');

        opcion.value = producto.id_producto;
        opcion.textContent =
          `${producto.codigo} - ${producto.nombre}`;

        selectorProducto.appendChild(opcion);
      });

      selectorProducto.disabled = false;

      if (productos.length > 0) {
        selectorProducto.value = String(
          productos[0].id_producto
        );

        mostrarError('');
      } else {
        mostrarError('No hay productos activos registrados.');
      }

      actualizarResumen();

    } catch (err) {
      console.error('Error al cargar productos:', err);

      selectorProducto.innerHTML =
        '<option value="">No se pudieron cargar los productos</option>';

      mostrarError(
        'No se pudo conectar con el servidor. ' +
        'Comprueba que el backend esté funcionando en el puerto 4000.'
      );

      guardar.disabled = true;
    }
  }

  // Actualizar el tipo de movimiento
  function actualizarTipo() {
    const tipo = tipoSeleccionado();

    document.querySelectorAll('.movimiento__tipo')
      .forEach(opcion => {
        const radio = opcion.querySelector('input');

        opcion.classList.toggle(
          'activo',
          Boolean(radio?.checked)
        );
      });

    motivo.innerHTML =
      '<option value="">Seleccionar motivo...</option>';

    motivos[tipo].forEach(texto => {
      const opcion = document.createElement('option');

      opcion.value = texto;
      opcion.textContent = texto;

      motivo.appendChild(opcion);
    });

    etiquetaCantidad.textContent =
      tipo === 'ajuste' ? 'Existencia contada' : 'Cantidad';

    cantidad.min = tipo === 'ajuste' ? '0' : '1';
    cantidad.step = '1';

    const icono = document.getElementById('iconoResumen');

    if (icono) {
      icono.setAttribute(
        'data-lucide',
        tipo === 'entrada'
          ? 'arrow-down-to-line'
          : tipo === 'salida'
            ? 'arrow-up-from-line'
            : 'archive'
      );
    }

    window.lucide?.createIcons();

    actualizarResumen();
  }

  // Actualizar el resumen del movimiento
  function actualizarResumen() {
    const producto = productoSeleccionado();
    const tipo = tipoSeleccionado();

    const valor = Number(cantidad.value);

    const cantidadValida =
      cantidad.value.trim() !== '' &&
      Number.isSafeInteger(valor) &&
      valor >= 0 &&
      (tipo === 'ajuste' || valor > 0);

    if (!producto) {
      resumenProducto.textContent = 'Selecciona un producto';
      resumenActual.textContent = '—';
      resumenTipo.textContent = 'Movimiento';
      resumenCantidad.textContent = '—';
      resumenResultado.textContent = '—';

      unidad.textContent = 'unidades';
      guardar.disabled = true;

      return;
    }

    const stockActual = Number(producto.stock_actual);

    let resultado = stockActual;

    if (cantidadValida) {
      if (tipo === 'entrada') {
        resultado = stockActual + valor;
      }

      if (tipo === 'salida') {
        resultado = stockActual - valor;
      }

      if (tipo === 'ajuste') {
        resultado = valor;
      }
    }

    const nombres = {
      entrada: 'Entrada',
      salida: 'Salida',
      ajuste: 'Existencia contada'
    };

    resumenProducto.textContent = producto.nombre;

    resumenActual.textContent =
      `${formato(stockActual)} unidades`;

    resumenTipo.textContent = nombres[tipo];

    unidad.textContent = 'unidades';

    const signo =
      tipo === 'entrada' ? '+' :
      tipo === 'salida' ? '-' : '';

    resumenCantidad.textContent = cantidadValida
      ? `${signo}${formato(valor)} unidades`
      : '—';

    resumenResultado.textContent = cantidadValida
      ? `${formato(resultado)} unidades`
      : '—';

    let mensaje = '';

    if (!cantidadValida) {
      mensaje = tipo === 'ajuste'
        ? 'Ingresa una existencia contada válida.'
        : 'Ingresa una cantidad entera mayor que cero.';
    } else if (resultado < 0) {
      mensaje =
        'La salida supera las existencias disponibles.';
    } else if (resultado > 2147483647) {
      mensaje =
        'La existencia resultante supera el límite permitido.';
    }

    mostrarError(mensaje);

    guardar.disabled = Boolean(mensaje) || guardando;

    resumenResultado.classList.toggle(
      'movimiento__resultado--error',
      Boolean(mensaje)
    );
  }

  // Registrar el movimiento en MySQL
  async function registrarMovimiento(evento) {
    evento.preventDefault();

    if (guardando) return;

    actualizarResumen();

    if (!formulario.checkValidity()) {
      formulario.reportValidity();
      return;
    }

    if (guardar.disabled) return;

    const producto = productoSeleccionado();

    if (!producto) {
      mostrarError('Selecciona un producto válido.');
      return;
    }

    const tipo = tipoSeleccionado().toUpperCase();

    // Unir los campos opcionales en observaciones,
    // ya que no tienen columnas propias en la tabla.
    const detalles = [];

    if (documento.value.trim()) {
      detalles.push(
        `Documento: ${documento.value.trim()}`
      );
    }

    if (proveedor.value.trim()) {
      detalles.push(
        `Proveedor: ${proveedor.value.trim()}`
      );
    }

    if (observaciones.value.trim()) {
      detalles.push(observaciones.value.trim());
    }

    const datos = {
      id_producto: Number(producto.id_producto),
      tipo_movimiento: tipo,
      cantidad: Number(cantidad.value),
      motivo: motivo.value,
      observaciones: detalles.join(' | ')
    };

    guardando = true;
    guardar.disabled = true;

    const textoOriginal = guardar.innerHTML;

    guardar.textContent = 'Registrando movimiento...';

    try {
      const respuesta = await fetch(
        `${API_URL}/movimientos`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(datos)
        }
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.mensaje ||
          'No se pudo registrar el movimiento.'
        );
      }

      alert(
        'Movimiento registrado correctamente.\n\n' +
        `Producto: ${producto.nombre}\n` +
        `Tipo: ${tipo}\n` +
        `Stock anterior: ${resultado.movimiento.stock_anterior}\n` +
        `Stock nuevo: ${resultado.movimiento.stock_nuevo}`
      );

      // Regresar al inventario para ver el cambio
      window.location.href = 'inventario.html';

    } catch (err) {
      console.error('Error al registrar movimiento:', err);

      mostrarError(err.message);

      alert(`Error: ${err.message}`);

    } finally {
      guardando = false;
      guardar.innerHTML = textoOriginal;
      actualizarResumen();
    }
  }

  // Eventos del formulario
  document.querySelectorAll(
    'input[name="tipoMovimiento"]'
  ).forEach(radio => {
    radio.addEventListener('change', actualizarTipo);
  });

  selectorProducto.addEventListener(
    'change',
    actualizarResumen
  );

  cantidad.addEventListener(
    'input',
    actualizarResumen
  );

  formulario.addEventListener(
    'submit',
    registrarMovimiento
  );

  // Inicialización
  actualizarTipo();
  cargarProductos();
});
