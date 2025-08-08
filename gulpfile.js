import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { src, dest, watch, series, parallel } from 'gulp';
import * as dartSass from 'sass';
import gulpSass from 'gulp-sass';
import terser from 'gulp-terser';
import sharp from 'sharp';

const sass = gulpSass(dartSass);

// ---------- CLEAN ----------
export function clean(done) {
  try { fs.rmSync('build', { recursive: true, force: true }); } catch (_) {}
  fs.mkdirSync('build', { recursive: true });
  done();
}

// ---------- JS ----------
export function js() {
  return src('src/js/app.js')
    .pipe(terser())
    .pipe(dest('build/js'));
}

// ---------- CSS ----------
export function css() {
  return src('src/scss/app.scss', { sourcemaps: true })
    .pipe(sass({ outputStyle: 'compressed' }).on('error', sass.logError))
    .pipe(dest('build/css', { sourcemaps: '.' }));
}

// ---------- IMÁGENES ----------
export async function imagenes(done) {
  const srcDir = './src/img';
  const buildDir = './build/img';
  const images = await glob('./src/img/**/*.{jpg,jpeg,png}', { nodir: true });

  for (const file of images) {
    const relativePath = path.relative(srcDir, path.dirname(file));
    const outDir = path.join(buildDir, relativePath);
    procesarImagenes(file, outDir);
  }
  done();
}

function procesarImagenes(file, outDir) {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const baseName = path.basename(file, path.extname(file));
  const extName = path.extname(file);
  const outFile = path.join(outDir, `${baseName}${extName}`);
  const outWebp = path.join(outDir, `${baseName}.webp`);
  const outAvif = path.join(outDir, `${baseName}.avif`);
  const options = { quality: 80 };

  sharp(file).toFile(outFile);
  sharp(file).webp(options).toFile(outWebp);
  sharp(file).avif().toFile(outAvif);
}

// ---------- HTML ----------
export function html() {
  return src(['*.html', 'src/**/*.html'])
    .pipe(dest('build'));
}

// ---------- COPIA FINAL DE VIDEOS ----------
export function copyVideoFinal() {
  const inDir = 'src/video';
  const outDir = 'build/video';

  if (!fs.existsSync(inDir)) return Promise.resolve();
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const f of fs.readdirSync(inDir)) {
    const name = f.toLowerCase();
    if (name.endsWith('.mp4') || name.endsWith('.webm')) {
      fs.copyFileSync(`${inDir}/${f}`, `${outDir}/${f}`);
    }
  }
  return Promise.resolve();
}

// ---------- WATCH ----------
export function dev() {
  watch('src/scss/**/*.scss', css);
  watch('src/js/**/*.js', js);
  watch('src/img/**/*.{jpg,jpeg,png}', imagenes);
  watch(['*.html', 'src/**/*.html'], html);
  watch('src/video/**/*.{mp4,webm}', copyVideoFinal);
}

// ---------- BUILD Y DEFAULT ----------
export const build = series(
  clean,
  parallel(js, css, imagenes, html),
  copyVideoFinal
);

export default series(build, dev);
