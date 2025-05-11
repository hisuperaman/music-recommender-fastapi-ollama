import { useState, KeyboardEvent, useRef, useEffect } from "react"
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter } from "@/components/ui/sidebar"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faDotCircle } from "@fortawesome/free-solid-svg-icons"

export function AppSidebar() {
    const [draft, setDraft] = useState("")
    const [messages, setMessages] = useState([

    ])

    const [response, setResponse] = useState("");
    const [loading, setLoading] = useState(false);

    const messageContainerRef = useRef(null)
    const endRef = useRef(null)
    const sendBtnRef = useRef(null)


    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, response])


    const send = async () => {
        if (!draft.trim()) return

        const currentDraft = draft.trim()
        setMessages((prev) => [...prev, { from: "user", text: draft.trim() }])
        setDraft("")

        messageContainerRef.current.scrollTo = messageContainerRef.current.scrollHeight

        setLoading(true);
        setResponse("");
        try {
            const res = await fetch("http://localhost:8000/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ messages: [...messages, { from: "user", text: draft.trim() }] }),
                credentials: "include"
            });

            if (res.ok) {
                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let done = false;
                let buffer = "";
                let result = "";

                while (!done) {
                    const { value, done: readerDone } = await reader.read();
                    done = readerDone;

                    buffer += decoder.decode(value, { stream: true });

                    try {
                        let data = JSON.parse(buffer);
                        if (data.message && data.message.content) {
                            result += data.message.content;
                            setResponse((prev) => prev + data.message.content);

                            buffer = "";
                        }
                    } catch (e) {
                        continue;
                    }
                }
            } else {
                console.error("Error fetching stream:", res.status, await res.text());
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (response.length > 0) {
            setMessages((prev) => {
                const updated = [...prev];
                const lastMessage = updated[updated.length - 1];
                if (lastMessage?.from === "assistant") {
                    lastMessage.text = response;
                } else {
                    updated.push({ from: "assistant", text: response });
                }
                return updated;
            });
        }
    }, [response, loading])

    const onKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            sendBtnRef.current.click()
        }
    }

    return (
        <Sidebar>
            <SidebarHeader>Chatbot</SidebarHeader>
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
                            >
                                {m.text}
                            </div>
                        ))}

                        <div ref={endRef}></div>

                        {
                            (loading && response.length===0) && (
                                <div className="animate-bounce text-2xl">
                                    ...
                                </div>
                            )
                        }
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
