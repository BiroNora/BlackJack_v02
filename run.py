import sys
import os

project_root = os.path.dirname(os.path.abspath(__file__))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Itt közvetlenül a gyökérben exportáljuk az 'app'-ot, amit a Vercel keres
from my_app.backend.app import app, db
from my_app.backend.models import User

# Opcionális: Ha indításkor le kell futnia az adatbázis tábla létrehozásnak
with app.app_context():
    try:
        db.create_all()
    except Exception:
        pass

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        if not User.query.first():
            test_user = User()
            db.session.add(test_user)
            db.session.commit()

    app.run(debug=True, port=5000)
