#!/bin/bash
# Create bootable Ubuntu 22.04 LTS USB drive (macOS)
# Usage: ./create-ubuntu-usb.sh

set -e

ISO_URL="https://releases.ubuntu.com/22.04.4/ubuntu-22.04.4-live-server-amd64.iso"
ISO_FILE="$HOME/Downloads/ubuntu-22.04.4-live-server-amd64.iso"

echo "=========================================="
echo "  Ubuntu 22.04 LTS USB Creator (macOS)"
echo "=========================================="
echo ""

# Step 1: Download ISO if not exists
if [ -f "$ISO_FILE" ]; then
    echo "[✓] ISO already downloaded: $ISO_FILE"
else
    echo "[*] Downloading Ubuntu 22.04 LTS Server ISO (~2GB)..."
    curl -L -o "$ISO_FILE" "$ISO_URL"
    echo "[✓] Download complete"
fi

# Step 2: List available disks
echo ""
echo "[*] Available disks:"
echo "----------------------------------------"
diskutil list external
echo "----------------------------------------"
echo ""

# Step 3: Ask user to identify USB drive
read -p "Enter the USB disk identifier (e.g., disk2): " DISK_ID

if [ -z "$DISK_ID" ]; then
    echo "[!] No disk specified. Exiting."
    exit 1
fi

# Validate disk exists
if ! diskutil info "/dev/$DISK_ID" &>/dev/null; then
    echo "[!] Disk /dev/$DISK_ID not found. Exiting."
    exit 1
fi

# Get disk info for confirmation
DISK_SIZE=$(diskutil info "/dev/$DISK_ID" | grep "Disk Size" | awk -F: '{print $2}' | xargs)
DISK_NAME=$(diskutil info "/dev/$DISK_ID" | grep "Device / Media Name" | awk -F: '{print $2}' | xargs)

echo ""
echo "=========================================="
echo "  WARNING: ALL DATA WILL BE ERASED!"
echo "=========================================="
echo "  Disk: /dev/$DISK_ID"
echo "  Name: $DISK_NAME"
echo "  Size: $DISK_SIZE"
echo "=========================================="
echo ""
read -p "Type 'YES' to confirm and continue: " CONFIRM

if [ "$CONFIRM" != "YES" ]; then
    echo "[!] Aborted."
    exit 1
fi

# Step 4: Unmount the disk
echo ""
echo "[*] Unmounting /dev/$DISK_ID..."
diskutil unmountDisk "/dev/$DISK_ID"

# Step 5: Write ISO to USB (using raw disk for speed)
RAW_DISK="/dev/r$DISK_ID"
echo "[*] Writing ISO to USB (this will take 5-10 minutes)..."
echo "[*] You may be prompted for your password..."
echo ""

sudo dd if="$ISO_FILE" of="$RAW_DISK" bs=4m status=progress

# Step 6: Eject
echo ""
echo "[*] Ejecting disk..."
diskutil eject "/dev/$DISK_ID"

echo ""
echo "=========================================="
echo "  [✓] USB drive ready!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Insert USB into your GPU server"
echo "  2. Boot from USB (F12/F2/Del at startup)"
echo "  3. Install Ubuntu Server"
echo "  4. Run the Ollama setup script after install"
echo ""
