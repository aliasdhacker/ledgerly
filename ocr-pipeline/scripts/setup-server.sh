#!/bin/bash
set -e

echo "========================================"
echo "DriftMoney OCR Pipeline - Server Setup"
echo "========================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}Don't run as root. Run as regular user with docker permissions.${NC}"
    exit 1
fi

# Check docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker not installed. Install docker first.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Docker Compose not installed.${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 1: Cleaning up existing containers...${NC}"
docker-compose down -v 2>/dev/null || true
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true
docker system prune -f
echo -e "${GREEN}Done.${NC}"

echo ""
echo -e "${YELLOW}Step 2: Generate password hash${NC}"
echo "Enter the password you want to use for API authentication:"
HASH=$(docker run --rm -i caddy:2 caddy hash-password)
echo ""
echo -e "${GREEN}Your hash:${NC}"
echo "$HASH"

echo ""
echo -e "${YELLOW}Step 3: Configure .env${NC}"
read -p "Enter API domain (e.g., api.yourdomain.com): " API_DOMAIN
read -p "Enter Ollama domain (e.g., ollama.yourdomain.com): " OLLAMA_DOMAIN
read -p "Enter API username [apiuser]: " API_USER
API_USER=${API_USER:-apiuser}
read -p "Enter LLM model [llama3.1:8b]: " LLM_MODEL
LLM_MODEL=${LLM_MODEL:-llama3.1:8b}

cat > .env << EOF
LLM_MODEL=${LLM_MODEL}
API_DOMAIN=${API_DOMAIN}
OLLAMA_DOMAIN=${OLLAMA_DOMAIN}
API_USER=${API_USER}
API_PASSWORD_HASH=${HASH}
EOF

echo -e "${GREEN}.env created.${NC}"

echo ""
echo -e "${YELLOW}Step 4: Firewall${NC}"
read -p "Open ports 80 and 443? (y/n) [y]: " OPEN_FIREWALL
OPEN_FIREWALL=${OPEN_FIREWALL:-y}
if [ "$OPEN_FIREWALL" = "y" ]; then
    sudo ufw allow 80
    sudo ufw allow 443
    sudo ufw reload
    echo -e "${GREEN}Firewall configured.${NC}"
fi

echo ""
echo -e "${YELLOW}Step 5: Building and starting services...${NC}"
docker-compose build
docker-compose up -d

echo ""
echo -e "${YELLOW}Step 6: Pulling LLM model (this may take a while)...${NC}"
docker exec -it driftmoney-ollama ollama pull ${LLM_MODEL}

echo ""
echo -e "${YELLOW}Step 7: Verifying containers...${NC}"
sleep 5
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

RUNNING=$(docker ps --format "{{.Names}}" | wc -l)
if [ "$RUNNING" -eq 4 ]; then
    echo -e "${GREEN}All 4 containers running.${NC}"
else
    echo -e "${RED}Expected 4 containers, got ${RUNNING}. Check logs:${NC}"
    echo "  docker-compose logs"
    exit 1
fi

echo ""
echo "========================================"
echo -e "${GREEN}Setup complete!${NC}"
echo "========================================"
echo ""
echo "DNS: Create A records pointing to this server:"
echo "  ${API_DOMAIN} → $(curl -s ifconfig.me)"
echo "  ${OLLAMA_DOMAIN} → $(curl -s ifconfig.me)"
echo ""
echo "Test endpoints (after DNS propagates):"
echo "  curl -u ${API_USER}:yourpassword https://${API_DOMAIN}/health"
echo "  curl -u ${API_USER}:yourpassword https://${OLLAMA_DOMAIN}/api/tags"
echo ""
echo "Logs:"
echo "  docker-compose logs -f"
