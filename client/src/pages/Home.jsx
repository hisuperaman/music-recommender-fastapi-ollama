import MusicCard from "@/components/music-card"
import PlaylistCard from "@/components/playlist-card";
import { PlaylistDialog } from "@/components/playlist-dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton";
import { useMusicData } from "@/hooks/use-musicdata"
import { useEffect, useRef, useState } from "react"


function MusicSection({ title, musics, onLikeClick, onMusicCardClick, isLikeDisabled, onAddToPlaylistDialogBtnClick }) {
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
            <ScrollArea className="overflow-x-auto rounded-md border min-h-[10rem]">
                <div className="flex space-x-4 p-4">
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
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    );
}


function PlaylistsSection({ title, playlists }) {
    const isLoading = playlists === undefined;
    const isEmpty = playlists?.length === 0;


    return (
        <div className="flex flex-col gap-1">
            <h3>{title}</h3>
            <ScrollArea className="overflow-x-auto rounded-md border min-h-[10rem]">
                <div className="flex space-x-4 p-4">
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, idx) => (
                            <Skeleton key={idx} className="min-w-36 max-w-36 min-h-56 max-h-56" />
                        ))
                    ) : isEmpty ? (
                        <p className="text-muted-foreground">No playlists found.</p>
                    ) : (
                        playlists.map((playlist) => (
                            <PlaylistCard
                                key={playlist.name}
                                playlist={playlist}
                            />
                        ))
                    )}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    );
}



