import sys
import os

project_root = os.path.dirname(os.path.abspath(__file__))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

try:
    # Itt importáljuk be az alkalmazást, amit a Vercel keres
    from my_app.backend.app import app, db
    from my_app.backend.models import User
except ImportError as e:
    sys.exit(1)

# Opcionális: Ha a Vercel induláskor le akarja futtatni az adatbázis táblák létrehozását,
# azt biztonságosan megteheti itt vagy a gyári app induláskor is.
with app.app_context():
    try:
        db.create_all()
    except Exception:
        pass  # Ha read-only a fájlrendszer vagy épp migration fut, ne omoljon össze

if __name__ == "__main__":
    # Ez csak akkor fut le, amikor lokálisan indítod a gépeden (pl. python run.py)
    with app.app_context():
        db.create_all()
        if not User.query.first():
            test_user = User()
            db.session.add(test_user)
            db.session.commit()

    app.run(debug=True, port=5000)
