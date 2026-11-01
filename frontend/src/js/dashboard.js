
document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // MENÚ RESPONSIVE
  // ==========================================

  const botonMenu = document.getElementById('btnMenu');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('dashboardOverlay');

  function cambiarMenu(abierto) {
    if (!sidebar || !overlay) return;

    sidebar.classList.toggle('sidebar--abierto', abierto);
    overlay.classList.toggle(
      'dashboard-overlay--visible',
      abierto
    );

    botonMenu?.setAttribute(
      'aria-expanded',
      String(abierto)
    );
  }

  botonMenu?.addEventListener('click', () => {
    const abierto = sidebar?.classList.contains(
      'sidebar--abierto'
    );

    cambiarMenu(!abierto);
  });

  overlay?.addEventListener('click', () => {
    cambiarMenu(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      cambiarMenu(false);
    }
  });

  // Cerrar el menú al seleccionar una opción
  sidebar?.querySelectorAll('a').forEach((enlace) => {
    enlace.addEventListener('click', () => {
      cambiarMenu(false);
    });
  });

  // ==========================================
  // GRÁFICO DE VENTAS
  // Datos temporales para el frontend
  // ==========================================

  const grafico = document.getElementById('graficoVentas');
  const selectorPeriodo = document.getElementById('periodoVentas');

  const datosVentas = {
    actual: [
      { dia: 'Lun', valor: 150000 },
      { dia: 'Mar', valor: 210000 },
      { dia: 'Mié', valor: 180000 },
      { dia: 'Jue', valor: 270000 },
      { dia: 'Vie', valor: 230000 },
      { dia: 'Sáb', valor: 295000 },
      { dia: 'Dom', valor: 190000 }
    ],
    anterior: [
      { dia: 'Lun', valor: 120000 },
      { dia: 'Mar', valor: 175000 },
      { dia: 'Mié', valor: 155000 },
      { dia: 'Jue', valor: 225000 },
      { dia: 'Vie', valor: 200000 },
      { dia: 'Sáb', valor: 250000 },
      { dia: 'Dom', valor: 165000 }
    ]
  };

  const formatoMoneda = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  });

  function dibujarGrafico(periodo = 'actual') {
    if (!grafico) return;

    const ventas = datosVentas[periodo] || datosVentas.actual;
    const valorMaximo = 300000;

    grafico.replaceChildren();
    grafico.classList.add('grafico-ventas');

    const escala = document.createElement('div');
    escala.className = 'grafico-ventas__escala';

    [300000, 200000, 100000, 0].forEach((valor) => {
      const etiqueta = document.createElement('span');
      etiqueta.textContent =
        valor === 0 ? '$0' : `$${valor / 1000}k`;

      escala.appendChild(etiqueta);
    });

    const columnas = document.createElement('div');
    columnas.className = 'grafico-ventas__columnas';

    ventas.forEach(({ dia, valor }) => {
      const columna = document.createElement('div');
      columna.className = 'grafico-ventas__columna';

      const zonaBarra = document.createElement('div');
      zonaBarra.className = 'grafico-ventas__zona-barra';

      const barra = document.createElement('div');
      barra.className = 'grafico-ventas__barra';

      const porcentaje = Math.min(
        (valor / valorMaximo) * 100,
        100
      );

      barra.style.height = `${porcentaje}%`;
      barra.title = `${dia}: ${formatoMoneda.format(valor)}`;

      const etiqueta = document.createElement('span');
      etiqueta.className = 'grafico-ventas__dia';
      etiqueta.textContent = dia;

      zonaBarra.appendChild(barra);
      columna.append(zonaBarra, etiqueta);
      columnas.appendChild(columna);
    });

    grafico.append(escala, columnas);
  }

  dibujarGrafico(selectorPeriodo?.value || 'actual');

  selectorPeriodo?.addEventListener('change', (event) => {
    dibujarGrafico(event.target.value);
  });

  // ==========================================
  // ICONOS LUCIDE
  // ==========================================

  if (window.lucide) {
    window.lucide.createIcons();
  }
});
