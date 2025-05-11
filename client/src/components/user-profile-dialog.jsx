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
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"

export function UserProfileDialog({ avatar, avatarFallback }) {
    const navigate = useNavigate()
    
    const fullNameRef = useRef(null)

    const [userPreferences, setUserPreferences] = useState({
        "user_email": null,
        "avg_energy": null,
        "avg_positiveness": null,
        "avg_tempo": null,
        "dominant_emotion": null,
        "favorite_genre": null,
        "full_name": null
    })


    async function handleLogoutClick(e) {
        e.preventDefault()

        try {
            const response = await fetch('http://localhost:8000/auth/logout', {
                method: 'post',
                credentials: 'include'
            })
            if (!response.ok) {
                const data = await response.json()
                return
            }
            return navigate('/login')
        }
        catch (e) {
            console.log(e)
        }
    }

    const fetchUserPreferences = useCallback(async () => {
        const response = await fetch('http://localhost:8000/actions/get-user-preferences', {
            credentials: 'include'
        })
        if (!response.ok) {
            return
        }

        const data = await response.json()
        setUserPreferences({
            "user_email": data.user_email,
            "avg_energy": data.avg_energy,
            "avg_positiveness": data.avg_positiveness,
            "avg_tempo": data.avg_tempo,
            "dominant_emotion": data.dominant_emotion,
            "favorite_genre": data.favorite_genre,
            "full_name": data.full_name
        })
        fullNameRef.current.value = data.full_name
    })


    async function handleSaveClick(e) {
        if(fullNameRef) {
            const full_name = fullNameRef.current.value
            if(full_name===userPreferences.full_name) {
                return
            }
            try {
                const response = await fetch('http://localhost:8000/actions/change-user-info', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({full_name}),
                    credentials: 'include'
                })
                if(!response.ok) {
                    toast.error('User info not saved')
                    return
                }
                toast.success('User info successfullly saved')
            }
            catch(e) {
                toast.error('Server error')
            }
        }
    }


    const moodImage = userPreferences.dominant_emotion ? `${userPreferences.dominant_emotion}` : 'joy'

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" onClick={fetchUserPreferences} className={'cursor-pointer'}>
                    <Avatar>
                        <AvatarImage src={`/${avatar}.png`} />
                        <AvatarFallback>{avatarFallback}</AvatarFallback>
                    </Avatar>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[555px]">
                <DialogHeader>
                    <DialogTitle>Profile</DialogTitle>
                    <DialogDescription>
                        Make changes to your profile here. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex gap-8">
                    <img src={`/emotions/${moodImage}.gif`} alt="" className="min-w-28 max-w-28" />

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-right">
                                Email
                            </Label>
                            <Input id="email" defaultValue={userPreferences.user_email} readOnly className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Name
                            </Label>
                            <Input id="name" ref={fullNameRef} name="full_name" defaultValue={userPreferences.full_name} className="col-span-3" />
                        </div>
                    </div>
                </div>

                <div className="flex justify-between flex-wrap text-sm">
                    <div className="flex flex-col">
                        <p>Emotion</p>
                        <p className="text-muted-foreground">{userPreferences.dominant_emotion ? userPreferences.dominant_emotion : 'N/A'}</p>
                    </div>
                    <div className="flex flex-col">
                        <p>Energy</p>
                        <p className="text-muted-foreground">{userPreferences.avg_energy ? userPreferences.avg_energy.toFixed(2) : 'N/A'}</p>
                    </div>
                    <div className="flex flex-col">
                        <p>Positiveness</p>
                        <p className="text-muted-foreground">{userPreferences.avg_positiveness ? userPreferences.avg_positiveness.toFixed(2) : 'N/A'}</p>
                    </div>
                    <div className="flex flex-col">
                        <p>Tempo</p>
                        <p className="text-muted-foreground">{userPreferences.avg_tempo ? userPreferences.avg_tempo.toFixed(2) : 'N/A'}</p>
                    </div>
                    <div className="flex flex-col">
                        <p>Genre</p>
                        <p className="text-muted-foreground">{userPreferences.favorite_genre ? userPreferences.favorite_genre : 'N/A'}</p>
                    </div>
                </div>


                <DialogFooter className={''}>
                    <Button type="button" onClick={handleLogoutClick} variant={'destructive'} className={'sm:mr-auto cursor-pointer'}>Logout</Button>
                    
                    <Button type="button" onClick={handleSaveClick} className={'cursor-pointer'}>Save changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}