# TMS on Google Cloud — single VM

Run the full app (Postgres + API + Web + HTTPS proxy) on one **Compute Engine** VM.

## What you buy on GCP

| Item | Recommendation | ~Cost |
|------|----------------|-------|
| **Compute Engine VM** | `e2-medium` (2 vCPU, 4 GB RAM), Ubuntu 22.04 — **demo default** | ~$25/mo |
| **Boot disk** | 30 GB balanced PD | ~$3/mo |
| **Static external IP** | 1 address (free while VM runs) | ~$0–7/mo |
| **Domain** (optional) | Cloud DNS or any registrar | ~$12/yr |

Use **e2-standard-2** (8 GB) only if builds are slow or you expect heavy concurrent use. **Stop the VM** when not demoing to save most of the compute cost.

## Step 1 — Create the VM (Google Cloud Console)

1. Go to [Compute Engine → VM instances](https://console.cloud.google.com/compute/instances).
2. **Create instance**
   - Name: `tms-demo`
   - Region: closest to you (e.g. `us-central1`)
   - Machine type: **e2-medium** (demo) or **e2-standard-2** (heavier use)
   - Boot disk: **Ubuntu 22.04 LTS**, 30 GB
   - Firewall: allow **HTTP** and **HTTPS**
3. **Create**

## Step 2 — Reserve a static IP

1. **VPC network → IP addresses → Reserve static address**
2. Attach it to `tms-demo`

Note the IP (e.g. `34.x.x.x`).

## Step 3 — Firewall (if HTTP/HTTPS not checked)

**VPC network → Firewall → Create rule**

- Targets: all instances (or network tag `tms`)
- Source: `0.0.0.0/0`
- TCP: `22`, `80`, `443`

## Step 4 — SSH into the VM

Console → SSH, or:

```bash
gcloud compute ssh tms-demo --zone=YOUR_ZONE
```

## Step 5 — Run the setup script

```bash
export REPO_URL=https://github.com/YOUR_ORG/Pr-TPM.git
bash -c "$(curl -fsSL https://raw.githubusercontent.com/YOUR_ORG/Pr-TPM/main/infra/gcp-vm/setup-gcp-vm.sh)"
```

Or clone manually:

```bash
sudo git clone https://github.com/YOUR_ORG/Pr-TPM.git /opt/pr-tms
sudo chown -R $USER:$USER /opt/pr-tms
cd /opt/pr-tms/infra/gcp-vm
cp .env.example .env
nano .env   # edit passwords and URLs
docker compose up -d --build
```

### Edit `.env` (minimum)

Replace `YOUR_VM_IP` with your static IP:

```env
POSTGRES_PASSWORD=<strong-password>
JWT_SECRET=<long-random-string>
CORS_ORIGIN=http://YOUR_VM_IP
WEB_PAY_ORIGIN=http://YOUR_VM_IP
NEXT_PUBLIC_API_URL=http://YOUR_VM_IP/api/v1
```

Rebuild web after changing `NEXT_PUBLIC_*`:

```bash
docker compose up -d --build web
```

## Step 6 — Open the app

- **Web:** `http://YOUR_VM_IP`
- **API:** `http://YOUR_VM_IP/api/v1/...`
- **Swagger:** `http://YOUR_VM_IP/api/docs`

**Login:** any demo user, password **`demo123`** (see repo README).

## Step 7 — Test payments (customer demo)

1. Login as `admin@sgtemple.org` / `demo123`
2. **Admin → Settings → Payments**
3. Add Stripe **test** keys (`pk_test_…`, `sk_test_…`)
4. Book seva with card `4242 4242 4242 4242`

## Step 8 — Add HTTPS with your domain (recommended)

1. Point DNS:
   - `demo.yourdomain.com` → VM static IP
   - `api.yourdomain.com` → VM static IP
2. Update `.env`:

```env
WEB_DOMAIN=demo.yourdomain.com
API_DOMAIN=api.yourdomain.com
CORS_ORIGIN=https://demo.yourdomain.com
WEB_PAY_ORIGIN=https://demo.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
ACME_EMAIL=you@example.com
```

3. Rebuild and restart:

```bash
docker compose up -d --build
```

Caddy obtains Let's Encrypt certificates automatically.

## Useful commands

```bash
cd /opt/pr-tms/infra/gcp-vm

docker compose ps
docker compose logs -f api
docker compose logs -f web
docker compose restart api
docker compose up -d --build   # after git pull
```

## Backup Postgres

```bash
docker compose exec postgres pg_dump -U tms tms_control > backup-control.sql
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Site not loading | Check firewall 80/443; `docker compose ps` |
| API errors | `docker compose logs api`; verify `.env` passwords match postgres |
| Login works but no data | Wait 1–2 min for tenant DB provisioning on first boot |
| Payments fail | Add Stripe test keys in Admin → Payments |
| CORS errors | `CORS_ORIGIN` must exactly match browser URL (http vs https) |
| HTTPS / login fails right after deploy | Wait 1–2 min for Caddy to obtain Let's Encrypt cert; use `https://WEB_DOMAIN`, not the raw IP |
| Login "invalid for this temple" | Match temple picker to demo email (e.g. `frontdesk@svtemple.org` on Venkateswara, `frontdesk@sgtemple.org` on Ganesha) |

## Cost tip

**Stop the VM** when not demoing (Compute → Stop). You still pay for static IP + disk, but not CPU/RAM.
