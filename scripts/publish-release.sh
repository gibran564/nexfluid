#!/usr/bin/env bash
# Publica @nexfluid/* desde un checkout limpio de su tag, con npm y 2FA.
#
#   scripts/publish-release.sh 0.10.0
#   scripts/publish-release.sh 0.10.0 --expected ~/Descargas/manifest.json
#   scripts/publish-release.sh 0.10.0 --dry-run
#
# Sigue docs/RELEASE.md: clona el tag vX.Y.Z en una carpeta temporal, ejecuta
# `npm ci` y `npm run release:pack` (dos compilaciones idénticas), publica los
# cinco tarballs en orden y comprueba que la integridad de npm coincide con el
# manifiesto. No necesita el repositorio clonado: puede ejecutarse desde
# cualquier carpeta. Compatible con el bash 3.2 de macOS.
#
# 2FA: antes de cada paquete pide el código de tu app de autenticación (los
# códigos caducan en ~30 s). Si lo dejas vacío, npm sigue con su propio flujo
# (navegador o llave de seguridad).

set -euo pipefail

REPO="${NEXFLUID_REPO:-https://github.com/gibran564/nexfluid.git}"
ORDER="foundation core components sheets react"
VERSION=""
EXPECTED=""
DRY_RUN=0
KEEP=0

usage() { sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }
fail() { printf '\n✗ %s\n' "$*" >&2; exit 1; }
step() { printf '\n▸ %s\n' "$*"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --expected) EXPECTED="${2:-}"; [ -n "$EXPECTED" ] || fail "--expected necesita la ruta de un manifest.json"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --keep) KEEP=1; shift ;;
    -h|--help) usage 0 ;;
    -*) fail "Opción desconocida: $1" ;;
    *) [ -z "$VERSION" ] || fail "Sobra el argumento: $1"; VERSION="$1"; shift ;;
  esac
done

[ -n "$VERSION" ] || usage 1
printf '%s' "$VERSION" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$' || fail "Versión inválida: $VERSION (formato X.Y.Z, sin prefijos ni prerelease)"
[ -z "$EXPECTED" ] || [ -f "$EXPECTED" ] || fail "No existe el manifiesto esperado: $EXPECTED"
# Absoluta: el script trabaja después dentro de un clon temporal.
[ -z "$EXPECTED" ] || EXPECTED="$(cd "$(dirname "$EXPECTED")" && pwd)/$(basename "$EXPECTED")"
TAG="v$VERSION"

for tool in git node npm; do command -v "$tool" >/dev/null || fail "Falta $tool en el PATH"; done

# Lee un campo del manifiesto: integridad o archivo de un paquete.
manifest() { node -e '
  const m = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); const p = m.packages[process.argv[2]];
  if (!p) process.exit(2); process.stdout.write(p[process.argv[3]]);' "$1" "@nexfluid/$2" "$3"; }

step "Comprobaciones previas"
if [ "$DRY_RUN" -eq 0 ]; then
  if ! NPM_USER="$(npm whoami 2>/dev/null)"; then
    echo "No hay sesión de npm. Abriendo npm login…"
    npm login --auth-type=web
    NPM_USER="$(npm whoami)" || fail "npm login no completó la sesión"
  fi
  echo "Sesión de npm: $NPM_USER"
else
  echo "Ensayo (--dry-run): no se necesita sesión y no se publica nada."
fi

PENDING=""
for pkg in $ORDER; do
  if npm view "@nexfluid/$pkg@$VERSION" version >/dev/null 2>&1; then
    echo "  @nexfluid/$pkg@$VERSION ya está publicado: se verificará, no se vuelve a publicar."
  else
    PENDING="$PENDING $pkg"
  fi
done

git ls-remote --exit-code --tags "$REPO" "refs/tags/$TAG" >/dev/null || fail "El tag $TAG no existe en $REPO"

WORK="$(mktemp -d "${TMPDIR:-/tmp}/nexfluid-$VERSION.XXXXXX")"
cleanup() { if [ "$KEEP" -eq 0 ]; then rm -rf "$WORK"; else echo "Carpeta conservada: $WORK"; fi; }
trap cleanup EXIT

