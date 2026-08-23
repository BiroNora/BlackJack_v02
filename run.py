import sys
import os

project_root = os.path.dirname(os.path.abspath(__file__))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

try:
    from my_app.backend.app import app, db
    from my_app.backend.models import User
except ImportError as e:
    # Ez a hiba akkor jön elő, ha az app, db, vagy User hiányzik az app.py-ból.
    print(f"Kritikus hiba az importálás során: {e}")
    print(
        "Ellenőrizd, hogy a my_app.backend.app tartalmazza-e az 'app', 'db' és 'User' objektumok definícióját."
    )
    sys.exit(1)

if __name__ == "__main__":
    # 3.1. Adatbázis inicializálás és Tesztfelhasználó létrehozás
    # A db.create_all() és a lekérdezések csak app_context-ben futtathatók.
    with app.app_context():

        # Létrehozza az adatbázis tábláit (ha még nincsenek)
        db.create_all()
        print("Adatbázis táblák ellenőrizve/létrehozva (fejlesztési mód).")

        # Tesztfelhasználó létrehozása (ha még nincs a DB-ben)
        if not User.query.first():
            test_user = User()
            db.session.add(test_user)
            db.session.commit()
            print(
                f"Létrehozva egy inicializált felhasználó ezzel az azonosítóval: {test_user.id}"
            )

    # 3.2. A Flask alkalmazás futtatása
    app.run(debug=True, port=5000)
