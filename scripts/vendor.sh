#!/usr/bin/env bash
# Copia as bibliotecas de node_modules para public/vendor e as fontes para public/fonts.
set -e
V=public/vendor; mkdir -p $V public/fonts
cp node_modules/pdf-lib/dist/pdf-lib.min.js $V/
cp node_modules/jszip/dist/jszip.min.js $V/
cp node_modules/qrcode-generator/dist/qrcode.mjs $V/
cp node_modules/pdfjs-dist/build/pdf.min.mjs node_modules/pdfjs-dist/build/pdf.worker.min.mjs $V/
F=node_modules/@fontsource
cp $F/press-start-2p/files/press-start-2p-latin-400-normal.woff2 public/fonts/ps2p.woff2
cp $F/press-start-2p/files/press-start-2p-latin-ext-400-normal.woff2 public/fonts/ps2p-ext.woff2
cp $F/vt323/files/vt323-latin-400-normal.woff2 public/fonts/vt323.woff2
cp $F/vt323/files/vt323-latin-ext-400-normal.woff2 public/fonts/vt323-ext.woff2
