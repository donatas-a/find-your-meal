#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
until python -c "import psycopg2; psycopg2.connect('$DATABASE_URL')" 2>/dev/null; do
  sleep 2
done
echo "PostgreSQL is ready."

python init_admin.py
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
