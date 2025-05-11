import { useState, KeyboardEvent, useRef, useEffect } from "react"
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter } from "@/components/ui/sidebar"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faDotCircle } from "@fortawesome/free-solid-svg-icons"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import { Terminal } from "lucide-react"
import { data } from "react-router-dom"

export function AppSidebar({ setSearchLoading, setSearchResults, setHasMore }) {
    const [draft, setDraft] = useState("")
    const [messages, setMessages] = useState([

    ])

    const [loading, setLoading] = useState(false);

    const messageContainerRef = useRef(null)
    const endRef = useRef(null)
    const sendBtnRef = useRef(null)

    const [status, setStatus] = useState(null)


    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, status])


    const send = async () => {
        if (!draft.trim()) return;

        const currentDraft = draft.trim();
        setMessages((prev) => [...prev, { from: "user", text: currentDraft }]);
        setDraft("");

        messageContainerRef.current.scrollTo = messageContainerRef.current.scrollHeight;

        setLoading(true);

        try {
            const response = await fetch("http://localhost:8000/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ message: draft.trim() }),
                credentials: "include"
            });

            const reader = response.body?.getReader();
            const decoder = new TextDecoder("utf-8");

            let partial = "";
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                // Decode the stream chunk and append to partial data
                partial += decoder.decode(value, { stream: true });

                // Split the partial data into lines, filtering out any empty lines
                const lines = partial.split('\n').filter(Boolean);

                // Process each complete line
                for (let i = 0; i < lines.length; i++) {
                    try {
                        const data = JSON.parse(lines[i]);
                        handleStreamUpdate(data); // Update UI with the parsed data
                    } catch (e) {
                        console.error("Error parsing JSON:", e);
                    }
                }
            }
        } catch (e) {
            console.error("Error in fetch operation:", e);
        }

    };

    const handleStreamUpdate = (data) => {
        console.log(data)
        if (data.status) {
            if (data.status.toLowerCase().includes('recommendations')) {
                setSearchLoading(true)
            }
            setStatus(data.status);
        }
        if (data.message) {
            const m = data.message.replaceAll("\n", "<br>")
            setMessages((prev) => {
                const updated = [...prev];
                const lastMessage = updated[updated.length - 1];
                if (lastMessage?.from === "assistant") {
                    lastMessage.text = m;
                } else {
                    updated.push({ from: "assistant", text: m });
                }
                return updated;
            });
            setLoading(false);
            setStatus(null)
        }
        if (data.results) {
            setSearchResults(data.results); // Or merge if needed
            setSearchLoading(false)
            setHasMore(false)
        }
    };



    const onKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            sendBtnRef.current.click()
        }
    }

    return (
        <Sidebar>
            <SidebarHeader>Music Assistant</SidebarHeader>
            <SidebarContent ref={messageContainerRef}>
                <Card className="text-white flex flex-col rounded-xl shadow-lg h-full justify-end">
                    <CardContent className="flex flex-col gap-2 p-4 text-sm overflow-y-auto">
                        {messages.map((m, i) => (
                            <div
                                key={i}
                                className={`p-2 rounded-lg max-w-[80%] ${m.from === "assistant"
                                    ? "bg-gray-800 self-start text-white"
                                    : "bg-white self-end text-black"
                                    }`}
                                dangerouslySetInnerHTML={{ __html: m.text }}
                            />
                        ))}


                        {
                            (loading) && (
                                <div className="animate-bounce text-2xl">
                                    ...
                                </div>
                            )
                        }

                        {
                            (loading && status) && (
                                <Alert>
                                    <Terminal className="h-4 w-4" />
                                    <AlertTitle>Working out...</AlertTitle>
                                    <AlertDescription>
                                        {status}
                                    </AlertDescription>
                                </Alert>
                            )
                        }

                        <div ref={endRef}></div>


                    </CardContent>
                </Card>
            </SidebarContent>
            <SidebarFooter>
                <div className="flex w-full items-end gap-2">
                    <Textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={onKeyDown}
                        rows={1}
                        placeholder="Type your message..."
                        className="flex-1 resize-none rounded-md bg-gray-900 text-white p-2 text-sm border-none focus:outline-none focus:ring-0 max-h-40 overflow-y-auto"
                        onInput={(e) => {
                            const t = e.target
                            t.style.height = "auto"
                            t.style.height = t.scrollHeight + "px"
                        }}
                    />
                    <Button onClick={send} ref={sendBtnRef} disabled={draft.length === 0 || loading} className="w-8 h-8 bg-gray-200 hover:bg-white cursor-pointer">
                        <span className="text-sm">➤</span>
                    </Button>
                </div>
            </SidebarFooter>
        </Sidebar>
    )
}
