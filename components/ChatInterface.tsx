"use client";

import { Doc, Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";
import { ChatRequestBody } from "@/lib/types";

interface ChatInterfaceProps {
  chatId: Id<"chats">;
  initialMessages: Doc<"messages">[];
}
function ChatInterface({ chatId, initialMessages }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Doc<"messages">[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamedResponse, setStreamedResponse] = useState("");
  const [currentTool, setCurrentTool] = useState<{
    name: string;
    input: unknown;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    // Reset UI for new messages
    setInput("");
    setStreamedResponse("");
    setCurrentTool(null);
    setIsLoading(true);

    //Add user's message immediately for better UX
    const optimisticUserMessage: Doc<"messages"> = {
      _id: `temp_${Date.now()}`,
      chatId: chatId,
      content: trimmedInput,
      role: "user",
      createdAt: Date.now(),
    } as Doc<"messages">;

    setMessages((prev) => [...prev, optimisticUserMessage]);

    //track complete response for saving to database
    let fullResponse = "";

    // start streaming response
    try {
      const requestBody: ChatRequestBody = {
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        newMessage: trimmedInput,
        chatId: chatId,
      };

      // initialize SSE connection
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error(await response.text());
      if (!response.body) throw new Error("No response body found");
    } catch (error) {
      console.error("Error sending message: " + error);
      // delete the optimistic message
      setMessages((prev) =>
        prev.filter((msg) => msg._id != optimisticUserMessage._id)
      );

      setStreamedResponse("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col h-[calc(100vh-theme(spacing.14))]">
      {/* Message */}
      <section className="flex-1">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div className="p-4 rounded-xl bg-white shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="text-sm text-gray-600">
                  {message.role === "user" ? "You" : "Inktellect"}
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(message.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="text-sm text-gray-800">{message.content}</div>
            </div>
          </div>
        ))}
      </section>
      {/* Footer */}
      <footer className="border-t bg-white p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message Inktellect..."
              className="flex-1 py-3 px-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 bg-gray-50 placeholder:text-gray-500"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={`absolute right-1.5 rounded-xl h-9 w-9 p-0 flex items-center justify-center transition-all ${
                input.trim()
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              <ArrowRight />
            </Button>
          </div>
        </form>
      </footer>
    </main>
  );
}

export default ChatInterface;
