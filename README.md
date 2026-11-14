# 🛰️🍐 supernova-eta26 — NASA Space Apps Challenge 2026

Desafío **Adapting Farms with NASA Data** · Región: **Alto Valle de Río Negro y Neuquén** · *Nombre del sitio: pendiente*

Web app para chacreros: se marca la chacra en el mapa y se obtiene un tablero con 3 pilares:

1. 🛰️ **Datos de NASA**: POWER, MODIS NDVI, nieve MODIS, GIBS y SRTM.
2. 👨‍🌾 **Información del chacrero**, procesada con IA (OpenRouter), por texto o por voz.
3. 🌦️ **Pronóstico** de Open-Meteo.

Incluye el botón ✨ **"¿Qué me conviene cultivar acá?"**, que da una recomendación con semáforo y fuentes y se puede escuchar en voz alta. Además trae calendario de heladas, termómetro de nieve, calculadora de riego, opción de compartir por WhatsApp y PDF, y modo offline (PWA). La arquitectura es escalable por región.

📋 **Plan de trabajo:** [`docs/PLAN.md`](docs/PLAN.md)

**Stack:** Next.js + TypeScript + Tailwind · Leaflet · OpenRouter · Serwist (PWA) · Vercel
