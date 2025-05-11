import { faCircleXmark, faHeart, faSquareCheck, faSquarePlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { PlaylistDialog } from "./playlist-dialog";
import { Button } from "./ui/button";
import { useRef } from "react";

export default function MusicCard({ music, onLikeClick, onCardClick, isLikeDisabled, onAddToPlaylistClick, showRemoveFromPlaylist, onRemoveFromPlaylist }) {

    const dialogContentRef = useRef(null)

    function handleLikeClick(e) {
        e.preventDefault()
        e.stopPropagation()

        onLikeClick(music)
    }

    function handleAddToPlaylistClick(e) {
        e.preventDefault()
        e.stopPropagation()

        onAddToPlaylistClick(music)
    }

    async function handleCardClick(e) {
        e.preventDefault();
        if (dialogContentRef.current && dialogContentRef.current.contains(e.target)) {
            return
        }
        if (e.target.getAttribute('data-slot') === 'dialog-overlay') {
            return
        }

        if (isLikeDisabled) return

        try {
            fetch("http://localhost:8000/actions/history", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ track_name: music.track_name, artists: music.artist }),
                credentials: "include"
            });
        } catch (err) {
            console.error("Failed to log open:", err);
        }

        onCardClick(music)
        window.open(music.spotify_url, "_blank");
    }

    function handleRemoveFromPlaylistClick(e) {
        e.preventDefault()
        e.stopPropagation()

        onRemoveFromPlaylist(music)
    }


    return (
        <div onClick={handleCardClick} className="min-w-36 max-w-36 cursor-pointer active:scale-101 break-words">
            <div className="flex flex-col gap-2">
                <div className="relative">
                    <img src={music.cover_image ? music.cover_image : 'music-placeholder.svg'} alt={music.track_name} className="object-cover aspect-[3/4] min-w-36 max-w-36 min-h-48 max-h-48" />

                    <button type="button" disabled={isLikeDisabled} onClick={handleLikeClick} className={`transition cursor-pointer absolute text-2xl right-0 bottom-0 hover:scale-110 active:scale-120 ${music.liked ? 'text-red-600' : 'text-white'}`}>
                        <FontAwesomeIcon icon={faHeart} />
                    </button>

                    <div className="transition cursor-pointer absolute right-0 top-0 hover:scale-110 active:scale-120 text-gray-500">
                        {
                            showRemoveFromPlaylist ? (
                                <button type="button" onClick={handleRemoveFromPlaylistClick} className={`transition cursor-pointer absolute text-2xl right-0 top-0 hover:scale-110 active:scale-120 text-gray-500`}>
                                    <FontAwesomeIcon icon={faCircleXmark} />
                                </button>
                            ) : (
                                <button type="button" disabled={isLikeDisabled} onClick={handleAddToPlaylistClick} className={`transition cursor-pointer absolute text-2xl right-0 top-0 hover:scale-110 active:scale-120 text-gray-500`}>
                                    <FontAwesomeIcon icon={music.in_playlist ? faSquareCheck : faSquarePlus} />
                                </button>
                            )
                        }
                    </div>
                </div>
                <p className="text-sm">{music.track_name}</p>
                <p className="text-xs opacity-60">{music.artist}</p>
                <p className="text-xs opacity-60">from <b>{music.album}</b></p>
            </div>
        </div>
    )
}