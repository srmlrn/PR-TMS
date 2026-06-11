#!/usr/bin/env bash
# Bootstrap Docker on a fresh Ubuntu GCP VM and start TMS.
# Run on the VM: bash setup-gcp-vm.sh
set -euo pipefail

REPO_URL="${REPO_URL:-}"
INSTALL_DIR="${INSTALL_DIR:-/opt/pr-tms}"

echo "==> Installing Docker..."
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" |
  sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker "$USER" || true

if [[ -n "$REPO_URL" && ! -d "$INSTALL_DIR/.git" ]]; then
  echo "==> Cloning repository..."
  sudo mkdir -p "$(dirname "$INSTALL_DIR")"
  sudo git clone "$REPO_URL" "$INSTALL_DIR"
  sudo chown -R "$USER:$USER" "$INSTALL_DIR"
fi

if [[ ! -d "$INSTALL_DIR/infra/gcp-vm" ]]; then
  echo "ERROR: $INSTALL_DIR/infra/gcp-vm not found."
  echo "Clone the repo first or set INSTALL_DIR to your checkout path."
  exit 1
fi

cd "$INSTALL_DIR/infra/gcp-vm"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo ""
  echo "==> Created .env from .env.example"
  echo "    Edit .env with your VM IP / domain, then run:"
  echo "    cd $INSTALL_DIR/infra/gcp-vm && docker compose up -d --build"
  exit 0
fi

echo "==> Building and starting TMS stack..."
docker compose up -d --build

echo ""
echo "Done. Open http://$(curl -s -H Metadata-Flavor:Google http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip 2>/dev/null || echo YOUR_VM_IP)"
echo "Login password for all demo users: demo123"
