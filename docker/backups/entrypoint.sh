#!/usr/bin/env bash
set -euo pipefail

CRON_SCHEDULE="${BACKUP_CRON:-0 3 * * *}"

# Export the runtime environment so cron jobs inherit DB credentials.
printenv | grep -E '^(POSTGRES_|BACKUP_)' | sed 's/^/export /' > /etc/backup.env

cat > /etc/cron.d/studio-backup <<EOF
${CRON_SCHEDULE} root . /etc/backup.env; /usr/local/bin/backup.sh >> /backups/backup.log 2>&1
EOF
chmod 0644 /etc/cron.d/studio-backup
crontab /etc/cron.d/studio-backup

mkdir -p /backups
echo "[backups] scheduled: '${CRON_SCHEDULE}'. Running an initial backup now."
/usr/local/bin/backup.sh >> /backups/backup.log 2>&1 || echo "[backups] initial backup failed (db may still be starting)"

echo "[backups] starting cron in foreground"
exec cron -f
