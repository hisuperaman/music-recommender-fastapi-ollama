from fastapi import APIRouter, Request, Depends
from db import users_collection, likes_collection, history_collection, user_preferences_collection, playlists_collection
from models.user import UserCreate
from fastapi.responses import StreamingResponse
import requests
import json
from routes.auth import manager
from dotenv import load_dotenv
import os
import pickle
from datetime import date
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity

router = APIRouter()


df = pickle.load(open("df.pkl", "rb"))
combined_similarity = pickle.load(open("combined_similarity.pkl", "rb"))


@router.get("/get-today-picks")
async def get_today_picks(req: Request, current_user: dict = Depends(manager)):
    popular_songs_df = df.sort_values(by='Popularity', ascending=False)
    seed = int(date.today().strftime("%Y%m%d"))
    random_songs = popular_songs_df.sample(n=20, random_state=seed)

    recommendations = []
    for _, row in random_songs.iterrows():
        song = row['song']
        artist = row['Artist(s)']
        track_data = await get_track_details(row, current_user['email'])
        if track_data:
            recommendations.append(track_data)

    return {"recommendations": recommendations}


@router.get("/get-liked-songs")
async def get_liked_songs(req: Request, current_user: dict = Depends(manager)):
    likes = await likes_collection.find({"user_email": current_user['email']}).sort("liked_at", -1).to_list(100)
    
    likedSongs = []
    for like in likes:
        song = like['track_name']
        artist = like['artists']
        row = df[
            (df['song'].str.strip().str.lower() == song.strip().lower()) &  # Normalize and compare song
            (df['Artist(s)'].str.strip().str.lower() == artist.strip().lower())  # Normalize and compare artist
        ]
        track_data = await get_track_details(row, current_user['email'])
        if track_data:
            likedSongs.append(track_data)

    return {"likedSongs": likedSongs}


@router.get("/get-history-songs")
async def get_history_songs(req: Request, current_user: dict = Depends(manager)):
    history = await history_collection.find({"user_email": current_user['email']}).sort("played_at", -1).to_list(100)

    historySongs = []
    for his in history:
        song = his['track_name']
        artist = his['artists']
        row = df[
            (df['song'].str.strip().str.lower() == song.strip().lower()) &  # Normalize and compare song
            (df['Artist(s)'].str.strip().str.lower() == artist.strip().lower())  # Normalize and compare artist
        ]
        track_data = await get_track_details(row, current_user['email'])
        if track_data:
            historySongs.append(track_data)

    return {"historySongs": historySongs}



@router.get("/get-recommended-for-you")
async def get_recommended_for_you(req: Request, current_user: dict = Depends(manager)):
    top_n = 20
    # Normalize song names (strip spaces and lower case)
    user_history = await history_collection.find({'user_email': current_user['email']}, projection={'track_name': 1}).sort("played_at", -1).to_list(100)
    liked_songs = await likes_collection.find({'user_email': current_user['email']}, projection={'track_name': 1}).sort("liked_at", -1).to_list(100)
    
    user_history = [doc['track_name'].strip().lower() for doc in user_history]
    liked_songs = [doc['track_name'].strip().lower() for doc in liked_songs]

    all_known = user_history + liked_songs

    # Clean the song names in the dataframe
    # df['song_clean'] = df['song'].str.strip().str.lower()

    # Find indices for songs in user history and liked songs
    indices = []
    for song in all_known:
        if song in df['song_clean'].values:
            idx = df[df['song_clean'] == song].index[0]
            indices.append(idx)

    if not indices:
        print("No matching songs found in dataset.")
        return {"recommendations": []}

    # Create a user profile using combined similarity
    user_profile = combined_similarity[indices].mean(axis=0)
    scores = list(enumerate(user_profile))
    scores = sorted(scores, key=lambda x: x[1], reverse=True)

    # Collect the recommendations
    recommendations = []
    for idx, score in scores:
        song = df.iloc[idx]['song']
        artist = df.iloc[idx]['Artist(s)']
        if df.iloc[idx]['song_clean'] not in all_known:
            row = df[
                (df['song'].str.strip().str.lower() == song.strip().lower()) &  # Normalize and compare song
                (df['Artist(s)'].str.strip().str.lower() == artist.strip().lower())  # Normalize and compare artist
            ]
            track_data = await get_track_details(row, current_user['email'])
            if track_data:
                recommendations.append(track_data)
        if len(recommendations) == top_n:
            break

    return {"recommendations": recommendations}



