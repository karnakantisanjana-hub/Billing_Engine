"""
Language & Translation API Endpoints
-------------------------------------
GET  /api/languages                     — List all available languages
GET  /api/languages/{code}/translations — Get all translations for a language
GET  /api/languages/translate           — Get translations for specific keys in a language
GET  /api/languages/user-preference     — Get current user's preferred language
PUT  /api/languages/user-preference     — Set current user's preferred language
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from app.database import get_db
from app.models import Language, Translation, UserPreference, User
from app.auth import get_current_user, require_user

router = APIRouter(prefix="/api/languages", tags=["Languages"])


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class LanguageResponse(BaseModel):
    code: str
    name: str
    native_name: str
    flag_emoji: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


class TranslationItem(BaseModel):
    key: str
    value: str
    category: Optional[str] = None


class SetLanguageRequest(BaseModel):
    language_code: str


# ============================================================================
# 1. GET /api/languages — List all available languages
# ============================================================================

@router.get("/", response_model=list[LanguageResponse])
def get_languages(db: Session = Depends(get_db)):
    """Return all active languages."""
    languages = db.query(Language).filter(Language.is_active == True).order_by(Language.name).all()
    return languages


# ============================================================================
# 2. GET /api/languages/{code}/translations — Get all translations for a language
# ============================================================================

@router.get("/{code}/translations")
def get_language_translations(
    code: str,
    category: Optional[str] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db)
):
    """Return all translations for the given language code."""
    lang = db.query(Language).filter(Language.code == code).first()
    if not lang:
        raise HTTPException(status_code=404, detail=f"Language '{code}' not found")

    query = db.query(Translation).filter(Translation.language_code == code)
    if category:
        query = query.filter(Translation.category == category)

    translations = query.all()
    return {
        "language_code": code,
        "language_name": lang.name,
        "native_name": lang.native_name,
        "translations": [
            {"key": t.key, "value": t.value, "category": t.category}
            for t in translations
        ]
    }


# ============================================================================
# 3. GET /api/languages/translate — Get translations for specific keys
# ============================================================================

@router.get("/translate")
def get_translations(
    language_code: str = Query("en", description="Language code"),
    keys: Optional[str] = Query(None, description="Comma-separated keys"),
    category: Optional[str] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db)
):
    """Return translations for specific keys or an entire category."""
    query = db.query(Translation).filter(Translation.language_code == language_code)

    if category:
        query = query.filter(Translation.category == category)
    elif keys:
        key_list = [k.strip() for k in keys.split(",")]
        query = query.filter(Translation.key.in_(key_list))

    translations = query.all()
    return {
        "language_code": language_code,
        "translations": {t.key: t.value for t in translations}
    }


# ============================================================================
# 4. GET /api/languages/user-preference — Get user's preferred language
# ============================================================================

@router.get("/user-preference")
def get_user_language_preference(
    user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Get the current user's preferred language."""
    pref = db.query(UserPreference).filter(UserPreference.user_id == user.id).first()
    if pref:
        lang = db.query(Language).filter(Language.code == pref.language_code).first()
        return {
            "language_code": pref.language_code,
            "language": {
                "code": lang.code if lang else "en",
                "name": lang.name if lang else "English",
                "native_name": lang.native_name if lang else "English",
                "flag_emoji": lang.flag_emoji if lang else "🇮🇳",
            } if lang else {"code": "en", "name": "English", "native_name": "English", "flag_emoji": "🇮🇳"}
        }
    return {
        "language_code": "en",
        "language": {"code": "en", "name": "English", "native_name": "English", "flag_emoji": "🇮🇳"}
    }


# ============================================================================
# 5. PUT /api/languages/user-preference — Set user's preferred language
# ============================================================================

@router.put("/user-preference")
def set_user_language_preference(
    request: SetLanguageRequest,
    user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Set the current user's preferred language."""
    # Validate language exists
    lang = db.query(Language).filter(Language.code == request.language_code, Language.is_active == True).first()
    if not lang:
        raise HTTPException(status_code=400, detail=f"Invalid language code: {request.language_code}")

    # Upsert preference
    pref = db.query(UserPreference).filter(UserPreference.user_id == user.id).first()
    if pref:
        pref.language_code = request.language_code
    else:
        pref = UserPreference(user_id=user.id, language_code=request.language_code)
        db.add(pref)

    db.commit()
    db.refresh(pref)

    return {
        "message": "Language preference updated",
        "language_code": request.language_code,
        "language": {
            "code": lang.code,
            "name": lang.name,
            "native_name": lang.native_name,
            "flag_emoji": lang.flag_emoji,
        }
    }