step "Checkout limpio de $TAG"
git -c advice.detachedHead=false clone --quiet --depth 1 --branch "$TAG" "$REPO" "$WORK/repo"
cd "$WORK/repo"
echo "Commit: $(git rev-parse --short HEAD)"

step "Instalación (npm ci)"
npm ci --no-audit --no-fund >/dev/null
[ -z "$(git status --porcelain)" ] || fail "npm ci dejó cambios en el árbol; RELEASE.md exige un checkout limpio"

step "Empaquetado reproducible (npm run release:pack)"
npm run -s release:pack
MANIFEST="release/$VERSION/manifest.json"
[ -f "$MANIFEST" ] || fail "release:pack no generó $MANIFEST"

if [ -n "$EXPECTED" ]; then
  step "Comparación con el manifiesto esperado"
  MISMATCH=0
  for pkg in $ORDER; do
    here="$(manifest "$MANIFEST" "$pkg" integrity)"; there="$(manifest "$EXPECTED" "$pkg" integrity)"
    if [ "$here" = "$there" ]; then echo "  ✓ $pkg"; else echo "  ✗ $pkg"; echo "      aquí:     $here"; echo "      esperado: $there"; MISMATCH=1; fi
  done
  if [ "$MISMATCH" -ne 0 ]; then
    echo
    echo "Las integridades difieren de las del otro equipo (Node/npm distintos pueden cambiar el tarball)."
    echo "Se publicaría lo construido AQUÍ, y el lockfile de Nextudio deberá usar estas integridades."
    printf '¿Continuar de todos modos? Escribe «sí» para seguir: '
    read -r answer; [ "$answer" = "sí" ] || fail "Cancelado: integridades distintas"
  fi
fi

if [ -z "$PENDING" ]; then
  echo; echo "Los cinco paquetes ya están publicados; sólo queda verificar."
elif [ "$DRY_RUN" -eq 1 ]; then
  step "Ensayo de publicación"
  for pkg in $PENDING; do npm publish "release/$VERSION/$(manifest "$MANIFEST" "$pkg" file)" --access public --dry-run 2>&1 | tail -3; done
else
  step "Publicación"
  echo "Se publicarán en este orden:$PENDING"
  printf 'Escribe la versión (%s) para confirmar: ' "$VERSION"
  read -r answer; [ "$answer" = "$VERSION" ] || fail "Cancelado"
  for pkg in $PENDING; do
    tarball="release/$VERSION/$(manifest "$MANIFEST" "$pkg" file)"
    printf '\nCódigo 2FA para @nexfluid/%s (vacío = flujo de npm): ' "$pkg"
    read -r otp
    if [ -n "$otp" ]; then npm publish "$tarball" --access public --otp="$otp"; else npm publish "$tarball" --access public; fi
    echo "  ✓ @nexfluid/$pkg@$VERSION publicado"
  done
fi

if [ "$DRY_RUN" -eq 0 ]; then
  step "Verificación en el registro"
  BAD=0
  for pkg in $ORDER; do
    want="$(manifest "$MANIFEST" "$pkg" integrity)"; got=""
    for _ in 1 2 3 4 5 6; do
      got="$(npm view "@nexfluid/$pkg@$VERSION" dist.integrity 2>/dev/null || true)"
      [ -n "$got" ] && break; sleep 5
    done
    if [ "$got" = "$want" ]; then echo "  ✓ @nexfluid/$pkg@$VERSION  $got"; else echo "  ✗ @nexfluid/$pkg@$VERSION  npm=${got:-<sin respuesta>}  manifiesto=$want"; BAD=1; fi
  done
  [ "$BAD" -eq 0 ] || fail "Lo publicado no coincide con el manifiesto (ver arriba)"
  echo; echo "Listo: @nexfluid/*@$VERSION publicado y verificado contra el manifiesto de $TAG."
  echo "Para Nextudio: versión exacta $VERSION y estas integridades en tests/unit/nexfluid-dependencies.test.ts."
fi