@router.get("/get-your-vibes-songs")
async def recommend_songs_by_vibes(req: Request, current_user: dict = Depends(manager)):
    vibes = await user_preferences_collection.find_one({'user_email': current_user['email']})
    top_n=20

    if vibes is None:
        return {"recommendations": []}

    fav_genre = vibes["favorite_genre"].strip().lower().replace(" ", "")
    emotion = vibes["dominant_emotion"]
    tempo = vibes["avg_tempo"]
    energy = vibes["avg_energy"]
    valence = vibes["avg_positiveness"]

    df['genre_clean'] = df['Genre'].fillna('').str.lower().str.replace(" ", "")
    df['song_clean'] = df['song'].str.strip().str.lower()

    filtered_df = df[
        df['genre_clean'].str.contains(fav_genre) &
        (df['emotion'] == emotion) &
        df['Tempo'].between(tempo - 0.1, tempo + 0.1) &
        df['Energy'].between(energy - 15, energy + 15) &
        df['Positiveness'].between(valence - 15, valence + 15)
    ]

    recommendations = []
    for _, row in filtered_df.iterrows():
        song = row['song']
        artist = row['Artist(s)']
        track_data = await get_track_details(row, current_user['email'])
        if track_data:
            recommendations.append(track_data)
        if len(recommendations) == top_n:
            break

    return {"recommendations": recommendations}




def collaborative_filtering(df_likes, top_n=10):
    if df_likes.empty or 'user_email' not in df_likes.columns or 'track_name' not in df_likes.columns:
        return lambda user_email: []

    user_item_matrix = df_likes.pivot_table(index='user_email', columns='track_name', aggfunc='size', fill_value=0)

    similarity = cosine_similarity(user_item_matrix.T)
    similarity_df = pd.DataFrame(similarity, index=user_item_matrix.columns, columns=user_item_matrix.columns)

    def recommend_for_user(user_email):
        if user_email not in user_item_matrix.index:
            return []  # New user, no recommendations yet

        user_ratings = user_item_matrix.loc[user_email]
        liked_songs = user_ratings[user_ratings > 0].index

        if liked_songs.empty:
            return []  # User has not liked any songs

        scores = similarity_df[liked_songs].sum(axis=1)
        scores = scores.drop(labels=liked_songs)
        recommended = scores.sort_values(ascending=False).head(top_n)

        rec_df = df_likes[df_likes['track_name'].isin(recommended.index)][['track_name', 'artists']].drop_duplicates()

        return rec_df.rename(columns={'track_name': 'song', 'artists': 'Artist(s)'}).to_dict(orient='records')

    return recommend_for_user


@router.get("/get-others-also-liked")
async def recommend_songs_collaborative(req: Request, current_user: dict = Depends(manager)):
    likes = await likes_collection.find({}, {'_id': 0}).sort('liked_at', -1).to_list(100)
    df_likes = pd.DataFrame(list(likes))
    recommender = collaborative_filtering(df_likes)
    recommended = recommender(current_user['email'])

    othersAlsoLikedSongs = []
    for s in recommended:
        song = s['song']
        artist = s['Artist(s)']
        row = df[
            (df['song'].str.strip().str.lower() == song.strip().lower()) &  # Normalize and compare song
            (df['Artist(s)'].str.strip().str.lower() == artist.strip().lower())  # Normalize and compare artist
        ]
        track_data = await get_track_details(row, current_user['email'])
        if track_data:
            othersAlsoLikedSongs.append(track_data)

    return {"othersAlsoLikedSongs": othersAlsoLikedSongs}




@router.get("/get-playlists")
async def get_playlists(current_user: dict = Depends(manager)):
    playlists = await playlists_collection.aggregate([
        {"$match": {"user_email": current_user['email']}},
        {"$sort": {"created_at": -1}},
        {
            "$project": {
                "_id": 0,
                "name": 1,
                "tracks": {"$slice": ["$tracks", -4]},
                "total_tracks": {"$size": "$tracks"}
            }
        }
    ]).to_list(100)
    
    for i in range(len(playlists)):
        full_track_data = []
        for s in playlists[i]['tracks']:
            song = s['track_name']
            artist = s['artists']
            row = df[
                (df['song'].str.strip().str.lower() == song.strip().lower()) &  # Normalize and compare song
                (df['Artist(s)'].str.strip().str.lower() == artist.strip().lower())  # Normalize and compare artist
            ]
            track_data = await get_track_details(row, current_user['email'])
            if track_data:
                full_track_data.append(track_data)

        playlists[i]['tracks'] = full_track_data
    return {'playlists': playlists}


