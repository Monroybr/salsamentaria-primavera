document.addEventListener('DOMContentLoaded', () => {
  const formulario = document.getElementById('formNuevoCliente');
  if (!formulario) return;

  // =====================================
  // CONFIGURACIÓN DE LA API
  // =====================================

  const API_CLIENTES = 'http://localhost:4000/api/clientes';

  // =====================================
  // ELEMENTOS DEL FORMULARIO
  // =====================================

  const nombre = document.getElementById('nombreCliente');
  const contacto = document.getElementById('contactoCliente');
  const documento = document.getElementById('documentoCliente');
  const telefono = document.getElementById('telefonoCliente');
  const correo = document.getElementById('correoCliente');

  const direccion = document.getElementById('direccionCliente');
  const ciudad = document.getElementById('ciudadCliente');
  const barrio = document.getElementById('barrioCliente');
  const notas = document.getElementById('notasCliente');

  const credito = document.getElementById('habilitarCredito');
  const camposCredito = document.getElementById('camposCredito');
  const cupo = document.getElementById('cupoCredito');
  const plazo = document.getElementById('plazoCredito');

  const nombreResumen = document.getElementById('nombreResumenCliente');
  const resumenCredito = document.getElementById('resumenCredito');
  const mensaje = document.getElementById('mensajeCliente');
  const botonGuardar = document.getElementById('guardarCliente');
  const textoGuardar = document.getElementById('textoGuardarCliente');

  const tituloFormulario = document.getElementById(
    'tituloFormularioCliente'
  );

  // =====================================
  // VARIABLES DE EDICIÓN
  // =====================================

  const parametros = new URLSearchParams(window.location.search);
  const idEditar = parametros.get('id');

  let clienteOriginal = null;
  let guardando = false;

  // =====================================
  // FUNCIONES AUXILIARES
  // =====================================

  function tipoSeleccionado() {
    return document.querySelector(
      'input[name="tipoCliente"]:checked'
    )?.value || 'natural';
  }

  function mostrarMensaje(texto, esError = true) {
    mensaje.textContent = texto;
    mensaje.hidden = false;
    mensaje.style.color = esError ? '#b42318' : '#157347';
  }

  function ocultarMensaje() {
    mensaje.hidden = true;
    mensaje.textContent = '';
  }

  function establecerCarga(cargando) {
    guardando = cargando;
    botonGuardar.disabled = cargando;

    textoGuardar.textContent = cargando
      ? 'Guardando...'
      : idEditar
        ? 'Guardar cambios'
        : 'Guardar cliente';
  }

  function valorTexto(elemento) {
    return elemento.value.trim();
  }

  function valorOpcional(elemento) {
    const valor = valorTexto(elemento);
    return valor === '' ? null : valor;
  }

  function numeroValido(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : 0;
  }

  // =====================================
  // PETICIONES A LA API
  // =====================================

  async function solicitarAPI(url, opciones = {}) {
    let respuesta;

    try {
      respuesta = await fetch(url, {
        ...opciones,
        headers: {
          'Content-Type': 'application/json',
          ...(opciones.headers || {})
        }
      });
    } catch (error) {
      console.error('Error de conexión:', error);

      throw new Error(
        'No fue posible conectar con el servidor. ' +
        'Verifica que el backend esté funcionando en el puerto 4000.'
      );
    }

    const texto = await respuesta.text();
    let datos = null;

    if (texto) {
      try {
        datos = JSON.parse(texto);
      } catch {
        if (!respuesta.ok) {
          throw new Error(
            'El servidor respondió con un error HTTP ' +
            respuesta.status
          );
        }

        throw new Error(
          'El servidor no devolvió una respuesta JSON válida.'
        );
      }
    }

    if (!respuesta.ok) {
      const mensajeServidor =
        datos?.mensaje ||
        datos?.message ||
        datos?.error;

      throw new Error(
        typeof mensajeServidor === 'string'
          ? mensajeServidor
          : 'La solicitud falló. Código HTTP: ' + respuesta.status
      );
    }

    if (datos?.success === false) {
      throw new Error(
        datos.mensaje ||
        datos.message ||
        'La operación no pudo completarse.'
      );
    }

    return datos;
  }

  // =====================================
  // CAMBIAR TIPO DE CLIENTE
  // =====================================

  function actualizarTipo() {
    const natural = tipoSeleccionado() === 'natural';

    document.getElementById(
      'etiquetaNombreCliente'
    ).textContent = natural
      ? 'Nombre completo'
      : 'Nombre del negocio';

    document.getElementById(
      'etiquetaDocumentoCliente'
    ).textContent = natural
      ? 'Cédula'
      : 'NIT';

    nombre.placeholder = natural
      ? 'Ej. María Rodríguez'
      : 'Ej. Tienda La Primavera';

    documento.placeholder = natural
      ? 'Número de identificación'
      : '900000000-1';

    document.querySelectorAll(
      '.nuevo-cliente__tipo'
    ).forEach(opcion => {
      opcion.classList.toggle(
        'activo',
        opcion.querySelector('input').checked
      );
    });

    actualizarResumen();
  }

  // =====================================
  // ACTIVAR O DESACTIVAR CRÉDITO
  // =====================================

  function actualizarCredito() {
    camposCredito.hidden = !credito.checked;

    cupo.disabled = !credito.checked;
    plazo.disabled = !credito.checked;

    actualizarResumen();
  }

  // =====================================
  // RESUMEN DEL CLIENTE
  // =====================================

  function actualizarResumen() {
    const natural = tipoSeleccionado() === 'natural';

    nombreResumen.textContent =
      nombre.value.trim() || 'Nuevo cliente';

    const descripcion = document.querySelector(
      '.nuevo-cliente__resumen > p'
    );

    if (descripcion) {
      descripcion.textContent = natural
        ? 'Persona natural'
        : 'Negocio o empresa';
    }

    resumenCredito.textContent = credito.checked
      ? 'Habilitado'
      : 'Deshabilitado';
  }

  // =====================================
  // CONSULTAR CLIENTE PARA EDICIÓN
  // =====================================

  async function cargarCliente() {
    if (!idEditar) return;

    botonGuardar.disabled = true;
    mostrarMensaje('Cargando información del cliente...', false);

    try {
      // Se utiliza la ruta GET /api/clientes
      // que ya funciona en el proyecto.
      const respuesta = await solicitarAPI(API_CLIENTES);

      const clientes = Array.isArray(respuesta)
        ? respuesta
        : Array.isArray(respuesta?.clientes)
          ? respuesta.clientes
          : Array.isArray(respuesta?.data)
            ? respuesta.data
            : [];

      clienteOriginal = clientes.find(
        cliente => String(cliente.id_cliente) === String(idEditar)
      );

      if (!clienteOriginal) {
        throw new Error(
          'No se encontró el cliente solicitado en la base de datos.'
        );
      }

      tituloFormulario.textContent = 'Editar cliente';
      textoGuardar.textContent = 'Guardar cambios';

      const tipo = clienteOriginal.tipo_cliente === 'negocio'
        ? 'negocio'
        : 'natural';

      const radio = document.querySelector(
        `input[name="tipoCliente"][value="${tipo}"]`
      );

      if (radio) radio.checked = true;

      nombre.value = clienteOriginal.nombre || '';

      contacto.value =
        clienteOriginal.contacto ||
        clienteOriginal.nombre ||
        '';

      documento.value =
        clienteOriginal.numero_documento || '';

      telefono.value = clienteOriginal.telefono || '';
      correo.value = clienteOriginal.correo || '';
      direccion.value = clienteOriginal.direccion || '';
      ciudad.value = clienteOriginal.ciudad || '';
      barrio.value = clienteOriginal.barrio || '';
      notas.value = clienteOriginal.notas || '';

      credito.checked =
        Number(clienteOriginal.credito_habilitado) === 1;

      cupo.value =
        clienteOriginal.cupo_credito ?? 0;

      const plazoGuardado = String(
        clienteOriginal.plazo_credito ?? 15
      );

      const existePlazo = Array.from(plazo.options).some(
        opcion => opcion.value === plazoGuardado
      );

      if (!existePlazo) {
        const opcion = document.createElement('option');
        opcion.value = plazoGuardado;
        opcion.textContent = plazoGuardado + ' días';
        plazo.appendChild(opcion);
      }

      plazo.value = plazoGuardado;

      actualizarTipo();
      actualizarCredito();
      ocultarMensaje();

      botonGuardar.disabled = false;

    } catch (error) {
      console.error('Error cargando cliente:', error);
      mostrarMensaje(error.message);
      botonGuardar.disabled = true;
    }
  }

  // =====================================
  // VALIDACIONES DEL FORMULARIO
  // =====================================

  function validarFormulario() {
    const nombreLimpio = valorTexto(nombre);
    const contactoLimpio = valorTexto(contacto);
    const telefonoLimpio = valorTexto(telefono);
    const documentoLimpio = valorTexto(documento);

    if (!nombreLimpio) {
      mostrarMensaje('Ingresa el nombre del cliente.');
      nombre.focus();
      return false;
    }

    if (!contactoLimpio) {
      mostrarMensaje('Ingresa la persona de contacto.');
      contacto.focus();
      return false;
    }

    if (!telefonoLimpio) {
      mostrarMensaje('Ingresa el teléfono del cliente.');
      telefono.focus();
      return false;
    }

    if (documentoLimpio.length > 30) {
      mostrarMensaje(
        'El número de documento no puede superar 30 caracteres.'
      );
      documento.focus();
      return false;
    }

    if (credito.checked) {
      const cupoValor = Number(cupo.value);
      const plazoValor = Number(plazo.value);

      if (!Number.isFinite(cupoValor) || cupoValor <= 0) {
        mostrarMensaje(
          'El cupo de crédito debe ser mayor que cero.'
        );
        cupo.focus();
        return false;
      }

      if (!Number.isInteger(plazoValor) || plazoValor <= 0) {
        mostrarMensaje(
          'Selecciona un plazo de crédito válido.'
        );
        plazo.focus();
        return false;
      }
    }

    return true;
  }

  // =====================================
  // PREPARAR DATOS PARA MYSQL
  // =====================================

  function obtenerDatosCliente() {
    const tipo = tipoSeleccionado();

    return {
      nombre: valorTexto(nombre),

      tipo_cliente: tipo,

      tipo_documento: tipo === 'natural'
        ? 'CC'
        : 'NIT',

      numero_documento: valorOpcional(documento),

      contacto: valorTexto(contacto),

      telefono: valorTexto(telefono),

      correo: valorOpcional(correo),

      direccion: valorOpcional(direccion),

      ciudad: valorOpcional(ciudad),

      barrio: valorOpcional(barrio),

      notas: valorOpcional(notas),

      credito_habilitado: credito.checked ? 1 : 0,

      cupo_credito: credito.checked
        ? numeroValido(cupo.value)
        : 0,

      plazo_credito: credito.checked
        ? numeroValido(plazo.value)
        : 15
    };
  }

  // =====================================
  // REGISTRAR O ACTUALIZAR CLIENTE
  // =====================================

  formulario.addEventListener('submit', async evento => {
    evento.preventDefault();

    if (guardando) return;

    ocultarMensaje();

    if (!validarFormulario()) return;

    const datosCliente = obtenerDatosCliente();

    const editando = Boolean(idEditar);

    const url = editando
      ? `${API_CLIENTES}/${encodeURIComponent(idEditar)}`
      : API_CLIENTES;

    const metodo = editando ? 'PUT' : 'POST';

    establecerCarga(true);

    try {
      await solicitarAPI(url, {
        method: metodo,
        body: JSON.stringify(datosCliente)
      });

      mostrarMensaje(
        editando
          ? 'Cliente actualizado correctamente.'
          : 'Cliente registrado correctamente.',
        false
      );

      window.alert(
        editando
          ? 'Cliente actualizado correctamente.'
          : 'Cliente registrado correctamente.'
      );

      window.location.href = 'clientes.html';

    } catch (error) {
      console.error('Error guardando cliente:', error);

      mostrarMensaje(error.message);

      establecerCarga(false);
    }
  });

  // =====================================
  // EVENTOS
  // =====================================

  document.querySelectorAll(
    'input[name="tipoCliente"]'
  ).forEach(radio => {
    radio.addEventListener('change', actualizarTipo);
  });

  nombre.addEventListener('input', actualizarResumen);

  credito.addEventListener('change', actualizarCredito);

  // =====================================
  // INICIALIZACIÓN
  // =====================================

  actualizarTipo();
  actualizarCredito();

  if (idEditar) {
    cargarCliente();
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
});
