
const { src, dest, watch, series, parallel } = require('gulp');

const sass = require('gulp-sass')(require('sass'));
const nunjucksRender = require('gulp-nunjucks-render');
const browserSync = require('browser-sync').create();

// Compilar archivos SCSS a CSS
function estilos() {
  return src('frontend/src/scss/main.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(dest('frontend/dist/css'));
}

// Convertir plantillas Nunjucks a HTML
function paginas() {
  return src('frontend/src/pages/**/*.njk')
    .pipe(nunjucksRender({
      path: [
        'frontend/src/components',
        'frontend/src/pages'
      ]
    }))
    .pipe(dest('frontend/dist'));
}

// Copiar archivos JavaScript
function scripts() {
  return src('frontend/src/js/**/*.js')
    .pipe(dest('frontend/dist/js'));
}

// Copiar imágenes y otros recursos
function archivos() {
  return src('frontend/src/assets/**/*', {
    encoding: false
  })
    .pipe(dest('frontend/dist/assets'));
}

// Iniciar servidor de desarrollo
function servidor(done) {
  browserSync.init({
    server: {
      baseDir: 'frontend/dist'
    },
    port: 3000
  });

  done();
}

// Vigilar cambios en archivos
function observar() {

  watch(
    'frontend/src/scss/**/*.scss',
    estilos
  );

  watch(
    [
      'frontend/src/pages/**/*.njk',
      'frontend/src/components/**/*.njk'
    ],
    paginas
  );

  watch(
    'frontend/src/js/**/*.js',
    scripts
  );

  watch(
    'frontend/src/assets/**/*',
    archivos
  );

  watch('frontend/dist/**/*').on(
    'change',
    browserSync.reload
  );
}

// Compilar el proyecto
const compilar = parallel(
  estilos,
  paginas,
  scripts,
  archivos
);

exports.build = compilar;

exports.default = series(
  compilar,
  servidor,
  observar
);
