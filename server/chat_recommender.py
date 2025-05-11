from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain.schema.output_parser import StrOutputParser
from langchain_core.runnables import RunnableParallel

import pickle
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import nltk
from nltk.stem.porter import PorterStemmer
import numpy as np

from routes.music import get_track_details
from typing import AsyncGenerator

nltk.download('punkt')
stemmer = PorterStemmer()

def tokenization(txt):
    tokens = nltk.word_tokenize(txt)
    stemming = [stemmer.stem(w) for w in tokens]
    return " ".join(stemming)


from routes.music import df
tfidf = pickle.load(open("tfidf.pkl", "rb"))
tfidf_matrix = pickle.load(open("tfidf_matrix.pkl", "rb"))


llm = ChatOllama(
    model = "llama3.2",
)

sentiment_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", "You are a music assistant. Classify the user's sentiment as one of: sadness fear anger joy love surprise. Only reply with one of these."),
        ("human", "User input: '{text}'")
    ]
)

extract_song_title_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", "You are a helpful music assistant. Extract song_title from the User input, and return the song_title only."),
        ("human", "User input: {text}")
    ]
)
extract_artist_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", "You are a helpful music assistant. Extract artist from the User input, and return the artist only."),
        ("human", "User input: {text}")
    ]
)

description_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", "You are a helpful music assistant. Generate a description for the song. Focus on its emotional tone and musical style."),
        ("human", "Given song data:\n{song_data}")
    ]
)


sentiment_chain = sentiment_prompt | llm | StrOutputParser()

extract_song_title_chain = extract_song_title_prompt | llm | StrOutputParser()
extract_artist_chain = extract_artist_prompt | llm | StrOutputParser()
extract_song_title_artist_chain = RunnableParallel({
    "song_title": extract_song_title_chain,
    "artist": extract_artist_chain
})



playlist_intent_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a music assistant. Classify the user's intent as one of: emotion_recommendation or semantic_recommendation. Only reply with one of these."),
    ("human", "User input: '{text}'")
])
no_of_songs_prompt = ChatPromptTemplate.from_messages([
    ("system", 
 "You are a music assistant. Your task is to extract how many songs the user wants. The number may be written in words or digits, but you must return only a digit (e.g., 5, 10). If no number is mentioned, return 0. Do not return anything else."),
    ("human", "User input: '{text}'")
])

playlist_intent_chain = playlist_intent_prompt | llm | StrOutputParser()
no_of_songs_chain = no_of_songs_prompt | llm | StrOutputParser()

playlist_chain = RunnableParallel({
    'playlist_intent': playlist_intent_chain,
    'no_of_songs': no_of_songs_chain
})

intent_prompt = ChatPromptTemplate.from_messages([
   ("system", 
     "You are a music assistant. Classify the user's intent as exactly one of the following:\n"
     "emotion_recommendation: user expresses a feeling (e.g., 'I am sad')\n"
     "semantic_recommendation: user describes a situation, need, or theme (e.g., 'songs for a road trip')\n"
     "description: user asks for information about a specific song or artist (e.g., 'description of Hollow by Jelly Roll')\n"
     "playlist: user asks to generate or access a playlist\n\n"
     "Important: If the input mentions a song or artist directly and asks *about* it, classify as description. "
     "Always respond with one of these four labels only."),
    ("human", "User input: '{text}'")
])

intent_chain = intent_prompt | llm | StrOutputParser()


description_chain = description_prompt | llm | StrOutputParser()



llmify_prompt = ChatPromptTemplate.from_messages([
   ("system", 
     "You are a music assistant, you recommend music to users based on user input. Given the user input, and other processed information like recommendation type and track list. Return a response to the user input based on provided information. Just use the information provided to you only. Show the list of tracks also. Do not summarize or shorten the list .\n\nAvoid prefacing with generic phrases like 'Here is response based on user input'. \n\n Example:\nHere are recommended songs based on your ___ mood/semantics\n1. Track1\n2. Track2"),
    ("human", "User input: '{text}'\nRecommendation Type: '{recommendation_type}'\nResult Information: '{result}'")
])

llmify_chain = llmify_prompt | llm | StrOutputParser()

def get_semantic_matches(user_input, top_n=5):
    if(top_n==0):
        top_n = 5
    user_vec = tfidf.transform([tokenization(user_input)])

    sim_scores = cosine_similarity(user_vec, tfidf_matrix)  

    similarity_scores = list(enumerate(sim_scores[0]))
    similarity_scores = sorted(similarity_scores, key=lambda x: x[1], reverse=True)

    top_indices = [idx for idx, _ in similarity_scores[:top_n * 3]] 
    
    sampled_indices = np.random.choice(top_indices, size=top_n, replace=False) 

    return df.iloc[sampled_indices]


def get_songs_by_emotion(emotion, n=5):
    if n==0:
        n = 5
    matches = df[df['emotion'].str.lower() == emotion.lower()]
    shuffled_matches = matches.sample(frac=1).reset_index(drop=True) 
    return shuffled_matches.head(n)

