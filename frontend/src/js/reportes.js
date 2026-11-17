/*
 * REPORTES - SALSAMENTARIA PRIMAVERA
 * Integración con Node.js, Express y MySQL.
 * Consulta de ventas, indicadores y productos.
 */

document.addEventListener('DOMContentLoaded', () => {

  const API = 'http://localhost:4000/api/reportes';

  const graficaElemento =
    document.getElementById('graficaVentasReporte');

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

  const listaProductos =
    document.getElementById('listaProductosReporte');

  const sinProductos =
    document.getElementById('sinProductosReporte');

  const descripcionGrafica =
    document.getElementById('descripcionGrafica');

  const variacionIngresos =
    document.getElementById('variacionIngresos');

  const variacionUnidades =
    document.getElementById('variacionUnidades');

  const variacionTicket =
    document.getElementById('variacionTicket');

  let grafica = null;
  let reporteActual = null;
  let consultando = false;

  // ==========================================
  // FORMATO DE VALORES
  // ==========================================

  function dinero(valor) {
    return '$' + Number(valor || 0).toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  function numero(valor) {
    return Number(valor || 0).toLocaleString('es-CO');
  }

  function fechaLocal(fecha) {
    return [
      fecha.getFullYear(),
      String(fecha.getMonth() + 1).padStart(2, '0'),
      String(fecha.getDate()).padStart(2, '0')
    ].join('-');
  }

  function sumarDias(fecha, dias) {
    const copia = new Date(fecha);
    copia.setDate(copia.getDate() + dias);
    return copia;
  }

  function fechaDesdeTexto(valor) {
    const [anio, mes, dia] = String(valor)
      .split('-')
      .map(Number);

    return new Date(anio, mes - 1, dia);
  }

  function mostrarMensaje(texto) {
    if (!mensaje) return;

    mensaje.textContent = texto;
    mensaje.hidden = false;
  }

  function ocultarMensaje() {
    if (!mensaje) return;

    mensaje.textContent = '';
    mensaje.hidden = true;
  }

  // ==========================================
  // SELECCIÓN DE PERÍODOS
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

    // Este mes.
    desde.value = fechaLocal(
      new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    );

    hasta.value = fechaLocal(
      new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
    );
  }

  // ==========================================
  // CONSULTAR API DE REPORTES
  // ==========================================

  async function obtenerReporte(inicio, fin) {
    const parametros = new URLSearchParams({
      desde: inicio,
      hasta: fin
    });

    let respuesta;

    try {
      respuesta = await fetch(
        `${API}?${parametros.toString()}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json'
          }
        }
      );
    } catch {
      throw new Error(
        'No se pudo conectar con el backend. ' +
        'Verifica que esté funcionando en el puerto 4000.'
      );
    }

    let resultado;

    try {
      resultado = await respuesta.json();
    } catch {
      throw new Error(
        'El servidor devolvió una respuesta no válida.'
      );
    }

    if (!respuesta.ok) {
      throw new Error(
        resultado.mensaje ||
        'No fue posible consultar el reporte.'
      );
    }

    if (
      !resultado.indicadores ||
      !Array.isArray(resultado.ventasSemanales) ||
      !Array.isArray(resultado.productosMasVendidos)
    ) {
      throw new Error(
        'La API devolvió datos incompletos.'
      );
    }

    return {
      desde: resultado.periodo?.desde || inicio,
      hasta: resultado.periodo?.hasta || fin,

      indicadores: {
        totalVentas:
          Number(resultado.indicadores.totalVentas || 0),

        ventasTotales:
          Number(resultado.indicadores.ventasTotales || 0),

        unidadesVendidas:
          Number(resultado.indicadores.unidadesVendidas || 0),

        ticketPromedio:
          Number(resultado.indicadores.ticketPromedio || 0),

        ventasContado:
          Number(resultado.indicadores.ventasContado || 0),

        ventasCredito:
          Number(resultado.indicadores.ventasCredito || 0)
      },

      semanas: resultado.ventasSemanales.map(item => ({
        fecha: item.semana,
        cantidadVentas: Number(item.cantidadVentas || 0),
        ingresos: Number(item.total || 0)
      })),

      productos: resultado.productosMasVendidos.map(item => ({
        id: item.id,
        nombre: item.nombre,
        unidades: Number(item.unidades || 0),
        ingresos: Number(item.ingresos || 0)
      }))
    };
  }

  // ==========================================
  // ACTUALIZAR INDICADORES
  // ==========================================

  function actualizarIndicadores(reporte) {
    const datos = reporte.indicadores;

    ingresosTexto.textContent =
      dinero(datos.ventasTotales);

    unidadesTexto.textContent =
      numero(datos.unidadesVendidas);

    ticketTexto.textContent =
      dinero(datos.ticketPromedio);

    if (variacionIngresos) {
      variacionIngresos.textContent =
        `${numero(datos.totalVentas)} ventas registradas`;
    }

    if (variacionUnidades) {
      variacionUnidades.textContent =
        'Unidades vendidas en el período';
    }

    if (variacionTicket) {
      variacionTicket.textContent =
        'Promedio por venta registrada';
    }
  }

  // ==========================================
  // GRÁFICA DE VENTAS POR SEMANA
  // ==========================================

  function actualizarGrafica(reporte) {
    if (grafica) {
      grafica.destroy();
      grafica = null;
    }

    if (typeof Chart === 'undefined') {
      mostrarMensaje(
        'No se pudo cargar Chart.js. ' +
        'Verifica tu conexión a Internet.'
      );
      return;
    }

    const semanas = reporte.semanas;

    const etiquetas = semanas.map(item => {
      const fecha = fechaDesdeTexto(item.fecha);

      return fecha.toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    });

    const valores = semanas.map(item => item.ingresos);

    const contexto = graficaElemento.getContext('2d');

    grafica = new Chart(contexto, {
      type: 'bar',

      data: {
        labels: etiquetas,

        datasets: [{
          label: 'Ventas totales',
          data: valores,
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
              title: elementos => {
                if (!elementos.length) return '';

                return 'Semana del ' +
                  elementos[0].label;
              },

              label: contexto =>
                'Ventas: ' + dinero(contexto.parsed.y)
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
                const cantidad = Number(valor);

                if (cantidad === 0) return '$0';

                if (Math.abs(cantidad) >= 1000000) {
                  return '$' +
                    (cantidad / 1000000).toLocaleString(
                      'es-CO',
                      { maximumFractionDigits: 1 }
                    ) + 'M';
                }

                if (Math.abs(cantidad) >= 1000) {
                  return '$' +
                    (cantidad / 1000).toLocaleString(
                      'es-CO',
                      { maximumFractionDigits: 1 }
                    ) + ' mil';
                }

                return dinero(cantidad);
              }
            }
          }
        }
      }
    });

    if (descripcionGrafica) {
      descripcionGrafica.textContent =
        `Período: ${reporte.desde} al ${reporte.hasta}`;
    }
  }

  // ==========================================
  // PRODUCTOS MÁS VENDIDOS
  // ==========================================

  function actualizarProductos(reporte) {
    listaProductos.replaceChildren();

    const productos = reporte.productos
      .slice()
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 4);

    sinProductos.hidden = productos.length > 0;

    productos.forEach((producto, indice) => {
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
  // LIMPIAR INDICADORES ANTE ERRORES
  // ==========================================

  function limpiarReporte() {
    ingresosTexto.textContent = '$0';
    unidadesTexto.textContent = '0';
    ticketTexto.textContent = '$0';

    if (variacionIngresos) {
      variacionIngresos.textContent = 'Sin datos';
    }

    if (variacionUnidades) {
      variacionUnidades.textContent = 'Sin datos';
    }

    if (variacionTicket) {
      variacionTicket.textContent = 'Sin datos';
    }

    listaProductos.replaceChildren();
    sinProductos.hidden = false;

    if (grafica) {
      grafica.destroy();
      grafica = null;
    }

    if (descripcionGrafica) {
      descripcionGrafica.textContent =
        'No hay información disponible';
    }
  }

  // ==========================================
  // GENERAR REPORTE
  // ==========================================

  async function generarReporte() {
    if (consultando) return;

    ocultarMensaje();

    if (!desde.value || !hasta.value) {
      mostrarMensaje(
        'Selecciona las fechas del reporte.'
      );
      return;
    }

    if (desde.value > hasta.value) {
      mostrarMensaje(
        'La fecha inicial no puede ser posterior a la final.'
      );
      return;
    }

    consultando = true;
    reporteActual = null;

    generar.disabled = true;
    descargar.disabled = true;
    generar.textContent = 'Generando...';

    try {
      const reporte = await obtenerReporte(
        desde.value,
        hasta.value
      );

      reporteActual = reporte;

      actualizarIndicadores(reporte);
      actualizarGrafica(reporte);
      actualizarProductos(reporte);

      if (reporte.indicadores.totalVentas === 0) {
        mostrarMensaje(
          'No se encontraron ventas registradas ' +
          'en el período seleccionado.'
        );
      }

    } catch (error) {
      console.error(
        'Error al generar el reporte:',
        error
      );

      reporteActual = null;
      limpiarReporte();

      mostrarMensaje(
        error.message ||
        'No fue posible generar el reporte.'
      );

    } finally {
      consultando = false;
      generar.disabled = false;
      descargar.disabled = !reporteActual;
      generar.textContent = 'Generar reporte';
    }
  }

  // ==========================================
  // DESCARGAR REPORTE CSV
  // ==========================================

  function descargarReporte() {
    if (!reporteActual) {
      mostrarMensaje(
        'Primero genera un reporte.'
      );
      return;
    }

    const reporte = reporteActual;
    const indicadores = reporte.indicadores;

    // Proteger textos ante fórmulas de hojas de cálculo.
    function celda(valor) {
      let texto = String(valor ?? '');

      if (/^\s*[=+\-@\t\r]/.test(texto)) {
        texto = "'" + texto;
      }

      return '"' +
        texto.replace(/"/g, '""') +
        '"';
    }

    const filas = [
      ['Reporte de ventas - Salsamentaria Primavera'],
      ['Desde', reporte.desde],
      ['Hasta', reporte.hasta],
      [],
      ['Indicador', 'Valor'],
      ['Ventas totales', indicadores.ventasTotales],
      ['Ventas registradas', indicadores.totalVentas],
      ['Unidades vendidas', indicadores.unidadesVendidas],
      ['Ticket promedio', indicadores.ticketPromedio],
      ['Ventas de contado', indicadores.ventasContado],
      ['Ventas a crédito', indicadores.ventasCredito],
      [],
      ['Semana de inicio', 'Cantidad de ventas', 'Valor total']
    ];

    reporte.semanas.forEach(semana => {
      filas.push([
        semana.fecha,
        semana.cantidadVentas,
        semana.ingresos
      ]);
    });

    filas.push([]);
    filas.push([
      'Producto',
      'Unidades vendidas',
      'Ventas generadas'
    ]);

    reporte.productos.forEach(producto => {
      filas.push([
        producto.nombre,
        producto.unidades,
        producto.ingresos
      ]);
    });

    // Separador compatible con Excel en español.
    const contenido = '\uFEFF' +
      filas
        .map(fila => fila.map(celda).join(';'))
        .join('\r\n');

    const archivo = new Blob([contenido], {
      type: 'text/csv;charset=utf-8;'
    });

    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement('a');

    enlace.href = url;
    enlace.download =
      `reporte_ventas_${reporte.desde}_${reporte.hasta}.csv`;

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  // ==========================================
  // EVENTOS
  // ==========================================

  periodo.addEventListener('change', () => {
    actualizarFechas();
    reporteActual = null;
    descargar.disabled = true;
  });

  desde.addEventListener('change', () => {
    reporteActual = null;
    descargar.disabled = true;
  });

  hasta.addEventListener('change', () => {
    reporteActual = null;
    descargar.disabled = true;
  });

  generar.addEventListener('click', generarReporte);

  descargar.addEventListener('click', descargarReporte);

  // ==========================================
  // INICIALIZACIÓN
  // ==========================================

  // Mostrar el mes actual, no datos ficticios.
  periodo.value = 'mes';

  actualizarFechas();

  descargar.disabled = true;

  generarReporte();

  if (window.lucide) {
    window.lucide.createIcons();
  }

});
