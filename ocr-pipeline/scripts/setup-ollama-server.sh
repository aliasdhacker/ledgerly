#!/bin/bash
# Ollama GPU Server Setup Script for Ubuntu 22.04 + NVIDIA 3080
# Run this AFTER Ubuntu installation
# Usage: curl -fsSL <your-url>/setup-ollama-server.sh | bash

set -e

echo "=========================================="
echo "  Ollama GPU Server Setup (3080)"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "[!] Don't run as root. Run as your normal user."
    exit 1
fi

# Step 1: Update system
echo "[1/7] Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Step 2: Install NVIDIA drivers
echo "[2/7] Installing NVIDIA drivers..."
sudo apt install -y nvidia-driver-545

# Step 3: Install Ollama
echo "[3/7] Installing Ollama..."
curl -fsSL https://ollama.com/install.sh | sh

# Step 4: Configure Ollama for network access
echo "[4/7] Configuring Ollama for network access..."
sudo mkdir -p /etc/systemd/system/ollama.service.d
sudo tee /etc/systemd/system/ollama.service.d/override.conf > /dev/null << 'EOF'
[Service]
Environment="OLLAMA_HOST=0.0.0.0"
Environment="OLLAMA_NUM_PARALLEL=4"
Environment="OLLAMA_MAX_LOADED_MODELS=1"
EOF

sudo systemctl daemon-reload
sudo systemctl enable ollama
sudo systemctl restart ollama

# Step 5: Open firewall
echo "[5/7] Configuring firewall..."
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 11434/tcp # Ollama
sudo ufw --force enable

# Step 6: Pull the model (after reboot for GPU access)
echo "[6/7] Creating model pull script..."
cat > ~/pull-models.sh << 'EOF'
#!/bin/bash
echo "Pulling llama3.1:8b (this may take a few minutes)..."
ollama pull llama3.1:8b
echo ""
echo "Verifying GPU acceleration..."
nvidia-smi
echo ""
echo "Testing model..."
curl -s http://localhost:11434/api/generate -d '{"model":"llama3.1:8b","prompt":"Say hello","stream":false}' | head -c 200
echo ""
echo ""
echo "[✓] Setup complete! Your Ollama server is ready."
echo ""
echo "Server URL: http://$(hostname -I | awk '{print $1}'):11434"
EOF
chmod +x ~/pull-models.sh

# Step 7: Get IP address
IP_ADDR=$(hostname -I | awk '{print $1}')

echo ""
echo "=========================================="
echo "  [✓] Initial Setup Complete!"
echo "=========================================="
echo ""
echo "IMPORTANT: Reboot required for GPU drivers!"
echo ""
echo "After reboot, run:"
echo "  ~/pull-models.sh"
echo ""
echo "Your Ollama URL will be:"
echo "  http://$IP_ADDR:11434"
echo ""
echo "On your Mac, update .env:"
echo "  OLLAMA_URL=http://$IP_ADDR:11434"
echo ""
read -p "Reboot now? (y/n): " REBOOT
if [ "$REBOOT" = "y" ]; then
    sudo reboot
fi
