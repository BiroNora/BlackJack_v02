import pytest
from datetime import datetime, timezone
from my_app.backend.app import app as flask_app, db
from my_app.backend.app import User
from my_app.backend.game import Game
from my_app.backend.services.user_service import UserService
from werkzeug.security import generate_password_hash

@pytest.fixture
def app():
    """Biztosítja a Flask alkalmazás példányt a tesztekhez in-memory adatbázissal."""
    flask_app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"
    })
    yield flask_app

@pytest.fixture
def db_session(app):
    """Létrehoz egy tiszta, izolált adatbázist minden egyes teszthez."""
    with app.app_context():
        db.create_all()
        yield db.session
        db.session.remove()
        db.drop_all()

@pytest.fixture
def user_service(db_session):
    return UserService(db_session)


def test_register_new_user(user_service, db_session):
    # Teszteljük a sima regisztrációt vendég fiók nélkül
    user = user_service.handle_user_auth(
        email="test@example.com",
        username="testuser1",
        password="securepassword123",
        is_login=False
    )

    assert user is not None
    assert user.email == "test@example.com"
    assert user.user_name == "testuser1"
    assert user.is_guest is False
    assert user.current_game_state is not None


def test_login_success(user_service, db_session):
    # Először létrehozunk egy teljes körűen kitöltött felhasználót kézzel az adatbázisban a CheckConstraint miatt
    hashed_pw = generate_password_hash("mypassword")
    db_user = User(
        email="login@example.com",
        user_name="loginuser",
        password_hash=hashed_pw,
        is_guest=False
    )
    db_session.add(db_user)
    db_session.commit()

    # Majd teszteljük a bejelentkezést
    logged_in_user = user_service.handle_user_auth(
        email="login@example.com",
        username="loginuser",
        password="mypassword",
        is_login=True
    )

    assert logged_in_user is not None
    assert logged_in_user.id == db_user.id
    assert logged_in_user.is_guest is False


def test_login_invalid_credentials(user_service, db_session):
    hashed_pw = generate_password_hash("correctpassword")
    db_user = User(
        email="fail@example.com",
        user_name="failuser",
        password_hash=hashed_pw,
        is_guest=False
    )
    db_session.add(db_user)
    db_session.commit()

    with pytest.raises(ValueError) as exc_info:
        user_service.handle_user_auth(
            email="fail@example.com",
            username="failuser",
            password="wrongpassword",
            is_login=True
        )

    assert str(exc_info.value) == "IC"


def test_register_duplicate_user(user_service, db_session):
    user_service.handle_user_auth(
        email="dup@example.com",
        username="dupuser",
        password="password123",
        is_login=False
    )

    with pytest.raises(ValueError) as exc_info:
        user_service.handle_user_auth(
            email="dup@example.com",
            username="dupuser",
            password="password123",
            is_login=False
        )

    assert str(exc_info.value) == "UAE"

def test_register_conflict_email_or_username(user_service, db_session):
    # 1. Létrehozunk egy alap felhasználót
    user_service.handle_user_auth(
        email="elso@example.com",
        username="elso_user",
        password="password123",
        is_login=False
    )

    # 2. Megpróbálunk regisztrálni UGYANASSAL az emaillel, de MÁS névvel -> konfliktusnak kell lennie
    with pytest.raises(ValueError) as exc_info:
        user_service.handle_user_auth(
            email="elso@example.com",
            username="masodik_user",
            password="password123",
            is_login=False
        )
    assert str(exc_info.value) == "UAE"  # Vagy amit a UserService ad ilyenkor hibakódként

    # 3. Megpróbálunk regisztrálni MÁS emaillel, de MÁR FOGLALT névvel -> szintén konfliktus
    with pytest.raises(ValueError) as exc_info:
        user_service.handle_user_auth(
            email="masodik@example.com",
            username="elso_user",
            password="password123",
            is_login=False
        )
    assert str(exc_info.value) == "UAE"
