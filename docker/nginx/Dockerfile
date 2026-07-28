# syntax=docker/dockerfile:1
# Reverse proxy with the nginx.conf baked in, so the stack can be pulled and
# run without any source files on the host.
FROM nginx:1.27-alpine

COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
