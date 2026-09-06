import uuid

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy import CheckConstraint

db = SQLAlchemy()
INITIAL_TOKENS = 1000


class User(db.Model):
    __tablename__ = "my_users"
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = db.Column(
        db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4())
    )
    is_guest = db.Column(db.Boolean, default=True, nullable=False)
    tokens = db.Column(db.Integer, default=INITIAL_TOKENS)

    email = db.Column(db.String(150), unique=True, nullable=True)
    user_name = db.Column(db.String(150), unique=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=True)

    current_game_state = db.Column(JSONB, nullable=True)
    idempotency_key = db.Column(db.String(36), nullable=True)
    last_activity = db.Column(
        db.TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        CheckConstraint(
            "(email IS NULL AND user_name IS NULL AND password_hash IS NULL) OR "
            "(email IS NOT NULL AND user_name IS NOT NULL AND password_hash IS NOT NULL)",
            name="check_credentials_required",
        ),
    )

    def __repr__(self):
        return f"<User {self.id[:8]} (Client: {self.client_id[:8]})>"

    def __repr__(self):
        return f"<User id={self.id}, email={self.email}, username={self.user_name}>"
