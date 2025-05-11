import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { faSquareCheck, faSquarePlus } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { ScrollArea } from "@radix-ui/react-scroll-area"
import { Separator } from "./ui/separator"
import { useRef, useState } from "react"
import { toast } from "react-toastify"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export function PlaylistDialog({ playlists, music, onSongAdded, children }) {

    const playlistInputRef = useRef(null)

    const [selectedPlaylist, setSelectedPlaylist] = useState(playlists.length > 0 ? playlists[0].name : '')

    async function handleCreateAndAddPlaylistClick(e) {
        if (!playlistInputRef.current) {
            return
        }

        try {
            const response = await fetch("http://localhost:8000/actions/create-and-add-playlist", {
                method: 'post',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    playlist_name: playlistInputRef.current.value,
                    ...music
                }),
                credentials: 'include'
            })
            if (!response.ok) {
                return
            }
            const data = await response.json()
            if (data.error) {
                toast.error(data.msg)
                return
            }
            console.log(data)
            playlistInputRef.current.value = ''
            onSongAdded()
            toast.success(data.msg)
        }
        catch (e) {
        }
    }


    async function handleAddToExistingPlaylist(e) {
        if (!selectedPlaylist) {
            return
        }

        try {
            const response = await fetch("http://localhost:8000/actions/playlist/add-track", {
                method: 'post',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    playlist_name: selectedPlaylist,
                    ...music
                }),
                credentials: 'include'
            })
            if (!response.ok) {
                return
            }
            const data = await response.json()
            if (data.error) {
                toast.error(data.msg)
                return
            }
            console.log(data)
            onSongAdded()
            toast.success(data.msg)
        }
        catch (e) {
        }
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add to Playlist</DialogTitle>
                    <DialogDescription>
                        Add song to any of the playlists.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">

                    <div className="grid grid-cols-5 items-center gap-4">
                        <Label htmlFor="new_playlist_name" className="text-right">
                            New
                        </Label>
                        <Input ref={playlistInputRef} className="col-span-3" />
                        <Button type={'button'} onClick={handleCreateAndAddPlaylistClick}>Add</Button>
                    </div>

                    <div>
                        <ScrollArea className="h-56 overflow-auto rounded-md border">
                            <div className="p-4">
                                <h4 className="mb-4 text-sm font-medium leading-none text-center">Playlists</h4>
                                <RadioGroup
                                    value={selectedPlaylist}
                                    onValueChange={setSelectedPlaylist}>
                                    {playlists.map((playlist) => (
                                        <div key={playlist.name} >
                                            <div className="text-sm flex items-center space-x-2 hover:bg-gray-800 rounded">
                                                <RadioGroupItem value={playlist.name} id={playlist.name} />
                                                <Label htmlFor={playlist.name} className={'w-full py-2'}>{playlist.name}</Label>
                                            </div>
                                            <Separator className={''} />
                                        </div>
                                    ))}
                                </RadioGroup>

                            </div>
                        </ScrollArea>
                    </div>

                </div>
                <DialogFooter>
                    <Button type="button" onClick={handleAddToExistingPlaylist}>Add</Button>
                </DialogFooter>
            </DialogContent >
        </Dialog >
    )
}