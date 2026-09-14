"""Cryptographic hashing, digests, and masking utilities."""

import hashlib
from pathlib import Path


def compute_sha256_bytes(data: bytes) -> str:
    """Computes SHA-256 hex digest of bytes."""
    return hashlib.sha256(data).hexdigest()


def compute_sha256_file(path: str | Path) -> str:
    """Computes SHA-256 hex digest of a file by reading chunks."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def hash_sensitive_value(value: str, salt: str = "") -> str:
    """Computes a one-way digest of a sensitive string for audit/manifests.
    
    Raw values are never stored in manifests or logs; only this digest is retained.
    """
    normalized = value.strip().encode("utf-8")
    if salt:
        normalized = salt.encode("utf-8") + b":" + normalized
    return hashlib.sha256(normalized).hexdigest()


def mask_string(value: str, entity_type: str = "", mask_char: str = "*") -> str:
    """Generates a structure-preserving masked representation of a sensitive value.

    Masking Contracts:
    - EMAIL_ADDRESS:
        * Preserves '@domain' part.
        * If user-part length >= 3: preserves first and last character of the user-part,
          replacing all intermediate characters with `mask_char` (1:1 length preserving).
          Example: 'alice.montgomery@example.com' -> 'a**************y@example.com'
                   'bob@example.com' -> 'b*b@example.com'
        * If user-part length == 2: preserves first and last character while inserting
          mask_char between them so the raw 2-character value is never exposed in the clear.
          Example: 'ab@example.com' -> 'a**b@example.com'
        * If user-part length == 1: preserves the initial character followed by mask chars.
          Example: 'a@example.com' -> 'a***@example.com'
        * If user-part is empty: replaces user-part with mask chars.
          Example: '@example.com' -> '***@example.com'
    - PHONE_NUMBER:
        * Preserves formatting and masks intermediate digits, keeping the first 2 digits
          and last 2 digits when length >= 7.
          Example: '+1-555-234-5678' -> '+1-5**-***-**78'
    - EMPLOYEE_ID:
        * Preserves prefix and masks suffix keeping the last 2 digits.
          Example: 'EMP-84920' -> 'EMP-***20'
    - GENERAL / Default:
        * If length <= 3, masks all characters.
        * If length > 3, preserves first and last character, masking intermediate characters.
          Example: 'Secret' -> 'S****t'
    """
    s = value.strip()
    if not s:
        return mask_char * 3

    if entity_type == "EMAIL_ADDRESS" and "@" in s:
        user_part, domain_part = s.split("@", 1)
        if not user_part:
            masked_user = mask_char * 3
        elif len(user_part) == 1:
            masked_user = user_part[0] + mask_char * 3
        elif len(user_part) == 2:
            masked_user = user_part[0] + (mask_char * 2) + user_part[1]
        else:
            masked_user = user_part[0] + (mask_char * (len(user_part) - 2)) + user_part[-1]
        return f"{masked_user}@{domain_part}"

    if entity_type == "PHONE_NUMBER":
        digits = [c for c in s if c.isdigit()]
        if len(digits) >= 7:
            # Mask middle digits
            res = []
            digit_idx = 0
            total_digits = len(digits)
            for c in s:
                if c.isdigit():
                    if 2 <= digit_idx < total_digits - 2:
                        res.append(mask_char)
                    else:
                        res.append(c)
                    digit_idx += 1
                else:
                    res.append(c)
            return "".join(res)

    if entity_type == "EMPLOYEE_ID" and "-" in s:
        prefix, suffix = s.split("-", 1)
        if len(suffix) > 2:
            return f"{prefix}-{(mask_char * (len(suffix) - 2))}{suffix[-2:]}"
        return f"{prefix}-{mask_char * len(suffix)}"

    # Default general masking: preserve first and last character if length > 3
    if len(s) <= 3:
        return mask_char * len(s)
    return s[0] + (mask_char * (len(s) - 2)) + s[-1]
