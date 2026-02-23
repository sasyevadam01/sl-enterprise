from database import engine
from sqlalchemy import text
with engine.connect() as c:
    r = c.execute(text("SELECT id, username, full_name, role FROM users WHERE full_name LIKE '%Iasevoli%' OR full_name LIKE '%Esposito%'"))
    for x in r.fetchall():
        print(x)
