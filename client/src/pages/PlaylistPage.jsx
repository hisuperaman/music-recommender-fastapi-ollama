import MusicCard from "@/components/music-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCallback, useEffect, useState } from "react"
import { useParams } from "react-router-dom"


function MusicSection({ title, musics, onLikeClick, onMusicCardClick, isLikeDisabled, onRemoveFromPlaylist }) {
    const isLoading = musics === undefined;
    const isEmpty = musics?.length === 0;


    async function handleLikeClick(music) {
        try {
            onLikeClick(music)
            const data = { track_name: music.track_name, artists: music.artist }
            const response = await fetch("http://localhost:8000/actions/like", {
                method: 'post',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
                credentials: 'include'
            })
            if (!response.ok) {
                onLikeClick(music)
                return
            }

        }
        catch (e) {
            onLikeClick(music)
        }
    }

    async function handleRemoveFromPlaylistClick(music) {
        try {
            const data = { playlist_name: title, track_name: music.track_name, artists: music.artist }
            const response = await fetch("http://localhost:8000/actions/playlist/remove-track", {
                method: 'post',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
                credentials: 'include'
            })
            if (!response.ok) {
                return
            }
            
            onRemoveFromPlaylist(music)
        }
        catch (e) {

        }
    }

    return (
        <div className="flex flex-col gap-1">
            <h3>{title}</h3>
            <div className="flex flex-wrap gap-4 p-4">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                        <Skeleton key={idx} className="min-w-36 max-w-36 min-h-56 max-h-56" />
                    ))
                ) : isEmpty ? (
                    <p className="text-muted-foreground">No songs found.</p>
                ) : (
                    musics.map((music) => (
                        <MusicCard
                            key={music.track_name + music.artist}
                            music={music}
                            onLikeClick={handleLikeClick}
                            onCardClick={()=>{}}
                            isLikeDisabled={isLikeDisabled}
                            showRemoveFromPlaylist={true}
                            onRemoveFromPlaylist={handleRemoveFromPlaylistClick}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

export default function PlaylistPage({ }) {
    const params = useParams()

    const [musics, setMusics] = useState()

    const fetchPlaylistTracks = useCallback(async () => {
        try {
            const response = await fetch(`http://localhost:8000/music/get-playlist-tracks?playlist_name=${params.name}`, {
                method: 'get',
                credentials: 'include'
            })
            if (!response.ok) {
                return
            }
            const data = await response.json()
            setMusics(data.tracks)
        }
        catch (e) {

        }
    })

    useEffect(() => {
        fetchPlaylistTracks()
    }, [])

    function handleLikeSong(music) {
        setMusics(prevState => {
            return prevState.map(m =>
                m.track_name === music.track_name && m.artist === music.artist
                    ? { ...m, liked: !m.liked }
                    : m
            );
        })
    }

    function handleRemoveFromPlaylist(music) {
        setMusics(prevState => {
            return prevState.filter(m =>
                m.track_name !== music.track_name && m.artist !== music.artist
            );
        })
    }

    return (
        <MusicSection title={params.name} musics={musics} onLikeClick={handleLikeSong} onRemoveFromPlaylist={handleRemoveFromPlaylist} />
    )
}