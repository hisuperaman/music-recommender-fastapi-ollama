import { Link } from "react-router-dom";

export default function PlaylistCard({ playlist }) {
    const count = playlist.tracks.length;
    let gridStyles = "grid";
    if (count === 1) gridStyles += " grid-cols-1 grid-rows-1";
    else if (count === 2) gridStyles += " grid-cols-2 grid-rows-1";
    else if (count === 3) gridStyles += " grid-cols-2 grid-rows-2";
    else gridStyles += " grid-cols-2 grid-rows-2";

    return (
        <Link to={`/playlist/${playlist.name}`} className="min-w-36 max-w-36 cursor-pointer active:scale-101 break-words">
            <div className="flex flex-col gap-2">
                <div className={`${gridStyles} aspect-[3/4] min-w-36 max-w-36 min-h-48 max-h-48 object-cover grid`}>
                    {
                        playlist.tracks.map((track, index) => {
                            return <img
                                key={index}
                                src={track.cover_image}
                                alt={`img-${index}`}
                                className="object-cover w-full h-full"
                                style={
                                    count === 3 && index === 2
                                        ? { gridColumn: "span 2" }
                                        : {}
                                }
                            />
                        })
                    }
                </div>
                <p className="text-sm">{playlist.name}</p>
                <p className="text-xs opacity-60">Tracks: {playlist.total_tracks}</p>
            </div>
        </Link>
    )
}