@router.get("/get-playlist-tracks")
async def get_playlist_tracks(playlist_name: str, current_user: dict = Depends(manager)):
    playlist = await playlists_collection.find_one({ "user_email": current_user['email'], "name": playlist_name }, {'_id': 0})
    
    full_track_data = []
    for s in playlist['tracks']:
        song = s['track_name']
        artist = s['artists']
        row = df[
            (df['song'].str.strip().str.lower() == song.strip().lower()) &  # Normalize and compare song
            (df['Artist(s)'].str.strip().str.lower() == artist.strip().lower())  # Normalize and compare artist
        ]
        track_data = await get_track_details(row, current_user['email'])
        if track_data:
            full_track_data.append(track_data)

    playlist['tracks'] = full_track_data
    
    return {'tracks': playlist['tracks']}



@router.get("/search-tracks")
async def search_tracks(
    query: str,
    filter_by: str,
    page: int = 1,
    limit: int = 20,
    current_user: dict = Depends(manager)
):
    filter_map = {
        "song": "song",
        "artist": "Artist(s)",
        "genre": "Genre",
        "album": "album",
        "mood": "emotion"
    }

    if filter_by not in filter_map:
        return {"error": "Invalid filter."}

    column = filter_map[filter_by]
    start = (page - 1) * limit
    end = start + limit

    filtered_df = df[df[column].str.contains(query, case=False, na=False)]
    paginated_df = filtered_df.iloc[start:end]

    results = []
    for _, row in paginated_df.iterrows():
        track_data = await get_track_details(row, current_user['email'])
        if track_data:
            results.append(track_data)

    return {
        "searchResults": results,
        "total_results": len(filtered_df),
        "page": page,
        "limit": limit
    }


# helpers
from collections import Counter
def get_user_preferences_util(songs):
    normalized_names = set(name.strip().lower() for name in songs)
    df_local = df[df['song'].str.strip().str.lower().isin(normalized_names)]

    if df_local.empty:
        return {}

    all_genres = []
    for val in df_local['Genre'].dropna():
        genres = [g.strip().lower() for g in val.split(',')]
        all_genres.extend(genres)

    all_emotions = [e.strip().lower() for e in df_local['emotion'].dropna()]
        
    favorite_genre = Counter(all_genres).most_common(1)[0][0] if all_genres else None
    dominant_emotion = Counter(all_emotions).most_common(1)[0][0] if all_emotions else None

    return {
        "favorite_genre": favorite_genre,
        "dominant_emotion": dominant_emotion,
        "avg_tempo": df_local['Tempo'].mean(),
        "avg_energy": df_local['Energy'].mean(),
        "avg_positiveness": df_local['Positiveness'].mean()
    }




async def get_track_details(row, email: str):
    # Check if the song is liked by the user
    if row.empty:
        return None  # or {}

    columns = ['Artist(s)', 'song', 'album', 'release_date', 'spotify_url', 'cover_image']
    
    data = row[columns].to_dict()

    def normalize_nested(value):
        if isinstance(value, dict):
            return list(value.values())[0]  # Extract the value of the dictionary
        return value

    # Apply the normalization to each field in the data
    data = {key: normalize_nested(value) for key, value in data.items()}


    in_playlist = await playlists_collection.find_one({
        "user_email": email,
        "tracks": {
            "$elemMatch": {
                "track_name": data["song"].strip().lower(),
                "artists": data["Artist(s)"].strip().lower()
            }
        }
    }) is not None


    liked = False
    like_data = await likes_collection.find_one({"user_email": email, "track_name": data["song"].strip().lower(), "artists": data["Artist(s)"].strip().lower()})
    if like_data:
        liked = True

    return {
        "track_name": data['song'],
        "artist": data['Artist(s)'],
        "album": data['album'],
        "release_date": data['release_date'],
        "spotify_url": data['spotify_url'],
        "cover_image": data['cover_image'] if data['cover_image'] else None,
        "liked": liked,
        "in_playlist": in_playlist
    }
