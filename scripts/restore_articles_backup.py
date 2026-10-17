"""
Restoration script: Restores data/ppgscope.db and data/dashboard.json from full article backups.
Allows reverting to persistent article storage at any moment if requested by the user.
"""

import shutil
from pathlib import Path

def restore():
    repo_root = Path(__file__).resolve().parent.parent
    db_backup = repo_root / "data" / "ppgscope.backup_with_articles.db"
    db_target = repo_root / "data" / "ppgscope.db"
    json_backup = repo_root / "data" / "dashboard.backup_full.json"
    json_target = repo_root / "data" / "dashboard.json"
    web_target = repo_root / "web" / "public" / "data" / "dashboard.json"

    if db_backup.exists():
        shutil.copy2(db_backup, db_target)
        print(f"Przywrócono bazę danych: {db_target}")
    else:
        print("Brak pliku kopii zapasowej bazy danych!")

    if json_backup.exists():
        shutil.copy2(json_backup, json_target)
        shutil.copy2(json_backup, web_target)
        print(f"Przywrócono pliki JSON: {json_target} oraz {web_target}")
    else:
        print("Brak pliku kopii zapasowej dashboard.json!")

if __name__ == "__main__":
    restore()
