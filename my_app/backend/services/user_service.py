import re

from sqlalchemy import or_

from my_app.backend.app import User
from my_app.backend.game import Game
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.orm.attributes import flag_modified

from datetime import datetime, timedelta, timezone


class UserService:
    def __init__(self, db_session):
        self.db = db_session

    def handle_user_auth(
        self, email, username, password, is_login, current_user_id=None
    ):
        """
        Kezeli a felhasználó bejelentkezését vagy regisztrációját.
        """
        if is_login:
            # --- BEJELENTKEZÉS ---
            target_user = (
                self.db.query(User)
                .filter(or_(User.email == email, User.user_name == username))
                .first()
            )

            if not target_user or not check_password_hash(
                target_user.password_hash, password
            ):
                raise ValueError("IC")  # Invalid Credentials

            # Megvizsgáljuk, hogy van-e aktív vendég session (current_user_id),
            # és az eltér-e a célfióktól
            if current_user_id and current_user_id != target_user.id:
                session_user = self.db.query(User).get(current_user_id)

                if session_user and session_user.is_guest:
                    db_raw = target_user.current_game_state
                    session_raw = session_user.current_game_state

                    has_db_game = db_raw is not None and db_raw != {}
                    has_session_game = session_raw is not None and session_raw != {}

                    if has_db_game and has_session_game:
                        raise ValueError("CONFLICT")

                    # Ha a session-ben van játék, de a célfiókban NINCS,
                    # akkor simán átköltöztethetjük a session játékát a célfiókba, vagy összevonhatjuk
                    elif has_session_game and not has_db_game:
                        target_user.current_game_state = session_raw
                        flag_modified(target_user, "current_game_state")

            target_user.is_guest = False
            self.db.commit()

            return target_user

        else:
            # --- REGISZTRÁCIÓ ---
            if not username or not re.match(r"^[a-zA-Z0-9_]{3,30}$", username):
                raise ValueError("IU")  # Invalid Username format

            existing_user = (
                self.db.query(User)
                .filter(or_(User.email == email, User.user_name == username))
                .first()
            )

            if existing_user:
                raise ValueError("UAE")  # User Already Exists

            user = None
            if current_user_id:
                user = self.db.query(User).get(current_user_id)

            if user:
                # HA VAN MÁR SESSION: Frissítjük a meglévő vendég fiókot (megtartva a tokeneket és a játékállapotot!)
                user.email = email
                user.user_name = username
                user.password_hash = generate_password_hash(password)
                user.is_guest = False
            else:
                initial_game = Game()
                user = User(
                    email=email,
                    user_name=username,
                    password_hash=generate_password_hash(password),
                    is_guest=False,
                    current_game_state=initial_game.serialize(),
                )
                self.db.add(user)

            self.db.commit()

            return user

    def handle_check_session(self, session, request):
        """
        Ellenőrzi a session vagy süti alapján, hogy van-e aktív felhasználó.
        """
        user_id = session.get("user_id") or request.cookies.get("user_id")

        if not user_id:
            # print("68 NO USER!!!!!")
            return None

        return self.db.query(User).filter_by(id=user_id).first()

    def update_password(self, user, password: str):
        user.password_hash = generate_password_hash(password)
        self.db.commit()

    def get_user_by_identifier(self, identifier: str):
        if not identifier or not identifier.strip():
            raise ValueError("IC")

        identifier = identifier.strip()

        if "@" in identifier:
            user = self.db.query(User).filter_by(email=identifier).first()
        else:
            user = self.db.query(User).filter_by(user_name=identifier).first()

        if not user:
            raise ValueError("IC")

        return user

    def delete_old_guests(self):
        """
        Törli azokat a vendég fiókokat, amelyek 2 napnál régebben voltak aktívak.
        """
        # Kiszámoljuk a 2 nappal ezelőtti időpontot (timezone-aware módon)
        threshold = datetime.now(timezone.utc) - timedelta(days=2)

        # Lekérdezzük és töröljük a felesleges vendégeket
        deleted_count = (
            self.db.query(User)
            .filter(User.is_guest == True, User.last_activity < threshold)
            .delete(synchronize_session=False)
        )

        self.db.commit()
        return deleted_count

    def handle_conflict(self, current_user_id, target_user_id, version_new):
        """
        Kezeli a konfliktust a sessionben tárolt azonosítók alapján.
        :param version_new: True -> Az új (vendég session) játéka nyer, felülírja a célszámlát.
                            False -> A régi (célszámla) játéka marad, a vendég törlődik.
        """
        # régi mentett
        target_user = self.db.query(User).get(target_user_id)

        # jelenlegi
        session_user = (
            self.db.query(User).get(current_user_id) if current_user_id else None
        )

        if not target_user:
            raise ValueError("IC")

        if session_user and session_user.is_guest:
            if version_new:
                # 1. eset: Az új (vendég sessionben lévő) állapot nyer
                if session_user.current_game_state:
                    target_user.current_game_state = session_user.current_game_state
                    if hasattr(session_user, "tokens"):
                        target_user.tokens = session_user.tokens
                    flag_modified(target_user, "current_game_state")
            else:
                pass

        # Bármelyiket is választotta, a felesleges ideiglenes vendég fiókot mindkét esetben töröljük!
        self.db.delete(session_user)

        target_user.is_guest = False
        self.db.commit()

        return target_user

    def update_username(self, user, new_username):
        if (
            not new_username
            or not re.match(r"^[a-zA-Z0-9_]{3,25}$", new_username)
            or not user
        ):
            return None

        existing = self.db.query(User).filter(User.user_name == new_username).first()
        if existing and existing.id != user.id:
            return None

        user.user_name = new_username
        self.db.commit()

        return user
