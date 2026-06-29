#!/usr/bin/env sh
set -eu

APP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
DIST_DIR="$APP_DIR/dist"
SPA_DIR="$DIST_DIR/spa"
PKG_ROOT="$DIST_DIR/deb-root"
INSTALL_DIR="$PKG_ROOT/usr/share/openscan3-client"
DEBIAN_DIR="$PKG_ROOT/DEBIAN"

if ! command -v dpkg-deb >/dev/null 2>&1; then
  echo "dpkg-deb command not found (required to create .deb package)" >&2
  exit 1
fi

if [ ! -d "$SPA_DIR" ]; then
  echo "SPA build not found at $SPA_DIR. Run npm run build first." >&2
  exit 1
fi

PACKAGE_NAME=$(node -p "require('$APP_DIR/package.json').name")
VERSION=$(node -p "require('$APP_DIR/package.json').version")
DESCRIPTION=$(node -p "require('$APP_DIR/package.json').description || 'Frontend client for OpenScan3 firmware devices'")
AUTHOR=$(node -p "require('$APP_DIR/package.json').author || 'OpenScan.eu Team <info@openscan.eu>'")
DEB_FILE="$DIST_DIR/${PACKAGE_NAME}_${VERSION}_all.deb"

rm -rf "$PKG_ROOT" "$DEB_FILE"
mkdir -p "$INSTALL_DIR" "$DEBIAN_DIR"
cp -a "$SPA_DIR/." "$INSTALL_DIR/"
find "$PKG_ROOT" -type d -exec chmod 755 {} +
find "$PKG_ROOT" -type f -exec chmod 644 {} +

cat > "$DEBIAN_DIR/control" <<EOF
Package: $PACKAGE_NAME
Version: $VERSION
Section: web
Priority: optional
Architecture: all
Maintainer: $AUTHOR
Description: $DESCRIPTION
 Static Quasar SPA assets for the OpenScan3 frontend.
EOF

dpkg-deb -Zxz --root-owner-group --build "$PKG_ROOT" "$DEB_FILE"
echo "$DEB_FILE"
