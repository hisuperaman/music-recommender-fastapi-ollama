import MusicCard from "@/components/music-card"
import PlaylistCard from "@/components/playlist-card";
import { PlaylistDialog } from "@/components/playlist-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton";
import { useMusicData } from "@/hooks/use-musicdata"
import { useEffect, useRef, useState } from "react"


function ResultsSection({ title, musics, onLikeClick, onMusicCardClick, isLikeDisabled, onAddToPlaylistDialogBtnClick }) {
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
                                key={music.track_name+music.artist}
                                music={music}
                                onLikeClick={handleLikeClick}
                                onCardClick={onMusicCardClick}
                                isLikeDisabled={isLikeDisabled}
                                onAddToPlaylistClick={onAddToPlaylistDialogBtnClick}
                            />
                        ))
                    )}
                </div>
        </div>
    );
}


export default function SearchPage({ hasMore, setHasMore, query, filter, searchResults, setSearchResults }) {
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const [musicToAddPlaylist, setMusicToAddPlaylist] = useState(null);
    const [playlists, setPlaylists] = useState([]);
    const playlistDialogTriggerBtnRef = useRef(null);

    const { data: playlistsData } = useMusicData('http://localhost:8000/music/get-playlists');

    useEffect(() => {
        if (playlistsData) {
            setPlaylists(playlistsData.playlists);
        }
    }, [playlistsData]);

    async function loadMoreResults() {
        setIsLoading(true);
        try {
            const res = await fetch(`http://localhost:8000/music/search-tracks?query=${query}&filter_by=${filter}&page=${page + 1}`, {
                method: 'get',
                credentials: 'include'
            });
            const data = await res.json();

            if (data.searchResults.length > 0) {
                setSearchResults(prev => [...prev, ...data.searchResults]);
                setPage(prev => prev + 1);
            }

            if(searchResults.length < data.total_results) {
                setHasMore(true)
            }
            else {
                setHasMore(false)
            }
        } catch (err) {
            console.error("Error loading more:", err);
        } finally {
            setIsLoading(false);
        }
    }

    function handleLikeSong(music) {
        setSearchResults(prevState =>
            prevState.map(m =>
                m.track_name === music.track_name && m.artist === music.artist
                    ? { ...m, liked: !m.liked }
                    : m
            )
        );
    }

    function handleAddToPlaylistDialogBtnClick(music) {
        setMusicToAddPlaylist({ track_name: music.track_name, artists: music.artist });
        playlistDialogTriggerBtnRef.current?.click();
    }

    function handleSongAdded() {
        playlistDialogTriggerBtnRef.current?.click();
    }

    const allLoaded = playlistsData

    return (
        <div className="flex flex-col gap-4">
            <ResultsSection
                title="Top Results"
                musics={searchResults}
                onLikeClick={handleLikeSong}
                onMusicCardClick={() => {}}
                isLikeDisabled={!allLoaded}
                onAddToPlaylistDialogBtnClick={handleAddToPlaylistDialogBtnClick}
            />

            {hasMore && (
                <Button
                    onClick={loadMoreResults}
                    disabled={isLoading}
                    className="self-center px-4 py-2 cursor-pointer"
                >
                    {isLoading ? 'Loading...' : 'Load More'}
                </Button>
            )}

            <PlaylistDialog playlists={playlists} music={musicToAddPlaylist} onSongAdded={handleSongAdded}>
                <button type="button" tabIndex={-1} className="hidden" ref={playlistDialogTriggerBtnRef}></button>
            </PlaylistDialog>
        </div>
    );
}