export default function Home() {
    const playlistDialogTriggerBtnRef = useRef(null)

    const [todays, setTodays] = useState()
    const [likedSongs, setLikedSongs] = useState()
    const [historySongs, setHistorySongs] = useState()
    const [recommendedForYouSongs, setRecommendedForYouSongs] = useState()
    const [yourVibesSongs, setYourVibesSongs] = useState()
    const [othersAlsoLiked, setOthersAlsoLiked] = useState()
    
    const [playlists, setPlaylists] = useState([])
    const [musicToAddPlaylist, setMusicToAddPlaylist] = useState(null)

    const { data: todaysData, refetch: refetchTodays } = useMusicData('http://localhost:8000/music/get-today-picks');
    const { data: likedSongsData, refetch: refetchLiked } = useMusicData('http://localhost:8000/music/get-liked-songs');
    const { data: historySongsData, refetch: refetchHistory } = useMusicData('http://localhost:8000/music/get-history-songs');
    const { data: recommendedForYouData, refetch: refetchRecommendedForYou } = useMusicData('http://localhost:8000/music/get-recommended-for-you');
    const { data: yourVibesData, refetch: refetchYourVibes } = useMusicData('http://localhost:8000/music/get-your-vibes-songs');
    const { data: othersAlsoLikedData, refetch: refetchOthersAlsoLikedData } = useMusicData('http://localhost:8000/music/get-others-also-liked');
    
    const { data: playlistsData, refetch: refetchPlaylistsData } = useMusicData('http://localhost:8000/music/get-playlists');

    const allLoaded = todays && likedSongs && historySongs && recommendedForYouSongs && yourVibesSongs && othersAlsoLiked

    useEffect(() => {
        if (todaysData && !todays) {
            setTodays(todaysData.recommendations)
            console.log(todaysData)
        }
    }, [todaysData])

    useEffect(() => {
        if (likedSongsData && !likedSongs) {
            setLikedSongs(likedSongsData.likedSongs)
            console.log(likedSongsData)
        }
    }, [likedSongsData])

    useEffect(() => {
        if (historySongsData && !historySongs) {
            setHistorySongs(historySongsData.historySongs)
            console.log(historySongsData)
        }
    }, [historySongsData])

    useEffect(() => {
        if (recommendedForYouData && !recommendedForYouSongs) {
            setRecommendedForYouSongs(recommendedForYouData.recommendations)
            console.log(recommendedForYouData)
        }
    }, [recommendedForYouData])
    
    useEffect(() => {
        if (yourVibesData && !yourVibesSongs) {
            setYourVibesSongs(yourVibesData.recommendations)
            console.log(yourVibesData)
        }
    }, [yourVibesData])

    useEffect(() => {
        if (othersAlsoLikedData && !othersAlsoLiked) {
            setOthersAlsoLiked(othersAlsoLikedData.othersAlsoLikedSongs)
            console.log(othersAlsoLikedData)
        }
    }, [othersAlsoLikedData])

    useEffect(() => {
        if (playlistsData) {
            setPlaylists(playlistsData.playlists)
            console.log(playlistsData)
        }
    }, [playlistsData])


    function handleLikeSong(music) {
        setTodays(prevState => {
            return prevState.map(m =>
                m.track_name === music.track_name && m.artist === music.artist
                    ? { ...m, liked: !m.liked }
                    : m
            );
        })

        setHistorySongs(prevState => {
            return prevState.map(m =>
                m.track_name === music.track_name && m.artist === music.artist
                    ? { ...m, liked: !m.liked }
                    : m
            );
        })

        setRecommendedForYouSongs(prevState => {
            return prevState.map(m =>
                m.track_name === music.track_name && m.artist === music.artist
                    ? { ...m, liked: !m.liked }
                    : m
            );
        })

        setYourVibesSongs(prevState => {
            return prevState.map(m =>
                m.track_name === music.track_name && m.artist === music.artist
                    ? { ...m, liked: !m.liked }
                    : m
            );
        })

        setOthersAlsoLiked(prevState => {
            return prevState.map(m =>
                m.track_name === music.track_name && m.artist === music.artist
                    ? { ...m, liked: !m.liked }
                    : m
            );
        })

        setLikedSongs(prevState => {
            const songIndex = prevState.findIndex(m =>
                m.track_name === music.track_name && m.artist === music.artist
            );

            if (songIndex === -1) {
                // Song not found in liked songs, so add it
                return [
                    { ...music, liked: true },
                    ...prevState,
                ];
            } else {
                // Song is already liked, so remove it
                return prevState.filter(m =>
                    m.track_name !== music.track_name || m.artist !== music.artist
                );
            }
        });
    };


    function handleMusicCardClick(music) {
        setHistorySongs(prevState => {
            const songIndex = prevState.findIndex(m =>
                m.track_name === music.track_name && m.artist === music.artist
            );

            if (songIndex === -1) {
                return [
                    music,
                    ...prevState,
                ];
            } else {
                return [
                    music,
                    ...prevState.filter(m =>
                        m.track_name !== music.track_name || m.artist !== music.artist
                    )
                ];
            }
        });
    }

    function handleAddToPlaylistDialogBtnClick(music) {
        // console.log(music)
        setMusicToAddPlaylist({
            track_name: music.track_name,
            artists: music.artist
        })
        if(playlistDialogTriggerBtnRef.current) {
            playlistDialogTriggerBtnRef.current.click()
        }
    }

    function handleSongAdded() {
        // console.log('refetching playlists')
        refetchPlaylistsData()

        playlistDialogTriggerBtnRef.current.click()
    }

    return (
        <div className="flex flex-col gap-4">
            <MusicSection title={"Today's picks"} musics={todays} onLikeClick={handleLikeSong} onMusicCardClick={handleMusicCardClick} isLikeDisabled={!allLoaded} onAddToPlaylistDialogBtnClick={handleAddToPlaylistDialogBtnClick}/>
            <MusicSection title={"Recommended for you"} musics={recommendedForYouSongs} onLikeClick={handleLikeSong} onMusicCardClick={handleMusicCardClick} isLikeDisabled={!allLoaded} onAddToPlaylistDialogBtnClick={handleAddToPlaylistDialogBtnClick}/>
            <MusicSection title={"Your vibes"} musics={yourVibesSongs} onLikeClick={handleLikeSong} onMusicCardClick={handleMusicCardClick} isLikeDisabled={!allLoaded}  onAddToPlaylistDialogBtnClick={handleAddToPlaylistDialogBtnClick}/> {/* based on music taste, and other audio features */}
            <MusicSection title={"Others also liked"} musics={othersAlsoLiked} onLikeClick={handleLikeSong} onMusicCardClick={handleMusicCardClick} isLikeDisabled={!allLoaded}  onAddToPlaylistDialogBtnClick={handleAddToPlaylistDialogBtnClick}/>

            <PlaylistsSection title={"Playlists"} playlists={playlists} />

            <MusicSection title={"Liked Songs"} musics={likedSongs} onLikeClick={handleLikeSong} onMusicCardClick={handleMusicCardClick} isLikeDisabled={!allLoaded} onAddToPlaylistDialogBtnClick={handleAddToPlaylistDialogBtnClick}/>
            <MusicSection title={"Recently Played"} musics={historySongs} onLikeClick={handleLikeSong} onMusicCardClick={handleMusicCardClick} isLikeDisabled={!allLoaded} onAddToPlaylistDialogBtnClick={handleAddToPlaylistDialogBtnClick}/>

            <PlaylistDialog playlists={playlists} music={musicToAddPlaylist} onSongAdded={handleSongAdded}>
                <button type="button" tabIndex={-1} className="hidden" ref={playlistDialogTriggerBtnRef}></button>
            </PlaylistDialog>
            
        </div>
    );
}
