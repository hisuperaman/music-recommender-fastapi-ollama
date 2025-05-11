import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useEffect } from "react"
import { Form, Link, redirect, useActionData } from "react-router-dom"
import { toast } from "react-toastify"

export async function loginAction({ request }) {
    const formData = await request.formData();

    const data = {
        email: formData.get("email"),
        password: formData.get("password"),
    };

    try {
        const response = await fetch("http://localhost:8000/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
            credentials: "include"
        });

        if (!response.ok) {
            const data = await response.json()
            return { message: data.detail, error: true }
        }
        return redirect('/');
    }
    catch (e) {
        console.log(e)
        return { message: 'Server error', error: true }
    }

}

export default function Login() {
    const actionData = useActionData()

    useEffect(() => {
        if (actionData) {
            if (actionData.error) {
                toast.error(actionData.message)
            }
        }
    }, [actionData])


    return (
        <Form method="post">
            <Card className="mx-auto max-w-sm min-w-sm">
                <CardHeader>
                    <CardTitle className="text-3xl">Login</CardTitle>
                    <CardDescription>Enter your information to login to account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" name="email" placeholder="me@example.com" required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" name="password" type="password" required />
                    </div>

                    <Button type={'submit'} className="w-full cursor-pointer">Login</Button>
                </CardContent>

                <CardFooter className={'flex justify-center'}>
                    <p>
                    Don't have an account?&nbsp;
                    <Link to={'/signup'} className="underline">
                        Sign up
                    </Link>
                    </p>
                </CardFooter>
            </Card>

        </Form>
    )
}