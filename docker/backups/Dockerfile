# syntax=docker/dockerfile:1
# Lightweight scheduled Postgres backup sidecar. No external dependencies.
FROM postgres:16-bookworm

RUN apt-get update \
  && apt-get install -y --no-install-recommends cron \
  && rm -rf /var/lib/apt/lists/*

COPY docker/backups/backup.sh /usr/local/bin/backup.sh
COPY docker/backups/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
