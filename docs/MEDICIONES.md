# Mediciones

Generado por `npm run presets` el 2026-10-30 con Node v24.22.0 en win32/x64.

## Presets de movimiento

Respuesta a un salto unitario del resorte (sin el filtro viscoso, que añade retraso pero no sobrepaso).

| Preset | k | c | ζ | ω₀ (rad/s) | τ viscoso (s) | Sobrepaso | Asentamiento ±0.1 % | Deformación máx. | Ambiente (amp · ciclos/s) |
|---|---|---|---|---|---|---|---|---|---|
| `calm` | 120 | 26 | 1.19 | 11.0 | 0.08 | 0.0 % | 1208 ms | 4 % | 0.012 · 0.05 |
| `flow` | 170 | 22 | 0.84 | 13.0 | 0.04 | 0.7 % | 667 ms | 6 % | 0.02 · 0.08 |
| `elastic` | 380 | 17 | 0.44 | 19.5 | 0 | 21.8 % | 783 ms | 10 % | 0.01 · 0.1 |
| `viscous` | 90 | 24 | 1.26 | 9.5 | 0.18 | 0.0 % | 1542 ms | 8 % | 0.02 · 0.04 |
| `magnetic` | 260 | 26 | 0.81 | 16.1 | 0.02 | 1.4 % | 525 ms | 12 % | 0 · 0 |
| `morph` | 140 | 20 | 0.85 | 11.8 | 0.06 | 0.7 % | 737 ms | 14 % | 0.015 · 0.06 |
| `spring` | 300 | 18 | 0.52 | 17.3 | 0 | 14.8 % | 733 ms | 8 % | 0 · 0 |
| `ambient` | 40 | 14 | 1.11 | 6.3 | 0.3 | 0.0 % | 1854 ms | 5 % | 0.035 · 0.03 |

## Coste de cálculo por fotograma de FluidBlob

Sólo JavaScript: 4 resortes, muestreo del contorno con conservación de área y generación del trazado. **No incluye** recálculo de estilo, layout, rasterizado del SVG ni composición, que dependen del navegador y del tamaño en pantalla. Por eso no es una cifra de fps.

| Puntos del contorno | Mediana (µs/fotograma) | p95 (µs/fotograma) |
|---|---|---|
| 16 | 19.3 | 24.2 |
| 24 | 29.3 | 38.4 |
| 48 | 59.3 | 95.7 |
