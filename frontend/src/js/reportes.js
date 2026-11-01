
document.addEventListener('DOMContentLoaded', () => {
  const graficaElemento = document.getElementById('graficaVentasReporte');
  if (!graficaElemento) return;

  const periodo = document.getElementById('periodoReporte');
  const desde = document.getElementById('fechaDesdeReporte');
  const hasta = document.getElementById('fechaHastaReporte');

  const generar = document.getElementById('generarReporte');
  const descargar = document.getElementById('descargarReporte');
  const mensaje = document.getElementById('mensajeReportes');

  const ingresosTexto = document.getElementById('ingresosReporte');
  const unidadesTexto = document.getElementById('unidadesReporte');
  const ticketTexto = document.getElementById('ticketReporte');
  const listaProductos = document.getElementById('listaProductosReporte');
  const sinProductos = document.getElementById('sinProductosReporte');

  let grafica = null;
  let reporteActual = null;

  /*
   * DATOS DE DEMOSTRACIÓN
   *
   * Los valores corresponden a marzo de 2025
   * y reproducen los indicadores del mockup.
   *
   * Posteriormente se reemplazarán por consultas
   * a las ventas y detalles de venta de MySQL.
   */
  const DEMO = {
    desde: '2025-03-01',
    hasta: '2025-03-31',

    ingresos: 28450800,
    unidades: 2846,
    ticket: 54320,

    variaciones: {
      ingresos: '+8,4% período anterior',
      unidades: '+6,2% período anterior',
      ticket: '+1,8% período anterior'
    },

    semanas: [
      { nombre: 'Semana 1', ingresos: 5700000 },
      { nombre: 'Semana 2', ingresos: 6900000 },
      { nombre: 'Semana 3', ingresos: 6300000 },
      { nombre: 'Semana 4', ingresos: 9550800 }
    ],

    productos: [
      {
        nombre: 'Jamón de cerdo premium',
        unidades: 248,
        ingresos: 5840000
      },
      {
        nombre: 'Queso campesino',
        unidades: 196,
        ingresos: 4210000
      },
      {
        nombre: 'Salchicha ranchera',
        unidades: 174,
        ingresos: 3780000
      },
      {
        nombre: 'Chorizo santarrosano',
        unidades: 143,
        ingresos: 2950000
      }
    ]
  };

  // Formato colombiano de moneda.
  function dinero(numero) {
    return '$' + Math.round(Number(numero) || 0)
      .toLocaleString('es-CO');
  }

  function numero(numero) {
    return Number(numero || 0).toLocaleString('es-CO');
  }

  function fechaLocal(fecha) {
    return [
      fecha.getFullYear(),
      String(fecha.getMonth() + 1).padStart(2, '0'),
      String(fecha.getDate()).padStart(2, '0')
    ].join('-');
  }

  function fechaDesdeTexto(valor) {
    const partes = String(valor).split('-').map(Number);
    return new Date(partes[0], partes[1] - 1, partes[2]);
  }

  function sumarDias(fecha, dias) {
    const copia = new Date(fecha);
    copia.setDate(copia.getDate() + dias);
    return copia;
  }

  function mostrarMensaje(texto) {
    mensaje.textContent = texto;
    mensaje.hidden = false;
  }

  function ocultarMensaje() {
    mensaje.textContent = '';
    mensaje.hidden = true;
  }

  // ==========================================
  // PERÍODOS
  // ==========================================

  function actualizarFechas() {
    const valor = periodo.value;
    const hoy = new Date();

    if (valor === 'personalizado') {
      desde.disabled = false;
      hasta.disabled = false;
      return;
    }

    desde.disabled = true;
    hasta.disabled = true;

    if (valor === 'semana') {
      desde.value = fechaLocal(sumarDias(hoy, -6));
      hasta.value = fechaLocal(hoy);
      return;
    }

    if (valor === 'anterior') {
      const primeroAnterior = new Date(
        hoy.getFullYear(),
        hoy.getMonth() - 1,
        1
      );

      const ultimoAnterior = new Date(
        hoy.getFullYear(),
        hoy.getMonth(),
        0
      );

      desde.value = fechaLocal(primeroAnterior);
      hasta.value = fechaLocal(ultimoAnterior);
      return;
    }

    desde.value = fechaLocal(
      new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    );

    hasta.value = fechaLocal(
      new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
    );
  }

  // ==========================================
  // CONSULTAR DATOS DEL PROTOTIPO
  // ==========================================

  function obtenerReporte(inicio, fin) {
    // Solo hay datos de demostración para marzo de 2025.
    // La selección completa de ese mes muestra el mockup.
    if (inicio === DEMO.desde && fin === DEMO.hasta) {
      return {
        ...DEMO,
        esDemo: true
      };
    }

    // Sin conexión a la base de datos, no inventar
    // resultados para otros períodos.
    return {
      desde: inicio,
      hasta: fin,
      ingresos: 0,
      unidades: 0,
      ticket: 0,
      variaciones: {
        ingresos: 'Sin datos comparativos',
        unidades: 'Sin datos comparativos',
        ticket: 'Sin datos comparativos'
      },
      semanas: [
        { nombre: 'Semana 1', ingresos: 0 },
        { nombre: 'Semana 2', ingresos: 0 },
        { nombre: 'Semana 3', ingresos: 0 },
        { nombre: 'Semana 4', ingresos: 0 }
      ],
      productos: [],
      esDemo: false
    };
  }

  // ==========================================
  // ACTUALIZAR INDICADORES
  // ==========================================

  function actualizarIndicadores(reporte) {
    ingresosTexto.textContent = dinero(reporte.ingresos);
    unidadesTexto.textContent = numero(reporte.unidades);
    ticketTexto.textContent = dinero(reporte.ticket);

    document.getElementById('variacionIngresos').textContent =
      reporte.variaciones.ingresos;

    document.getElementById('variacionUnidades').textContent =
      reporte.variaciones.unidades;

    document.getElementById('variacionTicket').textContent =
      reporte.variaciones.ticket;
  }

  // ==========================================
  // GRÁFICA DE VENTAS
  // ==========================================

  function actualizarGrafica(reporte) {
    if (grafica) {
      grafica.destroy();
      grafica = null;
    }

    if (typeof Chart === 'undefined') {
      mostrarMensaje(
        'No se pudo cargar la librería de gráficos. Revisa la conexión.'
      );
      return;
    }

    const contexto = graficaElemento.getContext('2d');

    grafica = new Chart(contexto, {
      type: 'bar',

      data: {
        labels: reporte.semanas.map(s => s.nombre),

        datasets: [{
          label: 'Ingresos',
          data: reporte.semanas.map(s => s.ingresos),
          backgroundColor: '#287b56',
          hoverBackgroundColor: '#155b3d',
          borderRadius: 4,
          borderSkipped: false,
          maxBarThickness: 110
        }]
      },

      options: {
        responsive: true,
        maintainAspectRatio: false,

        plugins: {
          legend: {
            display: false
          },

          tooltip: {
            callbacks: {
              label: contexto =>
                'Ingresos: ' + dinero(contexto.parsed.y)
            }
          }
        },

        scales: {
          x: {
            grid: {
              display: false
            },

            border: {
              display: false
            },

            ticks: {
              color: '#7a8880',
              font: {
                size: 10
              }
            }
          },

          y: {
            beginAtZero: true,

            grid: {
              color: '#e6ebe7'
            },

            border: {
              display: false,
              dash: [4, 4]
            },

            ticks: {
              color: '#7a8880',
              font: {
                size: 10
              },

              callback: valor => {
                if (valor === 0) return '$0';
                return '$' + (valor / 1000000)
                  .toLocaleString('es-CO', {
                    maximumFractionDigits: 1
                  }) + 'M';
              }
            }
          }
        }
      }
    });

    const descripcion = document.getElementById('descripcionGrafica');

    descripcion.textContent = reporte.esDemo
      ? 'Comportamiento durante marzo'
      : `Período: ${reporte.desde} al ${reporte.hasta}`;
  }

  // ==========================================
  // PRODUCTOS MÁS VENDIDOS
  // ==========================================

  function actualizarProductos(reporte) {
    listaProductos.replaceChildren();

    sinProductos.hidden = reporte.productos.length !== 0;

    reporte.productos
      .slice()
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 4)
      .forEach((producto, indice) => {

        const fila = document.createElement('div');
        fila.className = 'reportes__producto';

        const posicion = document.createElement('span');
        posicion.className = 'reportes__posicion';
        posicion.textContent = indice + 1;

        const informacion = document.createElement('div');
        informacion.className = 'reportes__producto-info';

        const nombre = document.createElement('strong');
        nombre.textContent = producto.nombre;

        const unidades = document.createElement('small');
        unidades.textContent =
          `${numero(producto.unidades)} unidades`;

        informacion.append(nombre, unidades);

        const total = document.createElement('strong');
        total.className = 'reportes__producto-total';
        total.textContent = dinero(producto.ingresos);

        fila.append(posicion, informacion, total);
        listaProductos.appendChild(fila);
      });
  }

  // ==========================================
  // GENERAR REPORTE
  // ==========================================

  function generarReporte() {
    ocultarMensaje();

    if (!desde.value || !hasta.value) {
      mostrarMensaje('Selecciona las fechas del reporte.');
      return;
    }

    if (desde.value > hasta.value) {
      mostrarMensaje(
        'La fecha inicial no puede ser posterior a la fecha final.'
      );
      return;
    }

    reporteActual = obtenerReporte(desde.value, hasta.value);

    actualizarIndicadores(reporteActual);
    actualizarGrafica(reporteActual);
    actualizarProductos(reporteActual);

    if (!reporteActual.esDemo) {
      mostrarMensaje(
        'No hay datos de demostración para este período. ' +
        'Los reportes reales estarán disponibles al integrar las ventas.'
      );
    }
  }

  // ==========================================
  // DESCARGAR REPORTE CSV
  // ==========================================

  function descargarReporte() {
    if (!reporteActual) {
      mostrarMensaje('Primero genera un reporte.');
      return;
    }

    // Proteger los valores al exportar a una hoja de cálculo.
    function celda(valor) {
      let texto = String(valor ?? '');

      // Evitar que Excel interprete textos como fórmulas.
      if (/^[\s]*[=+\-@]/.test(texto)) {
        texto = "'" + texto;
      }

      return '"' + texto.replace(/"/g, '""') + '"';
    }

    const filas = [
      ['Reporte de ventas - Salsamentaria Primavera'],
      ['Desde', reporteActual.desde],
      ['Hasta', reporteActual.hasta],
      [],
      ['Indicador', 'Valor'],
      ['Ingresos totales', reporteActual.ingresos],
      ['Unidades vendidas', reporteActual.unidades],
      ['Ticket promedio', reporteActual.ticket],
      [],
      ['Semana', 'Ingresos']
    ];

    reporteActual.semanas.forEach(semana => {
      filas.push([semana.nombre, semana.ingresos]);
    });

    filas.push([]);
    filas.push(['Producto', 'Unidades vendidas', 'Ingresos']);

    reporteActual.productos.forEach(producto => {
      filas.push([
        producto.nombre,
        producto.unidades,
        producto.ingresos
      ]);
    });

    // El punto y coma facilita la apertura en Excel
    // con configuración regional colombiana.
    const contenido = '\uFEFF' + filas
      .map(fila => fila.map(celda).join(';'))
      .join('\r\n');

    const archivo = new Blob([contenido], {
      type: 'text/csv;charset=utf-8;'
    });

    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement('a');

    enlace.href = url;
    enlace.download =
      `reporte_ventas_${reporteActual.desde}_${reporteActual.hasta}.csv`;

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    URL.revokeObjectURL(url);
  }

  // ==========================================
  // EVENTOS E INICIALIZACIÓN
  // ==========================================

  periodo.addEventListener('change', actualizarFechas);
  generar.addEventListener('click', generarReporte);
  descargar.addEventListener('click', descargarReporte);

  // Se muestra inicialmente marzo de 2025
  // para conservar el diseño del mockup.
  periodo.value = 'personalizado';
  desde.value = DEMO.desde;
  hasta.value = DEMO.hasta;

  actualizarFechas();
  generarReporte();

  if (window.lucide) {
    window.lucide.createIcons();
  }
});
