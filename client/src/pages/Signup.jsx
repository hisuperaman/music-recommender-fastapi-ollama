import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@radix-ui/react-scroll-area"
import { ScrollBar } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useEffect, useRef, useState } from "react"
import { Form, Link, redirect, useActionData } from "react-router-dom"
import { toast } from "react-toastify"


function AvatarElement({ src, alt, selected, onClick }) {
    return (
        <div onClick={onClick} className={`cursor-pointer transition ${selected ? 'scale-120' : 'scale-100 hover:scale-110'}`}>
            <Avatar className={'size-15'}>
                <AvatarImage src={src} />
                <AvatarFallback>{alt}</AvatarFallback>
            </Avatar>
        </div>
    )
}

export async function signupAction({ request }) {
    const formData = await request.formData();
    if(formData.get("password")!==formData.get("confirm_password")) {
        return {message: 'Passwords do not match', error: true}
    }

    const data = {
      full_name: formData.get("full_name"),
      email: formData.get("email"),
      age: formData.get("age"),
      avatar: formData.get("avatar"),
      password: formData.get("password"),
    };

    console.log(data)
  
    try {
        const response = await fetch("http://localhost:8000/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if(!response.ok) {
            const data = await response.json()
            return {message: data.detail, error: true}
        }
        return redirect('/login');
    }
    catch(e) {
        return {message: 'Server error', error: true}
    }
  
  }

export default function Signup() {
    const actionData = useActionData()

    const [selectedAvatarId, setSelectedAvatarId] = useState(1)

    const avatarInputRef = useRef(null)

    function handleAvatarClick(avatarId) {
        setSelectedAvatarId(avatarId)
    }

    useEffect(()=>{
        if(actionData) {
            if(actionData.error) {
                toast.error(actionData.message)
            }
        }
    }, [actionData])

    useEffect(()=>{
        if(avatarInputRef) {
            avatarInputRef.current.value = selectedAvatarId
        }
    }, [selectedAvatarId])

    return (
        <Form method="post">
            <Card className="mx-auto max-w-sm min-w-sm">
                <CardHeader>
                    <CardTitle className="text-3xl">Sign Up</CardTitle>
                    <CardDescription>Enter your information to create an account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">

                    <Label>Avatar</Label>
                    <ScrollArea className="overflow-x-auto flex gap-6 rounded-md border p-4">

                        {
                            Array(8).fill(0).map((value, index) => {
                                return (
                                    <AvatarElement key={index} onClick={() => handleAvatarClick(index + 1)} src={`${index + 1}.png`} alt={`avatar${value}`} selected={selectedAvatarId === index + 1} />
                                )
                            })
                        }

                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>

                    <input type="hidden" name="avatar" ref={avatarInputRef} />
                    <div className="space-y-2">
                        <Label htmlFor="full-name">Full name</Label>
                        <Input id="full-name" name="full_name" placeholder="John Doe" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" name="email" placeholder="me@example.com" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="age">Age</Label>
                        <Input id="age" type="number" name="age" placeholder="20" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" name="password" type="password" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input id="confirm-password" name="confirm_password" type="password" required />
                    </div>
                    <Button type={'submit'} className="w-full cursor-pointer">Sign up</Button>
                </CardContent>

                <CardFooter className={'flex justify-center'}>
                    <p>
                    Already have an account?&nbsp;
                    <Link to={'/login'} className="underline">
                        Login
                    </Link>
                    </p>
                </CardFooter>
            </Card>

            
        </Form>
    )
}