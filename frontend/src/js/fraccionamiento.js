
document.addEventListener('DOMContentLoaded', () => {
  const API_URL = 'http://localhost:4000/api/fraccionamientos';

  const formulario = document.getElementById('formFraccionamiento');
  if (!formulario) return;

  const producto = document.getElementById('productoFraccionamiento');
  const cantidad = document.getElementById('cantidadUtilizada');
  const bolsas = document.getElementById('bolsasGeneradas');
  const observaciones = document.getElementById('observacionesFraccionamiento');
  const mensaje = document.getElementById('mensajeFraccionamiento');
  const botonGuardar = document.getElementById('guardarFraccionamiento');

  const resumenProducto = document.getElementById(
    'resumenProductoFraccionamiento'
  );
  const resumenCantidad = document.getElementById(
    'resumenCantidadUtilizada'
  );
  const resumenPresentacion = document.getElementById(
    'resumenPresentacion'
  );
  const resumenBolsas = document.getElementById('resumenBolsas');
  const resumenPeso = document.getElementById('resumenPeso');
  const resumenDiferencia = document.getElementById('resumenDiferencia');
  const existenciaDisponible = document.getElementById(
    'existenciaDisponible'
  );
  const tablaRecientes = document.getElementById(
    'tablaFraccionamientosRecientes'
  );

  let productos = [];
  let guardando = false;

  function formato(numero) {
    return Number(numero).toLocaleString('es-CO', {
      maximumFractionDigits: 3
    });
  }

  function mostrarMensaje(texto, esError = false) {
    mensaje.textContent = texto;
    mensaje.hidden = false;
    mensaje.classList.toggle(
      'fraccionamiento__mensaje--error',
      esError
    );
  }

  function ocultarMensaje() {
    mensaje.hidden = true;
    mensaje.textContent = '';
    mensaje.classList.remove('fraccionamiento__mensaje--error');
  }

  function obtenerProducto() {
    return productos.find(
      item => Number(item.id_producto) === Number(producto.value)
    );
  }

  function obtenerPresentacion() {
    return Number(
      document.querySelector(
        'input[name="presentacion"]:checked'
      )?.value || 500
    );
  }

  function nombrePresentacion(gramos) {
    if (Number(gramos) === 250) return 'Media libra';
    if (Number(gramos) === 500) return 'Una libra';
    if (Number(gramos) === 1000) return 'Un kilogramo';
    return `${gramos} g`;
  }

  function calcular() {
    const seleccionado = obtenerProducto();

    const usado = Number(cantidad.value);
    const numeroBolsas = Number(bolsas.value);
    const gramos = obtenerPresentacion();

    const stock = seleccionado
      ? Number(seleccionado.stock_actual)
      : 0;

    const cantidadValida =
      cantidad.value !== '' &&
      Number.isFinite(usado) &&
      usado > 0 &&
      Math.abs(
        usado * 1000 - Math.round(usado * 1000)
      ) < 0.000001;

    const bolsasValidas =
      bolsas.value !== '' &&
      Number.isInteger(numeroBolsas) &&
      numeroBolsas > 0;

    const pesoEmpacado = bolsasValidas
      ? (numeroBolsas * gramos) / 1000
      : 0;

    const diferencia = cantidadValida && bolsasValidas
      ? Math.round((usado - pesoEmpacado) * 1000) / 1000
      : 0;

    resumenProducto.textContent = seleccionado
      ? seleccionado.nombre
      : 'Selecciona un producto';

    existenciaDisponible.textContent = seleccionado
      ? `${formato(stock)} kg`
      : '— kg';

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
      diferencia < 0
    );

    let error = '';

    if (!seleccionado) {
      error = 'Selecciona un producto a granel.';
    } else if (!cantidadValida) {
      error = 'Ingresa una cantidad válida, con máximo tres decimales.';
    } else if (!bolsasValidas) {
      error = 'Ingresa un número entero de bolsas mayor que cero.';
    } else if (usado > stock) {
      error = 'La cantidad supera las existencias disponibles.';
    } else if (diferencia < 0) {
      error = 'El peso empacado supera la cantidad utilizada.';
    } else if (diferencia > 0) {
      error = 'La cantidad utilizada debe coincidir con el peso empacado.';
    }

    return {
      error,
      seleccionado,
      usado,
      numeroBolsas,
      gramos,
      pesoEmpacado,
      diferencia,
      stock
    };
  }

  function actualizar() {
    document.querySelectorAll('.fraccionamiento__opcion')
      .forEach(opcion => {
        const radio = opcion.querySelector('input');

        opcion.classList.toggle(
          'activo',
          Boolean(radio?.checked)
        );
      });

    calcular();
    ocultarMensaje();
  }

  async function cargarProductos(idPreferido = null) {
    const respuesta = await fetch(`${API_URL}/productos`);

    if (!respuesta.ok) {
      throw new Error('No fue posible consultar los productos a granel.');
    }

    const datos = await respuesta.json();

    if (!Array.isArray(datos)) {
      throw new Error('La respuesta de productos no es válida.');
    }

    productos = datos;

    producto.replaceChildren();

    const opcionInicial = document.createElement('option');
    opcionInicial.value = '';
    opcionInicial.textContent = 'Seleccionar producto...';
    producto.appendChild(opcionInicial);

    productos.forEach(item => {
      const opcion = document.createElement('option');

      opcion.value = String(item.id_producto);
      opcion.textContent = `${item.nombre} (${formato(item.stock_actual)} kg)`;

      producto.appendChild(opcion);
    });

    if (
      idPreferido !== null &&
      productos.some(
        item => Number(item.id_producto) === Number(idPreferido)
      )
    ) {
      producto.value = String(idPreferido);
    } else if (productos.length > 0) {
      producto.value = String(productos[0].id_producto);
    }

    producto.disabled = productos.length === 0;
    botonGuardar.disabled = productos.length === 0;

    calcular();
  }

  function agregarCelda(fila, texto, destacado = false) {
    const celda = document.createElement('td');

    if (destacado) {
      const strong = document.createElement('strong');
      strong.textContent = texto;
      celda.appendChild(strong);
    } else {
      celda.textContent = texto;
    }

    fila.appendChild(celda);
  }

  function formatearFecha(fecha) {
    if (!fecha) return '—';

    const valor = new Date(fecha);

    if (Number.isNaN(valor.getTime())) return '—';

    return valor.toLocaleString('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  }

  async function cargarRecientes() {
    const respuesta = await fetch(API_URL);

    if (!respuesta.ok) {
      throw new Error('No fue posible consultar los fraccionamientos.');
    }

    const registros = await respuesta.json();

    if (!Array.isArray(registros)) {
      throw new Error('La respuesta del historial no es válida.');
    }

    tablaRecientes.replaceChildren();

    if (registros.length === 0) {
      const fila = document.createElement('tr');
      const celda = document.createElement('td');

      celda.colSpan = 7;
      celda.textContent = 'Todavía no hay fraccionamientos registrados.';

      fila.appendChild(celda);
      tablaRecientes.appendChild(fila);
      return;
    }

    registros.slice(0, 5).forEach(registro => {
      const fila = document.createElement('tr');

      const codigo = `F-${String(
        registro.id_fraccionamiento
      ).padStart(4, '0')}`;

      agregarCelda(fila, codigo, true);
      agregarCelda(fila, registro.producto);
      agregarCelda(
        fila,
        `${formato(registro.cantidad_utilizada)} kg`
      );
      agregarCelda(
        fila,
        nombrePresentacion(registro.presentacion_gramos)
      );
      agregarCelda(
        fila,
        String(registro.bolsas_generadas)
      );
      agregarCelda(
        fila,
        formatearFecha(registro.fecha_registro)
      );

      // La tabla de fraccionamientos todavía no almacena
      // el usuario responsable.
      agregarCelda(fila, 'No registrado');

      tablaRecientes.appendChild(fila);
    });
  }

  async function inicializar() {
    botonGuardar.disabled = true;

    try {
      await cargarProductos();
    } catch (error) {
      producto.replaceChildren();

      const opcion = document.createElement('option');
      opcion.value = '';
      opcion.textContent = 'Error al cargar productos';

      producto.appendChild(opcion);
      producto.disabled = true;

      mostrarMensaje(error.message, true);
    }

    try {
      await cargarRecientes();
    } catch (error) {
      tablaRecientes.replaceChildren();

      const fila = document.createElement('tr');
      const celda = document.createElement('td');

      celda.colSpan = 7;
      celda.textContent = error.message;

      fila.appendChild(celda);
      tablaRecientes.appendChild(fila);
    }

    calcular();
  }

  producto.addEventListener('change', actualizar);
  cantidad.addEventListener('input', actualizar);
  bolsas.addEventListener('input', actualizar);

  document.querySelectorAll('input[name="presentacion"]')
    .forEach(radio => {
      radio.addEventListener('change', actualizar);
    });

  formulario.addEventListener('submit', async evento => {
    evento.preventDefault();

    if (guardando || !formulario.reportValidity()) return;

    const datos = calcular();

    if (datos.error) {
      mostrarMensaje(datos.error, true);
      return;
    }

    const cuerpo = {
      id_producto: Number(datos.seleccionado.id_producto),
      cantidad_utilizada: datos.usado,
      presentacion_gramos: datos.gramos,
      bolsas_generadas: datos.numeroBolsas,
      observaciones: observaciones.value.trim()
    };

    guardando = true;
    botonGuardar.disabled = true;

    mostrarMensaje('Registrando fraccionamiento en MySQL...');

    try {
      const respuesta = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cuerpo)
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.mensaje ||
          'No fue posible registrar el fraccionamiento.'
        );
      }

      const idRegistrado = resultado.id_fraccionamiento;
      const idProducto = cuerpo.id_producto;

      mostrarMensaje(
        `Fraccionamiento F-${String(idRegistrado).padStart(4, '0')} ` +
        'registrado correctamente en MySQL.'
      );

      formulario.reset();

      const actualizaciones = await Promise.allSettled([
        cargarProductos(idProducto),
        cargarRecientes()
      ]);

      const falloActualizacion = actualizaciones.some(
        resultado => resultado.status === 'rejected'
      );

      if (falloActualizacion) {
        mostrarMensaje(
          'El fraccionamiento se registró correctamente, ' +
          'pero no se pudieron actualizar todos los datos de la pantalla. ' +
          'Recarga la página para consultar los valores actuales.'
        );
      }

      calcular();

    } catch (error) {
      mostrarMensaje(error.message, true);

    } finally {
      guardando = false;
      botonGuardar.disabled = productos.length === 0;
    }
  });

  formulario.addEventListener('reset', () => {
    setTimeout(actualizar, 0);
  });

  actualizar();
  inicializar();
});
