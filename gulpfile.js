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
    .pipe(
      sass({ outputStyle: 'compressed' }).on('error', sass.logError)
    )
    .pipe(dest('build/css', { sourcemaps: '.' }))
  done()
}

// THUMBS (gallery)
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
    images.forEach(file => {
      const inputFile = path.join(inputFolder, file)
      const outputFile = path.join(outputFolder, file)
      sharp(inputFile)
        .resize(width, height, { position: 'centre' }) // 'centre' ok en sharp
        .toFile(outputFile)
    })
    done()
  } catch (error) {
    console.log(error)
  }
}

// IMÁGENES a build (jpg/png + webp/avif)
export async function imagenes(done) {
  const srcDir = './src/img'
  const buildDir = './build/img'
  // FIX del glob: .{jpg,png}
  const images = await glob('./src/img/**/*.{jpg,png}')

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

// NUEVO: copiar HTML a build/
export function html() {
  return src('src/**/*.html')
    .pipe(dest('build'))
}

// WATCH para desarrollo
export function dev() {
  watch('src/scss/**/*.scss', css)
  watch('src/js/**/*.js', js)
  // FIX: antes miraba 'src/js' en vez de 'src/img'
  watch('src/img/**/*.{png,jpg}', imagenes)
  watch('src/**/*.html', html)
}

// Tarea por defecto (dev)
export default series(crop, js, css, imagenes, html, dev)

// Tarea de producción (para Netlify)
export const build = series(crop, js, css, imagenes, html)