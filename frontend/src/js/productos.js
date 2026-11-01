
document.addEventListener('DOMContentLoaded', () => {

  const buscador = document.getElementById('buscarProducto');
  const categoria = document.getElementById('filtroCategoria');
  const estado = document.getElementById('filtroEstado');

  const tabla = document.getElementById('tablaProductos');
  const sinResultados = document.getElementById('sinResultados');
  const resumen = document.getElementById('resumenProductos');
  const paginacion = document.getElementById('paginacionProductos');

  if (!buscador || !categoria || !estado || !tabla) return;

  const filas = Array.from(tabla.querySelectorAll('tr'));
  const registrosPorPagina = 5;

  let paginaActual = 1;
  let filasFiltradas = [...filas];

  function normalizar(texto) {
    return String(texto)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function filtrarProductos() {

    const busqueda = normalizar(buscador.value);
    const categoriaSeleccionada = categoria.value;
    const estadoSeleccionado = estado.value;

    filasFiltradas = filas.filter((fila) => {

      const nombre = normalizar(fila.dataset.nombre || '');
      const codigo = normalizar(fila.dataset.codigo || '');
      const categoriaTexto = normalizar(
        fila.cells[2]?.textContent || ''
      );

      const coincideBusqueda =
        nombre.includes(busqueda) ||
        codigo.includes(busqueda) ||
        categoriaTexto.includes(busqueda);

      const coincideCategoria =
        categoriaSeleccionada === 'todos' ||
        fila.dataset.categoria === categoriaSeleccionada;

      const coincideEstado =
        estadoSeleccionado === 'todos' ||
        fila.dataset.estado === estadoSeleccionado;

      return coincideBusqueda &&
             coincideCategoria &&
             coincideEstado;
    });

    paginaActual = 1;
    mostrarPagina();
  }

  function mostrarPagina() {

    const total = filasFiltradas.length;

    const totalPaginas = Math.max(
      1,
      Math.ceil(total / registrosPorPagina)
    );

    paginaActual = Math.min(
      Math.max(paginaActual, 1),
      totalPaginas
    );

    const inicio = (paginaActual - 1) * registrosPorPagina;
    const fin = inicio + registrosPorPagina;

    const filasPagina = filasFiltradas.slice(inicio, fin);
    const filasVisibles = new Set(filasPagina);

    filas.forEach((fila) => {
      fila.hidden = !filasVisibles.has(fila);
    });

    if (sinResultados) {
      sinResultados.hidden = total !== 0;
    }

    if (resumen) {
      if (total === 0) {
        resumen.textContent = 'Mostrando 0 registros';
      } else {
        resumen.textContent =
          `Mostrando ${inicio + 1}–${Math.min(fin, total)} ` +
          `de ${total} registros`;
      }
    }

    crearPaginacion(totalPaginas);
  }

  function crearBoton(texto, pagina, deshabilitado, activo = false) {

    const boton = document.createElement('button');

    boton.type = 'button';
    boton.textContent = texto;
    boton.disabled = deshabilitado;

    boton.className = 'productos__pagina';

    if (activo) {
      boton.classList.add('productos__pagina--activa');
      boton.setAttribute('aria-current', 'page');
    }

    boton.addEventListener('click', () => {
      paginaActual = pagina;
      mostrarPagina();
    });

    return boton;
  }

  function crearPaginacion(totalPaginas) {

    if (!paginacion) return;

    paginacion.replaceChildren();

    paginacion.appendChild(
      crearBoton('‹', paginaActual - 1, paginaActual === 1)
    );

    for (let numero = 1; numero <= totalPaginas; numero++) {

      paginacion.appendChild(
        crearBoton(
          String(numero),
          numero,
          false,
          numero === paginaActual
        )
      );
    }

    paginacion.appendChild(
      crearBoton(
        '›',
        paginaActual + 1,
        paginaActual === totalPaginas
      )
    );
  }

  buscador.addEventListener('input', filtrarProductos);
  categoria.addEventListener('change', filtrarProductos);
  estado.addEventListener('change', filtrarProductos);

  filtrarProductos();

});
