
document.addEventListener('DOMContentLoaded', () => {

  // Obtener los elementos del formulario.
  const formulario = document.getElementById('formNuevoProducto');
  const nombre = document.getElementById('nombreProducto');
  const unidad = document.getElementById('unidadProducto');
  const existencia = document.getElementById('existenciaProducto');

  const vistaNombre = document.getElementById('vistaNombre');
  const vistaTipo = document.getElementById('vistaTipo');
  const vistaInventario = document.getElementById('vistaInventario');

  const aviso = document.getElementById('avisoPresentacion');
  const mensaje = document.getElementById('mensajeProducto');

  const opciones = document.querySelectorAll('.nuevo-producto__opcion');
  const radios = document.querySelectorAll('input[name="tipoProducto"]');

  if (!formulario) return;

  // Identificar el tipo de producto seleccionado.
  function obtenerTipo() {
    return document.querySelector(
      'input[name="tipoProducto"]:checked'
    )?.value || 'granel';
  }

  // Actualizar la información de la vista previa.
  function actualizarVista() {
    vistaNombre.textContent = nombre.value.trim() || 'Vista del producto';

    vistaTipo.textContent =
      obtenerTipo() === 'granel' ? 'A granel' : 'Empacado';

    vistaInventario.textContent =
      `${existencia.value || 0} ${unidad.value}`;
  }

  // Cambiar las unidades según el tipo de producto.
  function cambiarTipo() {

    const tipo = obtenerTipo();

    opciones.forEach((opcion) => {
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

  // Actualizar la vista previa al escribir.
  nombre.addEventListener('input', actualizarVista);
  unidad.addEventListener('change', actualizarVista);
  existencia.addEventListener('input', actualizarVista);

  // Detectar cambios entre granel y empacado.
  radios.forEach((radio) => {
    radio.addEventListener('change', cambiarTipo);
  });

  // Validar el formulario al guardar.
  formulario.addEventListener('submit', (evento) => {

    evento.preventDefault();

    if (!formulario.reportValidity()) return;

    const datos = Object.fromEntries(
      new FormData(formulario).entries()
    );

    // Guardar únicamente una demostración local.
    // La conexión con MySQL se realizará en el backend.
    try {
      localStorage.setItem(
        'salsamentaria_producto_demo',
        JSON.stringify(datos)
      );

      mensaje.textContent =
        'Formulario validado. Producto guardado como demostración local.';
      mensaje.style.color = '#155b3d';

    } catch (error) {
      mensaje.textContent =
        'Formulario validado, pero no fue posible guardar la demostración.';
      mensaje.style.color = '#b42318';
    }
  });

  // Establecer el estado inicial de la pantalla.
  cambiarTipo();

});
