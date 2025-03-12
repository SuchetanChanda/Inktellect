import ChatInterface from "@/components/ChatInterface";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convex";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

interface ChatPageProps {
  params: Promise<{
    chatId: Id<"chats">;
  }>;
}

async function ChatPage({ params }: ChatPageProps) {
  const userId = await auth();

  if (!userId) {
    redirect("/");
  }
  const { chatId } = await params;

  try {
    const convex = getConvexClient();
    const initialMessages = await convex.query(api.messages.list, { chatId });
    return (
      <div className="flex-1 overflow-hidden">
        <ChatInterface chatId={chatId} initialMessages={initialMessages} />
      </div>
    );
  } catch (err) {
    console.error("Error fetching messages:", err);
    redirect("/dashboard");
  }
}
export default ChatPage;
