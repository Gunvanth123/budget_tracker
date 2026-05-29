import os
import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.db import get_db
from app.models.models import User
from app.services.auth import get_current_user
from app.schemas.schemas import RecommendationRequest, RecommendationItem

router = APIRouter()

# TMDB Genre mappings
GENRE_MAP = {
    # Movie genres
    28: "Action",
    12: "Adventure",
    16: "Animation",
    35: "Comedy",
    80: "Crime",
    99: "Documentary",
    18: "Drama",
    10751: "Family",
    14: "Fantasy",
    36: "History",
    27: "Horror",
    10402: "Music",
    9648: "Mystery",
    10749: "Romance",
    878: "Sci-Fi",
    10770: "TV Movie",
    53: "Thriller",
    10752: "War",
    37: "Western",
    # TV genres (some duplicates or unique)
    10759: "Action & Adventure",
    10762: "Kids",
    10763: "News",
    10764: "Reality",
    10765: "Sci-Fi & Fantasy",
    10766: "Soap",
    10767: "Talk",
    10768: "War & Politics"
}

LANGUAGES = {
    "en": "English",
    "ja": "Japanese",
    "ko": "Korean",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "zh": "Chinese",
    "cn": "Chinese",
    "hi": "Hindi",
    "ru": "Russian",
    "pt": "Portuguese",
    "ta": "Tamil",
    "te": "Telugu"
}

@router.post("/", response_model=List[RecommendationItem])
async def get_recommendation(
    req: RecommendationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    api_key = os.getenv("TMDB_API_KEY") or "a88ceb5966b80295efceb4520b7f61c1"
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="TMDB API key not configured. Please add TMDB_API_KEY to environment variables."
        )

    # Determine query and media type
    query = req.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    media_type_filter = req.media_type.lower() if req.media_type else "movie"

    # TMDB search endpoints
    async with httpx.AsyncClient() as client:
        try:
            if media_type_filter == "movie":
                url = "https://api.themoviedb.org/3/search/movie"
                params = {"api_key": api_key, "query": query, "language": "en-US", "page": 1}
                response = await client.get(url, params=params, timeout=15.0)
            elif media_type_filter in ["tv", "show"]:
                url = "https://api.themoviedb.org/3/search/tv"
                params = {"api_key": api_key, "query": query, "language": "en-US", "page": 1}
                response = await client.get(url, params=params, timeout=15.0)
            else: # "anime" or "all"
                url = "https://api.themoviedb.org/3/search/multi"
                params = {"api_key": api_key, "query": query, "language": "en-US", "page": 1}
                response = await client.get(url, params=params, timeout=15.0)

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"TMDB API error: {response.text}"
                )

            data = response.json()
            results = data.get("results", [])
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to communicate with TMDB: {str(e)}"
            )

    # Filter and map results (Limit to top 10)
    recommendations = []
    cached_count = 0

    for item in results:
        if cached_count >= 10:
            break

        # If searching multi, check media type is movie or tv
        item_media_type = item.get("media_type", media_type_filter)
        if item_media_type not in ["movie", "tv"]:
            continue

        # Get Title/Name
        title = item.get("title") if item_media_type == "movie" else item.get("name")
        if not title:
            continue

        # Check if anime is requested but this item isn't animated
        genre_ids = item.get("genre_ids", [])
        is_animation = 16 in genre_ids
        if media_type_filter == "anime" and not is_animation:
            continue

        # Language mapping
        lang_code = item.get("original_language", "en")
        language_name = LANGUAGES.get(lang_code, lang_code.upper())

        # Ratings
        vote_average = item.get("vote_average", 0.0)
        # Scaled to 0-5 popcorn rating (clamped)
        scaled_rating = round(min(5.0, max(0.0, vote_average / 2.0)), 1)

        # Genres
        genres_list = [GENRE_MAP.get(gid, "Other") for gid in genre_ids if gid in GENRE_MAP]
        if not genres_list:
            genres_list = ["Other"]
        genres_str = ", ".join(genres_list)

        # Overview
        overview = item.get("overview", "")

        # Poster Path
        poster_path = item.get("poster_path")
        poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None

        # Resolve category for PopcornEntry
        if is_animation:
            category = "Anime movie" if item_media_type == "movie" else "Anime series"
        else:
            category = "Movies" if item_media_type == "movie" else "TV show"

        # Add to the returned response list
        recommendations.append(
            RecommendationItem(
                title=title,
                language=language_name,
                imdb_rating=vote_average,
                genres=genres_list,
                media_type=item_media_type,
                overview=overview,
                poster_path=poster_url
            )
        )
        cached_count += 1

    return recommendations
