"""Password hashing helpers (stdlib-only PBKDF2-HMAC-SHA256)."""

import hashlib
import hmac
import secrets

_ITERATIONS = 600_000
_SALT_BYTES = 16


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(_SALT_BYTES)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, _ITERATIONS
    )
    return (
        f"pbkdf2_sha256${_ITERATIONS}"
        f"${salt.hex()}${digest.hex()}"
    )


def verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, iterations, salt_hex, digest_hex = password_hash.split("$")
    except ValueError:
        return False

    if algorithm != "pbkdf2_sha256":
        return False

    try:
        iterations_int = int(iterations)
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(digest_hex)
    except ValueError:
        return False

    candidate = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, iterations_int
    )
    return hmac.compare_digest(candidate, expected)
