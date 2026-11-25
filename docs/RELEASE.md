# Publicar una versión

Toda versión publicada tiene que poder reconstruirse desde un commit etiquetado. Esto se exige desde 0.4.0, porque 0.3.0 no cumplía esa condición (ver `CHANGELOG.md`).

## Pasos

1. Abrir un PR de versión: subir la versión en los cinco `package.json` y en sus dependencias internas exactas, y actualizar `CHANGELOG.md`. El workflow `verify` ejecuta pruebas, build y `release:pack --draft`.
2. Integrar el PR en `main`.
3. Etiquetar el commit integrado (`git tag v0.4.0 <commit> && git push origin v0.4.0`).
4. Ejecutar `npm run release:pack` en un checkout limpio de ese tag. El script:
   - exige que no haya cambios sin commit y que `HEAD` tenga el tag;
   - compila dos veces desde cero y falla si las integridades difieren;
   - deja los tarballs y `release/<versión>/manifest.json` con el commit y las integridades.
5. Publicar en npm **solo con la autorización del propietario**, desde ese mismo checkout:
   ```sh
   npm publish release/0.4.0/nexfluid-foundation-0.4.0.tgz   # foundation, core, components, sheets, react, en ese orden
   ```
   Atajo con 2FA desde cualquier equipo: `scripts/publish-release.sh X.Y.Z` hace los pasos 4 a 6 en un clon
   temporal del tag, pide el código 2FA antes de cada paquete y aborta si npm no devuelve la integridad del
   manifiesto. `--expected <manifest.json>` compara con un empaquetado hecho en otra máquina; `--dry-run` ensaya
   sin sesión ni publicación. Necesita git, Node y npm.

   Para tener *provenance*, publicar desde GitHub Actions con `id-token: write` y `npm publish --provenance`. Ese workflow todavía no existe; es la decisión D1 del ADR de Nextudio.
6. Verificar que lo publicado es lo empaquetado: `npm view @nexfluid/react@0.4.0 dist.integrity` tiene que coincidir con el manifiesto.

## Qué no hacer

- Publicar desde una carpeta que no sea un checkout limpio del tag.
- Publicar una versión que difiera de su manifiesto.
- Usar rangos en las dependencias internas.
