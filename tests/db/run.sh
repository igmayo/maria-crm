#!/usr/bin/env bash
# Prueba las migraciones y las reglas de acceso contra un Postgres temporal. No toca nada más.
set -euo pipefail
cd "$(dirname "$0")/../.."
BIN=${PGBIN:-/usr/lib/postgresql/16/bin}
PORT=${PGPORT:-54329}
DIR=$(mktemp -d)
chmod 755 "$DIR"
RUN=""
if [ "$(id -u)" = "0" ]; then RUN="su postgres -c"; chown postgres "$DIR"; fi
run() { if [ -n "$RUN" ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
cleanup() { run "$BIN/pg_ctl -D $DIR/data stop -m immediate" >/dev/null 2>&1 || true; rm -rf "$DIR"; }
trap cleanup EXIT
run "$BIN/initdb -D $DIR/data -U postgres --auth=trust" >/dev/null
run "$BIN/pg_ctl -D $DIR/data -o '-p $PORT -k $DIR -c listen_addresses=127.0.0.1' -l $DIR/log -w start" >/dev/null
PSQL="psql -h 127.0.0.1 -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -c "create database maria_test" postgres
for f in tests/db/shim.sql supabase/migrations/*.sql tests/db/seed.sql; do
  echo "aplicando $f"; $PSQL -d maria_test -f "$f" >/dev/null
done
PGPORT=$PORT node tests/db/rls.test.mjs
