
import shutil
import os
from datetime import datetime

source = "sl_enterprise.db"
backup_dir = "backups"
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
destination = os.path.join(backup_dir, f"sl_enterprise_pre_migration_{timestamp}.db")

if not os.path.exists(backup_dir):
    os.makedirs(backup_dir)

if os.path.exists(source):
    shutil.copy2(source, destination)
    print(f"Backup created: {destination}")
else:
    print(f"Source file {source} not found.")
