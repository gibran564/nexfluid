# NexImageEditor

Importa `NexImageEditor` desde `@nexfluid/react/image` y carga `@nexfluid/components/styles.css`. Conviene importar el editor dinámicamente al abrir el entorno de edición.

```tsx
<NexImageEditor
  key={sourceId}
  source={originalBlob}
  initialEdits={savedEdits}
  label="Editar figura"
  onApply={async ({ blob, edits, width, height }) => {
    const derivative = await storeDerivative(blob);
    await saveImage({ sourceId, derivative, edits, width, height });
  }}
  onCancel={closeEditor}
/>
```

La biblioteca recibe un Blob raster autorizado por la aplicación. La aplicación conserva el identificador del original y guarda la versión 1 de las operaciones junto con el archivo derivado. El editor vuelve a renderizar desde el original, también al reanudar una edición. El historial de 40 cambios vive en la instancia. `onCancel` permite al anfitrión salir sin guardar. Para editar otra imagen, monta el editor con la clave de ese recurso.

El recorte se expresa en coordenadas normalizadas del original. Las marcas se expresan en coordenadas normalizadas del resultado encuadrado y rotado. Exportar genera PNG, JPEG o WebP si el navegador dispone del codificador. La vista previa utiliza como máximo 960 px de lado y la exportación 4096 px. El editor acepta hasta 25 MB y comprueba el máximo de 24 megapíxeles tras la decodificación del navegador. Valida los datos persistidos en la capa anfitriona y conserva la procedencia antes de publicar una figura.

El motor usa Canvas 2D y no recibe URLs ni SVG. Su interfaz organiza el encuadre, los ajustes de color y las anotaciones en grupos separados. La primera versión incluye flechas, etiquetas y regiones rectangulares. El recorte se puede trazar sobre el original o escribir en porcentajes. Las marcas se colocan con puntero, pantalla táctil o coordenadas mediante teclado. Los formatos con pérdidas tienen calidad configurable. El zoom sólo afecta el visor.

## Elección del motor

Una prueba de concepto en Chromium 158 reprodujo el mismo giro y exportación PNG con Canvas 2D y Fabric 7.4.0. Se midió la mediana de seis operaciones tras un calentamiento, con una imagen de gradiente y marcas. A 1200 × 800, Canvas registró 58.8 ms y Fabric 59.4 ms. A 3600 × 2400, registraron 506.8 y 507.1 ms respectivamente. La exportación domina esta operación. El fragmento mínimo probado de Fabric ocupa 88.4 kB gzip. El archivo completo distribuido de Konva 10.11.0 ocupa 60.2 kB gzip. Ambos tienen licencia MIT. El editor de Filerobot (MIT, 5.0.0-beta.159 en npm) aporta una interfaz completa con UI e iconos de Scaleflex más Konva. [Fabric](https://github.com/fabricjs/fabric.js/releases) · [Konva](https://github.com/konvajs/konva/releases) · [Filerobot](https://github.com/scaleflex/filerobot-image-editor).

El editor usa Canvas 2D porque el modelo actual se puede representar en una pasada por la imagen y una lista de marcas. La edición se ejecuta en el navegador y se puede cargar después de hidratar. Se conserva el modelo de operaciones aunque en un futuro se sustituya el renderizador por un motor de objetos, filtros WebGL o un worker. La prueba de giro y exportación no mide edición multicapas ni memoria en dispositivos físicos.
