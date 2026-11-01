
document.addEventListener('DOMContentLoaded', () => {

  // Productos de ejemplo con sus existencias.
  const productos = {
    harina: { nombre: 'Harina de trigo', stock: 42 },
    mantequilla: { nombre: 'Mantequilla', stock: 18 },
    maiz: { nombre: 'Maíz trillado', stock: 35 }
  };

  const claveRegistros = 'primavera_fraccionamientos';
  const claveExistencias = 'primavera_existencias_fraccionamiento';

  // Recuperar existencias de demostración.
  let existencias = {};

  try {
    existencias = JSON.parse(
      localStorage.getItem(claveExistencias) || '{}'
    ) || {};
  } catch {
    existencias = {};
  }

  // Elementos del formulario.
  const formulario = document.getElementById('formFraccionamiento');
  const producto = document.getElementById('productoFraccionamiento');
  const cantidad = document.getElementById('cantidadUtilizada');
  const bolsas = document.getElementById('bolsasGeneradas');
  const mensaje = document.getElementById('mensajeFraccionamiento');

  const resumenProducto = document.getElementById('resumenProductoFraccionamiento');
  const resumenCantidad = document.getElementById('resumenCantidadUtilizada');
  const resumenPresentacion = document.getElementById('resumenPresentacion');
  const resumenBolsas = document.getElementById('resumenBolsas');
  const resumenPeso = document.getElementById('resumenPeso');
  const resumenDiferencia = document.getElementById('resumenDiferencia');
  const existenciaDisponible = document.getElementById('existenciaDisponible');

  // Obtiene la presentación seleccionada en gramos.
  function presentacionSeleccionada() {
    return Number(
      document.querySelector('input[name="presentacion"]:checked').value
    );
  }

  // Muestra los números con formato colombiano.
  function formato(numero) {
    return numero.toLocaleString('es-CO', {
      maximumFractionDigits: 3
    });
  }

  // Consulta la existencia del producto seleccionado.
  function obtenerStock() {
    const codigo = producto.value;
    const guardado = existencias[codigo];

    return typeof guardado === 'number'
      ? guardado
      : productos[codigo].stock;
  }

  // Calcula las cantidades del fraccionamiento.
  function calcular() {
    const usado = Number(cantidad.value);
    const numeroBolsas = Number(bolsas.value);
    const gramos = presentacionSeleccionada();

    const pesoEmpacado = (numeroBolsas * gramos) / 1000;
    const diferencia = usado - pesoEmpacado;
    const stock = obtenerStock();

    const cantidadValida =
      cantidad.value !== '' &&
      Number.isFinite(usado) &&
      usado > 0;

    const bolsasValidas =
      bolsas.value !== '' &&
      Number.isInteger(numeroBolsas) &&
      numeroBolsas > 0;

    resumenProducto.textContent = productos[producto.value].nombre;
    existenciaDisponible.textContent = `${formato(stock)} kg`;
    resumenCantidad.textContent = cantidadValida
      ? `${formato(usado)} kg`
      : '—';

    resumenPresentacion.textContent = `${gramos} g`;
    resumenBolsas.textContent = bolsasValidas
      ? `${formato(numeroBolsas)} und`
      : '—';

    resumenPeso.textContent = bolsasValidas
      ? `${formato(pesoEmpacado)} kg`
      : '—';

    resumenDiferencia.textContent =
      cantidadValida && bolsasValidas
        ? `${formato(diferencia)} kg`
        : '—';

    resumenDiferencia.classList.toggle(
      'fraccionamiento__valor-error',
      diferencia < -0.000001
    );

    // Validaciones antes de registrar.
    let error = '';

    if (!cantidadValida || !bolsasValidas) {
      error = 'Ingresa cantidades válidas.';
    } else if (usado > stock) {
      error = 'La cantidad utilizada supera las existencias disponibles.';
    } else if (diferencia < -0.000001) {
      error = 'El peso empacado no puede superar la cantidad utilizada.';
    } else if (diferencia > 0.000001) {
      error = 'Existe una diferencia de peso. Verifica las cantidades antes de registrar.';
    }

    return {
      error,
      usado,
      numeroBolsas,
      gramos,
      pesoEmpacado,
      diferencia,
      stock
    };
  }

  // Actualiza los estilos y el resumen.
  function actualizar() {
    document.querySelectorAll('.fraccionamiento__opcion')
      .forEach(opcion => {
        opcion.classList.toggle(
          'activo',
          opcion.querySelector('input').checked
        );
      });

    calcular();
    mensaje.hidden = true;
  }

  // Eventos para recalcular el resumen.
  producto.addEventListener('change', actualizar);
  cantidad.addEventListener('input', actualizar);
  bolsas.addEventListener('input', actualizar);

  document.querySelectorAll('input[name="presentacion"]')
    .forEach(opcion => {
      opcion.addEventListener('change', actualizar);
    });

  // Registrar un fraccionamiento de demostración.
  formulario.addEventListener('submit', evento => {
    evento.preventDefault();

    if (!formulario.reportValidity()) return;

    const datos = calcular();

    if (datos.error) {
      mensaje.textContent = datos.error;
      mensaje.hidden = false;
      mensaje.classList.add('fraccionamiento__mensaje--error');
      return;
    }

    let registros = [];

    try {
      registros = JSON.parse(
        localStorage.getItem(claveRegistros) || '[]'
      );

      if (!Array.isArray(registros)) registros = [];
    } catch {
      registros = [];
    }

    // Número consecutivo para los registros de ejemplo.
    const siguiente = registros.length
      ? Math.max(...registros.map(r => Number(r.numero) || 38)) + 1
      : 39;

    const nuevoRegistro = {
      numero: siguiente,
      codigo: `F-${String(siguiente).padStart(4, '0')}`,
      producto: productos[producto.value].nombre,
      productoId: producto.value,
      cantidad: datos.usado,
      presentacion: datos.gramos,
      bolsas: datos.numeroBolsas,
      peso: datos.pesoEmpacado,
      merma: datos.diferencia,
      fecha: new Date().toISOString(),
      responsable: 'Ana Martínez',
      observaciones: document.getElementById(
        'observacionesFraccionamiento'
      ).value.trim()
    };

    // Guardar los datos de prueba en el navegador.
    registros.unshift(nuevoRegistro);

    const stockRestante = datos.stock - datos.usado;

    try {
      localStorage.setItem(
        claveRegistros,
        JSON.stringify(registros)
      );

      existencias[producto.value] = stockRestante;

      localStorage.setItem(
        claveExistencias,
        JSON.stringify(existencias)
      );
    } catch {
      mensaje.textContent =
        'No fue posible guardar la demostración en este navegador.';
      mensaje.hidden = false;
      mensaje.classList.add('fraccionamiento__mensaje--error');
      return;
    }

    mensaje.classList.remove('fraccionamiento__mensaje--error');
    mensaje.textContent =
      `Fraccionamiento ${nuevoRegistro.codigo} registrado en la demostración.`;
    mensaje.hidden = false;

    // Agregar el registro a la tabla de recientes.
    const tabla = document.getElementById(
      'tablaFraccionamientosRecientes'
    );

    const fila = document.createElement('tr');

    const valores = [
      nuevoRegistro.codigo,
      nuevoRegistro.producto,
      `${formato(nuevoRegistro.cantidad)} kg`,
      nuevoRegistro.presentacion === 250
        ? 'Media libra'
        : nuevoRegistro.presentacion === 500
          ? 'Una libra'
          : 'Un kilogramo',
      String(nuevoRegistro.bolsas),
      'Ahora',
      nuevoRegistro.responsable
    ];

    valores.forEach(valor => {
      const celda = document.createElement('td');
      celda.textContent = valor;
      fila.appendChild(celda);
    });

    tabla.prepend(fila);

    // Refrescar existencias después del registro.
    calcular();
  });

  formulario.addEventListener('reset', () => {
    setTimeout(actualizar, 0);
  });

  actualizar();
});
