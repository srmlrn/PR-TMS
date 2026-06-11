#!/bin/sh
set -eu

CADDYFILE=/etc/caddy/Caddyfile

if [ -n "${WEB_DOMAIN:-}" ]; then
  cat >"$CADDYFILE" <<EOF
{
	email ${ACME_EMAIL:-}
}

${WEB_DOMAIN} {
	handle /api/* {
		reverse_proxy api:3000
	}
	handle {
		reverse_proxy web:3001
	}
}

# Redirect bare-IP HTTP visitors to the HTTPS domain (ACME uses Host on WEB_DOMAIN).
:80 {
	redir https://${WEB_DOMAIN}{uri} permanent
}
EOF
else
  cat >"$CADDYFILE" <<EOF
:80 {
	handle /api/* {
		reverse_proxy api:3000
	}
	handle {
		reverse_proxy web:3001
	}
}
EOF
fi

exec caddy run --config "$CADDYFILE" --adapter caddyfile
