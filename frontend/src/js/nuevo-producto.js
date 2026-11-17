document.addEventListener('DOMContentLoaded', () => {
  const API_URL = 'http://localhost:4000/api';

  const formulario = document.getElementById('formNuevoProducto');
  if (!formulario) return;

  const nombre = document.getElementById('nombreProducto');
  const codigo = document.getElementById('codigoProducto');
  const categoria = document.getElementById('categoriaProducto');
  const descripcion = document.getElementById('descripcionProducto');
  const unidad = document.getElementById('unidadProducto');
  const existencia = document.getElementById('existenciaProducto');
  const stockMinimo = document.getElementById('stockMinimo');
  const proveedor = document.getElementById('proveedorProducto');
  const precioCompra = document.getElementById('precioCompra');
  const precioVenta = document.getElementById('precioVenta');

  const vistaNombre = document.getElementById('vistaNombre');
  const vistaTipo = document.getElementById('vistaTipo');
  const vistaInventario = document.getElementById('vistaInventario');

  const aviso = document.getElementById('avisoPresentacion');
  const mensaje = document.getElementById('mensajeProducto');
  const botonGuardar = formulario.querySelector('button[type="submit"]');

  const opciones = document.querySelectorAll('.nuevo-producto__opcion');
  const radios = document.querySelectorAll('input[name="tipoProducto"]');

  function obtenerTipo() {
    return document.querySelector(
      'input[name="tipoProducto"]:checked'
    )?.value || 'granel';
  }

  function mostrarMensaje(texto, esError = false) {
    mensaje.textContent = texto;
    mensaje.style.color = esError ? '#b42318' : '#155b3d';
  }

  function actualizarVista() {
    vistaNombre.textContent =
      nombre.value.trim() || 'Vista del producto';

    vistaTipo.textContent =
      obtenerTipo() === 'granel' ? 'A granel' : 'Empacado';

    vistaInventario.textContent =
      `${existencia.value || 0} ${unidad.value}`;
  }

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

  async function cargarCategorias() {
    try {
      const respuesta = await fetch(`${API_URL}/categorias`);

      if (!respuesta.ok) {
        throw new Error('No se pudieron consultar las categorías');
      }

      const categorias = await respuesta.json();

      categoria.innerHTML =
        '<option value="">Seleccionar categoría...</option>';

      categorias.forEach((item) => {
        const opcion = document.createElement('option');
        opcion.value = String(item.id_categoria);
        opcion.textContent = item.nombre;
        categoria.appendChild(opcion);
      });

    } catch (error) {
      mostrarMensaje(
        'No fue posible cargar las categorías. Comprueba que el backend esté activo.',
        true
      );
    }
  }

  nombre.addEventListener('input', actualizarVista);
  unidad.addEventListener('change', actualizarVista);
  existencia.addEventListener('input', actualizarVista);

  radios.forEach((radio) => {
    radio.addEventListener('change', cambiarTipo);
  });

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    if (!formulario.reportValidity()) return;

    const cantidad = Number(existencia.value);
    const minimo = Number(stockMinimo.value);

    if (
      !Number.isInteger(cantidad) ||
      !Number.isInteger(minimo) ||
      cantidad < 0 ||
      minimo < 0
    ) {
      mostrarMensaje(
        'Por ahora, las existencias y el stock mínimo deben ser números enteros.',
        true
      );
      return;
    }

    const datos = {
      nombre: nombre.value.trim(),
      codigo: codigo.value.trim(),
      id_categoria: Number(categoria.value),
      descripcion: descripcion.value.trim(),
      tipoProducto: obtenerTipo(),
      unidad: unidad.value,
      stock_actual: cantidad,
      stock_minimo: minimo,
      proveedor: proveedor.value.trim(),
      precio_compra: Number(precioCompra.value),
      precio_venta: Number(precioVenta.value)
    };

    botonGuardar.disabled = true;
    mostrarMensaje('Guardando producto en MySQL...');

    try {
      const respuesta = await fetch(`${API_URL}/productos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(datos)
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.mensaje || 'No se pudo registrar el producto'
        );
      }

      mostrarMensaje('Producto registrado correctamente en MySQL.');

      formulario.reset();
      cambiarTipo();

      setTimeout(() => {
        window.location.href = 'productos.html';
      }, 1200);

    } catch (error) {
      mostrarMensaje(error.message, true);
    } finally {
      botonGuardar.disabled = false;
    }
  });

  cambiarTipo();
  cargarCategorias();
});