def get_song_data(song_title, artist):
    match = df[(df['song'].str.lower() == song_title.lower()) & (df['Artist(s)'].str.lower() == artist.lower())]
    if not match.empty:
        row = match.iloc[0]
        return f"Title: {row['song']}, Artist: {row['Artist(s)']}, Album: {row['album']}, Genre: {row['Genre']}, text: {row['text']}, Emotion: {row['emotion']}"
    return None

async def get_emotion_recommendation_response(user_input, email, is_playlist):
    no_of_songs = no_of_songs_chain.invoke({'text': user_input}).strip()
    try:
        no_of_songs = int(no_of_songs)
    except:
        no_of_songs = 0

    sentiment = sentiment_chain.invoke({"text": user_input}).strip()
    tracks = get_songs_by_emotion(sentiment, no_of_songs)

    results = []
    for _, row in tracks.iterrows():
        track_data = await get_track_details(row, email)
        if track_data:
            results.append(track_data)


    result_message = "\n".join([f"{t['track_name']} by {t['artist']}" for t in results])
    message = llmify_chain.invoke({'text': user_input, 'recommendation_type': f'sentiment({sentiment})', 'result': result_message})

    return {
        "message": message,
        "results": results,
        "is_playlist": is_playlist
    }

async def get_semantic_recommendation_response(user_input, email, is_playlist):
    no_of_songs = no_of_songs_chain.invoke({'text': user_input}).strip()
    try:
        no_of_songs = int(no_of_songs)
    except:
        no_of_songs = 0
    
    tracks = get_semantic_matches(user_input, no_of_songs)

    results = []
    for _, row in tracks.iterrows():
        track_data = await get_track_details(row, email)
        if track_data:
            results.append(track_data)


    result_message = "\n".join([f"{t['track_name']} by {t['artist']}" for t in results])
    message = llmify_chain.invoke({'text': user_input, 'recommendation_type': 'semantic', 'result': result_message})


    return {
        "message": message,
        "results": results,
        "is_playlist": is_playlist
    }


import json

async def stream_response(user_input: str, email: str):
    # First, send recognizing intent
    yield json.dumps({"status": "Recognizing intent..."}) + "\n"
    intent = intent_chain.invoke({"text": user_input}).lower().strip()
    yield json.dumps({"status": f"Recognized intent as {intent}"}) + "\n"

    if intent == "description":
        yield json.dumps({"status": "Extracting song title and artist..."}) + "\n"
        song_title_artist = extract_song_title_artist_chain.invoke({"text": user_input.strip()})
        song_title = song_title_artist['song_title']
        artist = song_title_artist['artist']

        yield json.dumps({"status": f"Fetching song data for {song_title} by {artist}..."}) + "\n"
        song_data = get_song_data(song_title, artist)
        if song_data is None:
            yield json.dumps({"message": "Sorry, song not found in dataset."}) + "\n"
            return

        row = df[
            (df['song'].str.strip().str.lower() == song_title.strip().lower()) &
            (df['Artist(s)'].str.strip().str.lower() == artist.strip().lower())
        ]

        yield json.dumps({"status": "Getting track details..."}) + "\n"
        track_data = await get_track_details(row, email)
        if track_data:
            yield json.dumps({"results": [track_data]}) + "\n"

        yield json.dumps({"status": "Generating song description..."}) + "\n"
        message = description_chain.invoke({
            'song_title': song_title,
            'artist': artist,
            'song_data': song_data
        })
        yield json.dumps({"message": message}) + "\n"
        return

    elif intent == "playlist":
        yield json.dumps({"status": "Determining playlist intent..."}) + "\n"
        playlist_intent = playlist_intent_chain.invoke({"text": user_input}).strip()
        yield json.dumps({"status": f"Playlist intent: {playlist_intent}"}) + "\n"

        if playlist_intent == "semantic_recommendation":
            yield json.dumps({"status": "Getting semantic recommendations..."}) + "\n"
            response = await get_semantic_recommendation_response(user_input, email, True)
            yield json.dumps(response) + "\n"
        elif playlist_intent == "emotion_recommendation":
            yield json.dumps({"status": "Getting emotion-based recommendations..."}) + "\n"
            response = await get_emotion_recommendation_response(user_input, email, True)
            yield json.dumps(response) + "\n"
        return

    elif intent == "semantic_recommendation":
        yield json.dumps({"status": "Getting semantic recommendations..."}) + "\n"
        response = await get_semantic_recommendation_response(user_input, email, False)
        yield json.dumps(response) + "\n"
        return

    elif intent == "emotion_recommendation":
        yield json.dumps({"status": "Getting emotion-based recommendations..."}) + "\n"
        response = await get_emotion_recommendation_response(user_input, email, False)
        yield json.dumps(response) + "\n"
        return

    yield json.dumps({"message": "Sorry, I couldn't understand your request."}) + "\n"


if __name__=='__main__':
    async def main():
        r = await generate_response("generate a playlist of 4 chill songs", "john@wick")
        print(r)

    import asyncio
    asyncio.run(main())