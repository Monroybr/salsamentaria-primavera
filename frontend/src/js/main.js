
document.addEventListener('DOMContentLoaded', () => {

  const boton = document.getElementById('btnPrueba');

  if (boton) {
    boton.addEventListener('click', () => {
      alert('¡Salsamentaria Primavera funciona correctamente!');
    });
  }

});
