document.addEventListener('DOMContentLoaded', async () => {

  const API = 'http://localhost:4000/api';

  const formulario = document.getElementById('formEditarProducto');
  const mensaje = document.getElementById('mensajeEditarProducto');
  const boton = document.getElementById('btnGuardarProducto');

  if (!formulario) return;

  const parametros = new URLSearchParams(window.location.search);
  const idProducto = Number(parametros.get('id'));

  const campos = {
    nombre: document.getElementById('editarNombre'),
    codigo: document.getElementById('editarCodigo'),
    categoria: document.getElementById('editarCategoria'),
    descripcion: document.getElementById('editarDescripcion'),
    compra: document.getElementById('editarCompra'),
    venta: document.getElementById('editarVenta'),
    minimo: document.getElementById('editarMinimo'),
    existencia: document.getElementById('editarExistencia')
  };

  function mostrarMensaje(texto, error = false) {
    mensaje.textContent = texto;
    mensaje.style.color = error ? '#b42318' : '#155b3d';
  }

  if (!Number.isSafeInteger(idProducto) || idProducto <= 0) {
    mostrarMensaje('No se seleccionó un producto válido.', true);
    boton.disabled = true;
    return;
  }

  boton.disabled = true;
  mostrarMensaje('Cargando información del producto...');

  try {
    const [respuestaCategorias, respuestaProducto] = await Promise.all([
      fetch(`${API}/categorias`),
      fetch(`${API}/productos/${idProducto}`)
    ]);

    if (!respuestaCategorias.ok || !respuestaProducto.ok) {
      throw new Error('No fue posible cargar los datos del producto.');
    }

    const categorias = await respuestaCategorias.json();
    const producto = await respuestaProducto.json();

    campos.categoria.replaceChildren();

    categorias.forEach(categoria => {
      const opcion = document.createElement('option');

      opcion.value = categoria.id_categoria;
      opcion.textContent = categoria.nombre;

      campos.categoria.appendChild(opcion);
    });

    campos.nombre.value = producto.nombre;
    campos.codigo.value = producto.codigo;
    campos.categoria.value = String(producto.id_categoria);
    campos.descripcion.value = producto.descripcion || '';
    campos.compra.value = producto.precio_compra;
    campos.venta.value = producto.precio_venta;
    campos.minimo.value = producto.stock_minimo;
    campos.existencia.value = producto.stock_actual;

    if (!campos.categoria.value) {
      throw new Error(
        'La categoría actual no está disponible. Revisa las categorías.'
      );
    }

    boton.disabled = false;
    mostrarMensaje('');

  } catch (error) {
    mostrarMensaje(error.message, true);
    return;
  }

  formulario.addEventListener('submit', async evento => {
    evento.preventDefault();

    if (!formulario.reportValidity()) return;

    const datos = {
      nombre: campos.nombre.value.trim(),
      codigo: campos.codigo.value.trim(),
      id_categoria: Number(campos.categoria.value),
      descripcion: campos.descripcion.value.trim(),
      precio_compra: Number(campos.compra.value),
      precio_venta: Number(campos.venta.value),
      stock_minimo: Number(campos.minimo.value)
    };

    boton.disabled = true;
    boton.textContent = 'Guardando cambios...';

    try {
      const respuesta = await fetch(
        `${API}/productos/${idProducto}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(datos)
        }
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.mensaje || 'No fue posible actualizar el producto.'
        );
      }

      mostrarMensaje('Producto actualizado correctamente.');

      window.location.href = 'productos.html';

    } catch (error) {
      mostrarMensaje(error.message, true);
      boton.disabled = false;
      boton.textContent = 'Guardar cambios';
    }
  });

});
