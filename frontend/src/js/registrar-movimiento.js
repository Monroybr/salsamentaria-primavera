
document.addEventListener('DOMContentLoaded', () => {

  // Productos de ejemplo para el formulario.
  const productos = {
    harina: { nombre: 'Harina de trigo', stock: 42, unidad: 'kg' },
    mantequilla: { nombre: 'Mantequilla', stock: 18, unidad: 'kg' },
    maiz: { nombre: 'Maíz trillado', stock: 35, unidad: 'kg' },
    queso: { nombre: 'Queso campesino', stock: 3.2, unidad: 'kg' },
    chorizo: {
      nombre: 'Chorizo santarrosano - 1 kg',
      stock: 8,
      unidad: 'bolsas'
    }
  };

  // Motivos disponibles según el movimiento.
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

  // Elementos del formulario.
  const formulario = document.getElementById('formMovimiento');
  const selectorProducto = document.getElementById('productoMovimiento');
  const cantidad = document.getElementById('cantidadMovimiento');
  const motivo = document.getElementById('motivoMovimiento');
  const unidad = document.getElementById('unidadMovimiento');
  const etiquetaCantidad = document.getElementById('etiquetaCantidad');

  const resumenProducto = document.getElementById('resumenProducto');
  const resumenActual = document.getElementById('resumenActual');
  const resumenTipo = document.getElementById('resumenTipo');
  const resumenCantidad = document.getElementById('resumenCantidad');
  const resumenResultado = document.getElementById('resumenResultado');
  const error = document.getElementById('errorMovimiento');
  const guardar = document.getElementById('guardarMovimiento');

  // Obtiene el tipo de movimiento seleccionado.
  function tipoSeleccionado() {
    return document.querySelector(
      'input[name="tipoMovimiento"]:checked'
    ).value;
  }

  // Muestra cantidades con formato sencillo.
  function formato(numero) {
    return numero.toLocaleString('es-CO', {
      maximumFractionDigits: 2
    });
  }

  // Actualiza los motivos y el estilo de selección.
  function actualizarTipo() {
    const tipo = tipoSeleccionado();

    document.querySelectorAll('.movimiento__tipo')
      .forEach(opcion => {
        const radio = opcion.querySelector('input');
        opcion.classList.toggle('activo', radio.checked);
      });

    motivo.innerHTML = '<option value="">Seleccionar motivo...</option>';

    motivos[tipo].forEach(texto => {
      const opcion = document.createElement('option');
      opcion.value = texto;
      opcion.textContent = texto;
      motivo.appendChild(opcion);
    });

    etiquetaCantidad.textContent = tipo === 'ajuste'
      ? 'Existencia contada'
      : 'Cantidad';

    document.getElementById('iconoResumen')
      .setAttribute(
        'data-lucide',
        tipo === 'entrada'
          ? 'arrow-down-to-line'
          : tipo === 'salida'
            ? 'arrow-up-from-line'
            : 'archive'
      );

    window.lucide?.createIcons();
    actualizarResumen();
  }

  // Calcula las existencias resultantes.
  function actualizarResumen() {
    const producto = productos[selectorProducto.value];
    const tipo = tipoSeleccionado();
    const valor = Number(cantidad.value);
    const cantidadValida = cantidad.value.trim() !== '' &&
      Number.isFinite(valor) && valor >= 0 &&
      (tipo === 'ajuste' || valor > 0);

    let resultado = producto.stock;

    if (cantidadValida) {
      if (tipo === 'entrada') resultado += valor;
      if (tipo === 'salida') resultado -= valor;
      if (tipo === 'ajuste') resultado = valor;
    }

    const nombres = {
      entrada: 'Entrada',
      salida: 'Salida',
      ajuste: 'Existencia contada'
    };

    resumenProducto.textContent = producto.nombre;
    resumenActual.textContent =
      `${formato(producto.stock)} ${producto.unidad}`;

    resumenTipo.textContent = nombres[tipo];
    unidad.textContent = producto.unidad;

    const signo = tipo === 'entrada' ? '+' :
      tipo === 'salida' ? '-' : '';

    resumenCantidad.textContent = cantidadValida
      ? `${signo}${formato(valor)} ${producto.unidad}`
      : '—';

    resumenResultado.textContent = cantidadValida
      ? `${formato(resultado)} ${producto.unidad}`
      : '—';

    // Impide registrar salidas superiores al stock.
    let mensaje = '';

    if (!cantidadValida) {
      mensaje = tipo === 'ajuste'
        ? 'Ingresa una existencia contada válida.'
        : 'Ingresa una cantidad mayor que cero.';
    } else if (resultado < 0) {
      mensaje = 'La salida supera las existencias disponibles.';
    } else if (
      producto.unidad === 'bolsas' &&
      !Number.isInteger(valor)
    ) {
      mensaje = 'La cantidad de bolsas debe ser un número entero.';
    }

    error.textContent = mensaje;
    error.hidden = !mensaje;
    guardar.disabled = Boolean(mensaje);

    resumenResultado.classList.toggle(
      'movimiento__resultado--error',
      Boolean(mensaje)
    );
  }

  // Detecta cambios en el formulario.
  document.querySelectorAll('input[name="tipoMovimiento"]')
    .forEach(radio => {
      radio.addEventListener('change', actualizarTipo);
    });

  selectorProducto.addEventListener('change', actualizarResumen);
  cantidad.addEventListener('input', actualizarResumen);

  // Simula el registro sin modificar la base de datos.
  formulario.addEventListener('submit', evento => {
    evento.preventDefault();
    actualizarResumen();

    if (!formulario.checkValidity()) {
      formulario.reportValidity();
      return;
    }

    if (guardar.disabled) return;

    alert(
      'Movimiento validado correctamente.\n\n' +
      'Esta es una demostración del frontend. ' +
      'El registro real se implementará al conectar el backend.'
    );
  });

  actualizarTipo();
});
