
document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // ELEMENTOS DE LA PÁGINA
  // ==========================================

  const tabla = document.getElementById('tablaFraccionamientos');
  const buscador = document.getElementById('buscarFraccionamiento');
  const filtroProducto = document.getElementById('filtroProducto');
  const filtroPeriodo = document.getElementById('filtroPeriodo');
  const filtroResponsable = document.getElementById('filtroResponsable');

  const contador = document.getElementById('contadorFraccionamientos');
  const sinResultados = document.getElementById('sinFraccionamientos');
  const textoPaginacion = document.getElementById('textoPaginacion');
  const paginacion = document.getElementById('paginacionFraccionamientos');
  const botonExportar = document.getElementById('exportarFraccionamientos');

  // Evita errores si el archivo se carga en otra página.
  if (!tabla) return;

  // ==========================================
  // DATOS DE EJEMPLO
  // ==========================================

  // Estos registros permiten visualizar el mockup.
  // Después se reemplazarán por datos de MySQL.

  const hoy = new Date();

  function fechaDiasAtras(dias) {
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() - dias);
    return fecha.toISOString().slice(0, 10);
  }

  const ejemplos = [
    {
      codigo: 'F-0038',
      producto: 'Maíz trillado',
      cantidad: 4,
      presentacion: 'Una libra - 500 g',
      bolsas: 8,
      peso: 4,
      merma: 0,
      fecha: fechaDiasAtras(0),
      hora: '8:32 a. m.',
      responsable: 'Carlos Rojas'
    },
    {
      codigo: 'F-0037',
      producto: 'Mantequilla',
      cantidad: 6,
      presentacion: 'Media libra - 250 g',
      bolsas: 24,
      peso: 6,
      merma: 0,
      fecha: fechaDiasAtras(1),
      hora: '4:15 p. m.',
      responsable: 'Ana Martínez'
    },
    {
      codigo: 'F-0036',
      producto: 'Harina de trigo',
      cantidad: 10,
      presentacion: 'Un kilogramo - 1.000 g',
      bolsas: 10,
      peso: 10,
      merma: 0,
      fecha: fechaDiasAtras(2),
      hora: '11:20 a. m.',
      responsable: 'Carlos Rojas'
    },
    {
      codigo: 'F-0035',
      producto: 'Maíz trillado',
      cantidad: 7.5,
      presentacion: 'Una libra - 500 g',
      bolsas: 14,
      peso: 7,
      merma: 0.5,
      fecha: fechaDiasAtras(3),
      hora: '3:46 p. m.',
      responsable: 'Laura Pérez'
    },
    {
      codigo: 'F-0034',
      producto: 'Harina de trigo',
      cantidad: 5,
      presentacion: 'Una libra - 500 g',
      bolsas: 10,
      peso: 5,
      merma: 0,
      fecha: fechaDiasAtras(4),
      hora: '9:08 a. m.',
      responsable: 'Ana Martínez'
    }
  ];

  // ==========================================
  // REGISTROS GUARDADOS
  // ==========================================

  // Debe coincidir con la clave usada al guardar
  // fraccionamientos en la pantalla anterior.
  const CLAVE_STORAGE = 'fraccionamientos';

  function leerGuardados() {
    try {
      const datos = JSON.parse(
        localStorage.getItem(CLAVE_STORAGE) || '[]'
      );

      return Array.isArray(datos) ? datos : [];
    } catch (error) {
      console.error('No se pudieron leer los registros:', error);
      return [];
    }
  }

  // Convierte diferentes formatos de datos a uno común.
  function normalizarRegistro(registro, indice) {

    const cantidad = Number(
      registro.cantidad ?? registro.cantidadUtilizada ?? 0
    );

    const bolsas = Number(
      registro.bolsas ?? registro.cantidadBolsas ?? 0
    );

    // Obtiene el peso de cada presentación en gramos.
    const valorPresentacion =
      registro.presentacion ?? registro.pesoPresentacion ?? '500';

    const presentaciones = {
      '250': 'Media libra - 250 g',
      '500': 'Una libra - 500 g',
      '1000': 'Un kilogramo - 1.000 g',
      'media-libra': 'Media libra - 250 g',
      'una-libra': 'Una libra - 500 g',
      'kilogramo': 'Un kilogramo - 1.000 g'
    };

    const presentacion =
      presentaciones[String(valorPresentacion)] ||
      String(valorPresentacion);

    let gramos = 500;

    if (presentacion.includes('250')) gramos = 250;
    if (presentacion.includes('1.000') ||
        presentacion.includes('1000')) gramos = 1000;

    const pesoCalculado = bolsas * gramos / 1000;

    const peso = Number(
      registro.peso ?? registro.pesoEmpacado ?? pesoCalculado
    );

    const merma = Number(
      registro.merma ?? Math.max(0, cantidad - peso)
    );

    const fechaOriginal = registro.fecha || fechaDiasAtras(0);
    const fecha = String(fechaOriginal).slice(0, 10);

    return {
      codigo: String(
        registro.codigo ??
        registro.id ??
        `F-N${String(indice + 1).padStart(3, '0')}`
      ),
      producto: String(registro.producto || 'Producto sin nombre'),
      cantidad,
      presentacion,
      bolsas,
      peso,
      merma,
      fecha,
      hora: registro.hora || '',
      responsable: String(registro.responsable || 'Administrador')
    };
  }

  // Si hay datos guardados, se agregan al historial.
  const guardados = leerGuardados().map(normalizarRegistro);

  // Evita mostrar dos veces una operación con el mismo código.
  const codigosGuardados = new Set(
    guardados.map(registro => registro.codigo)
  );

  const registros = [
    ...guardados,
    ...ejemplos.filter(
      registro => !codigosGuardados.has(registro.codigo)
    )
  ];

  // ==========================================
  // FUNCIONES DE APOYO
  // ==========================================

  const POR_PAGINA = 5;
  let paginaActual = 1;
  let registrosFiltrados = [];

  function normalizar(texto) {
    return String(texto)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function numero(valor) {
    return Number(valor).toLocaleString('es-CO', {
      maximumFractionDigits: 2
    });
  }

  function fechaValida(texto) {
    const partes = String(texto).slice(0, 10).split('-');

    if (partes.length !== 3) return null;

    const [anio, mes, dia] = partes.map(Number);

    const fecha = new Date(anio, mes - 1, dia);

    if (Number.isNaN(fecha.getTime())) return null;

    return fecha;
  }

  function mostrarFecha(registro) {
    const fecha = fechaValida(registro.fecha);

    if (!fecha) return registro.fecha;

    const fechaHoy = new Date();
    fechaHoy.setHours(0, 0, 0, 0);

    const diferencia = Math.round(
      (fechaHoy - fecha) / 86400000
    );

    if (diferencia === 0) {
      return `Hoy, ${registro.hora}`.trim();
    }

    if (diferencia === 1) {
      return `Ayer, ${registro.hora}`.trim();
    }

    const texto = fecha.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short'
    });

    return `${texto}, ${registro.hora}`.trim();
  }

  // ==========================================
  // INDICADORES SUPERIORES
  // ==========================================

  function actualizarIndicadores() {

    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    const delMes = registros.filter(registro => {
      const fecha = fechaValida(registro.fecha);

      return fecha &&
        fecha.getMonth() === mesActual &&
        fecha.getFullYear() === anioActual;
    });

    const cantidad = delMes.reduce(
      (total, registro) => total + registro.cantidad, 0
    );

    const bolsas = delMes.reduce(
      (total, registro) => total + registro.bolsas, 0
    );

    const merma = delMes.reduce(
      (total, registro) => total + registro.merma, 0
    );

    document.getElementById('totalOperaciones').textContent =
      `${delMes.length} registros`;

    document.getElementById('totalUtilizado').textContent =
      `${numero(cantidad)} kg`;

    document.getElementById('totalBolsas').textContent =
      `${numero(bolsas)} unidades`;

    document.getElementById('totalMerma').textContent =
      `${numero(merma)} kg`;
  }

  // ==========================================
  // OPCIONES DE LOS FILTROS
  // ==========================================

  function llenarOpciones() {

    const productos = [...new Set(
      registros.map(registro => registro.producto)
    )].sort();

    const responsables = [...new Set(
      registros.map(registro => registro.responsable)
    )].sort();

    productos.forEach(producto => {
      const opcion = document.createElement('option');
      opcion.value = producto;
      opcion.textContent = producto;
      filtroProducto.appendChild(opcion);
    });

    responsables.forEach(responsable => {
      const opcion = document.createElement('option');
      opcion.value = responsable;
      opcion.textContent = responsable;
      filtroResponsable.appendChild(opcion);
    });
  }

  // ==========================================
  // FILTRAR REGISTROS
  // ==========================================

  function filtrar() {

    const busqueda = normalizar(buscador.value);
    const producto = filtroProducto.value;
    const periodo = filtroPeriodo.value;
    const responsable = filtroResponsable.value;

    registrosFiltrados = registros.filter(registro => {

      const coincideBusqueda =
        normalizar(registro.codigo).includes(busqueda) ||
        normalizar(registro.producto).includes(busqueda);

      const coincideProducto =
        producto === 'todos' ||
        registro.producto === producto;

      const coincideResponsable =
        responsable === 'todos' ||
        registro.responsable === responsable;

      let coincidePeriodo = true;

      if (periodo !== 'todos') {
        const fecha = fechaValida(registro.fecha);

        if (!fecha) {
          coincidePeriodo = false;
        } else if (periodo === 'mes') {
          coincidePeriodo =
            fecha.getMonth() === hoy.getMonth() &&
            fecha.getFullYear() === hoy.getFullYear();
        } else if (periodo === 'anterior') {

          const mesAnterior = new Date(
            hoy.getFullYear(),
            hoy.getMonth() - 1,
            1
          );

          coincidePeriodo =
            fecha.getMonth() === mesAnterior.getMonth() &&
            fecha.getFullYear() === mesAnterior.getFullYear();
        }
      }

      return coincideBusqueda &&
        coincideProducto &&
        coincideResponsable &&
        coincidePeriodo;
    });

    paginaActual = 1;
    mostrarTabla();
  }

  // ==========================================
  // CREAR ELEMENTOS DE LA TABLA
  // ==========================================

  function crearCelda(texto, clase = '') {
    const celda = document.createElement('td');
    celda.textContent = texto;

    if (clase) celda.className = clase;

    return celda;
  }

  function crearEtiqueta(texto, clase) {
    const etiqueta = document.createElement('span');
    etiqueta.className = clase;
    etiqueta.textContent = texto;

    return etiqueta;
  }

  function crearFila(registro) {

    const fila = document.createElement('tr');

    // Código de la operación.
    fila.appendChild(
      crearCelda(
        registro.codigo,
        'historial-fraccionamientos__codigo'
      )
    );

    // Producto con icono.
    const celdaProducto = document.createElement('td');
    const producto = document.createElement('div');

    producto.className = 'historial-fraccionamientos__producto';

    const icono = document.createElement('span');
    icono.className = 'historial-fraccionamientos__producto-icono';

    const iconoLucide = document.createElement('i');
    iconoLucide.setAttribute('data-lucide', 'scale');

    icono.appendChild(iconoLucide);

    const nombre = document.createElement('strong');
    nombre.textContent = registro.producto;

    producto.append(icono, nombre);
    celdaProducto.appendChild(producto);
    fila.appendChild(celdaProducto);

    // Cantidad de producto utilizada.
    fila.appendChild(
      crearCelda(`${numero(registro.cantidad)} kg`)
    );

    // Presentación en etiqueta azul.
    const celdaPresentacion = document.createElement('td');

    celdaPresentacion.appendChild(
      crearEtiqueta(
        registro.presentacion,
        'historial-fraccionamientos__presentacion'
      )
    );

    fila.appendChild(celdaPresentacion);

    // Cantidad de bolsas generadas.
    fila.appendChild(
      crearCelda(
        `${numero(registro.bolsas)} bolsas`,
        'historial-fraccionamientos__bolsas'
      )
    );

    // Peso total empacado.
    fila.appendChild(
      crearCelda(`${numero(registro.peso)} kg`)
    );

    // Merma en verde o amarillo.
    const celdaMerma = document.createElement('td');

    const claseMerma = registro.merma > 0
      ? 'historial-fraccionamientos__merma historial-fraccionamientos__merma--alerta'
      : 'historial-fraccionamientos__merma historial-fraccionamientos__merma--correcto';

    celdaMerma.appendChild(
      crearEtiqueta(
        `${numero(registro.merma)} kg`,
        claseMerma
      )
    );

    fila.appendChild(celdaMerma);

    // Fecha y responsable.
    fila.appendChild(crearCelda(mostrarFecha(registro)));
    fila.appendChild(crearCelda(registro.responsable));

    return fila;
  }

  // ==========================================
  // MOSTRAR TABLA Y PAGINACIÓN
  // ==========================================

  function mostrarTabla() {

    tabla.innerHTML = '';

    const total = registrosFiltrados.length;
    const totalPaginas = Math.ceil(total / POR_PAGINA);

    if (paginaActual > totalPaginas && totalPaginas > 0) {
      paginaActual = totalPaginas;
    }

    const inicio = (paginaActual - 1) * POR_PAGINA;
    const fin = inicio + POR_PAGINA;

    const pagina = registrosFiltrados.slice(inicio, fin);

    pagina.forEach(registro => {
      tabla.appendChild(crearFila(registro));
    });

    contador.textContent =
      `${total} ${total === 1 ? 'resultado' : 'resultados'}`;

    sinResultados.hidden = total !== 0;

    const desde = total === 0 ? 0 : inicio + 1;
    const hasta = Math.min(fin, total);

    textoPaginacion.textContent =
      `Mostrando ${desde}–${hasta} de ${total} registros`;

    crearPaginacion(totalPaginas);

    // Convierte los iconos de las filas a SVG.
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function crearPaginacion(totalPaginas) {

    paginacion.innerHTML = '';

    if (totalPaginas <= 1) return;

    // Botón de página anterior.
    agregarBoton(
      '‹',
      paginaActual - 1,
      paginaActual === 1,
      false,
      'Página anterior'
    );

    // Botones numerados.
    for (let numeroPagina = 1;
         numeroPagina <= totalPaginas;
         numeroPagina++) {

      agregarBoton(
        String(numeroPagina),
        numeroPagina,
        false,
        numeroPagina === paginaActual,
        `Ir a la página ${numeroPagina}`
      );
    }

    // Botón de página siguiente.
    agregarBoton(
      '›',
      paginaActual + 1,
      paginaActual === totalPaginas,
      false,
      'Página siguiente'
    );
  }

  function agregarBoton(texto, pagina, deshabilitado, activo, etiqueta) {

    const boton = document.createElement('button');

    boton.type = 'button';
    boton.textContent = texto;
    boton.disabled = deshabilitado;
    boton.setAttribute('aria-label', etiqueta);

    if (activo) {
      boton.classList.add('activo');
      boton.setAttribute('aria-current', 'page');
    }

    boton.addEventListener('click', () => {
      paginaActual = pagina;
      mostrarTabla();
    });

    paginacion.appendChild(boton);
  }

  // ==========================================
  // EXPORTAR A CSV
  // ==========================================

  function exportarCSV() {

    if (registrosFiltrados.length === 0) {
      alert('No hay registros para exportar.');
      return;
    }

    const encabezados = [
      'Operación',
      'Producto',
      'Cantidad usada (kg)',
      'Presentación',
      'Bolsas',
      'Peso empacado (kg)',
      'Merma (kg)',
      'Fecha',
      'Responsable'
    ];

    const filas = registrosFiltrados.map(registro => [
      registro.codigo,
      registro.producto,
      registro.cantidad,
      registro.presentacion,
      registro.bolsas,
      registro.peso,
      registro.merma,
      registro.fecha,
      registro.responsable
    ]);

    // Protege los valores para que se lean correctamente en CSV.
    function escaparCSV(valor) {
      let texto = String(valor ?? '');

      // Evita interpretar los datos como fórmulas.
      if (/^[\s]*[=+\-@]/.test(texto)) {
        texto = "'" + texto;
      }

      return `"${texto.replace(/"/g, '""')}"`;
    }

    const contenido = [
      encabezados,
      ...filas
    ].map(fila => fila.map(escaparCSV).join(';')).join('\r\n');

    const archivo = new Blob(
      ['\uFEFF' + contenido],
      { type: 'text/csv;charset=utf-8;' }
    );

    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement('a');

    enlace.href = url;
    enlace.download = 'historial-fraccionamientos.csv';

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    URL.revokeObjectURL(url);
  }

  // ==========================================
  // EVENTOS
  // ==========================================

  buscador.addEventListener('input', filtrar);
  filtroProducto.addEventListener('change', filtrar);
  filtroPeriodo.addEventListener('change', filtrar);
  filtroResponsable.addEventListener('change', filtrar);

  botonExportar.addEventListener('click', exportarCSV);

  // ==========================================
  // INICIAR PÁGINA
  // ==========================================

  llenarOpciones();
  actualizarIndicadores();
  filtrar();

});
