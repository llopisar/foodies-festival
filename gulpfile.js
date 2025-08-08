import path from 'path'
import fs from 'fs'
import { glob } from 'glob'
import { src, dest, watch, series } from 'gulp'
import * as dartSass from 'sass'
import gulpSass from 'gulp-sass'
const sass = gulpSass(dartSass)

import terser from 'gulp-terser'
import sharp from 'sharp'

// JS
export function js(done) {
  src('src/js/app.js')
    .pipe(terser())
    .pipe(dest('build/js'))
  done()
}

// CSS
export function css(done) {
  src('src/scss/app.scss', { sourcemaps: true })
    .pipe(sass({ outputStyle: 'compressed' }).on('error', sass.logError))
    .pipe(dest('build/css', { sourcemaps: '.' }))
  done()
}

// (Opcional) Thumbnails de galería – desactivado para evitar errores
export async function crop(done) {
  const inputFolder = 'src/img/gallery/full'
  const outputFolder = 'src/img/gallery/thumb'
  const width = 250
  const height = 180

  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true })
  }

  const images = fs.readdirSync(inputFolder).filter(file => /\.(jpg)$/i.test(path.extname(file)))
  try {
    for (const file of images) {
      const inputFile = path.join(inputFolder, file)
      const outputFile = path.join(outputFolder, file)
      if (!fs.existsSync(outputFile)) {
        await sharp(inputFile).resize(width, height, { position: 'centre' }).toFile(outputFile)
      }
    }
    done()
  } catch (error) {
    console.log(error)
    done(error)
  }
}

// Imágenes a build (solo jpg/png)
export async function imagenes(done) {
  const srcDir = './src/img'
  const buildDir = './build/img'
  const images = await glob('./src/img/**/*.{jpg,png}', { nodir: true })

  images.forEach(file => {
    const relativePath = path.relative(srcDir, path.dirname(file))
    const outputSubDir = path.join(buildDir, relativePath)
    procesarImagenes(file, outputSubDir)
  })
  done()
}

function procesarImagenes(file, outputSubDir) {
  if (!fs.existsSync(outputSubDir)) {
    fs.mkdirSync(outputSubDir, { recursive: true })
  }
  const baseName = path.basename(file, path.extname(file))
  const extName = path.extname(file)
  const outputFile = path.join(outputSubDir, `${baseName}${extName}`)
  const outputFileWebp = path.join(outputSubDir, `${baseName}.webp`)
  const outputFileAvif = path.join(outputSubDir, `${baseName}.avif`)

  const options = { quality: 80 }
  sharp(file).jpeg(options).toFile(outputFile)
  sharp(file).webp(options).toFile(outputFileWebp)
  sharp(file).avif().toFile(outputFileAvif)
}

// HTML a build (raíz + src/)
export function html() {
  return src(['*.html', 'src/**/*.html'])
    .pipe(dest('build'))
}

// Videos a build (copia sin modificar)
export function videos() {
  return src('src/video/**/*.{mp4,webm}')
    .pipe(dest('build/video', { encoding: false }));
}

// Watch de desarrollo
export function dev() {
  watch('src/scss/**/*.scss', css)
  watch('src/js/**/*.js', js)
  watch('src/img/**/*.{png,jpg}', imagenes)
  watch('src/video/**/*', videos)
  watch(['*.html', 'src/**/*.html'], html)
}

// PRODUCCIÓN (para Netlify y local): sin crop, videos primero
export const build = series(videos, js, css, imagenes, html)

// DESARROLLO (sin crop para evitar paradas)
export default series(videos, js, css, imagenes, html, dev)
