import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // Mock database
  const messagesByChat = new Map<string, any[]>();
  const onlineUsers = new Map<string, { username: string; phone: string; typing: boolean }>();
  const registeredUsers = new Map<string, { username: string; phone: string; bio?: string; avatar?: string }>();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join", ({ username, phone }: { username: string; phone: string }) => {
      onlineUsers.set(socket.id, { username, phone, typing: false });
      registeredUsers.set(phone, { username, phone });
      
      io.emit("users_update", Array.from(onlineUsers.values()));
      io.emit("registered_users", Array.from(registeredUsers.values()));
    });

    socket.on("check_user", (phone: string) => {
      const user = registeredUsers.get(phone);
      socket.emit("user_exists", user || null);
    });

    socket.on("get_history", (chatId: string) => {
      const history = messagesByChat.get(chatId) || [];
      socket.emit("history", { chatId, history });
    });

    socket.on("send_message", (msg: any) => {
      const { chatId } = msg;
      const message = {
        ...msg,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        status: "sent",
      };
      
      if (!messagesByChat.has(chatId)) {
        messagesByChat.set(chatId, []);
      }
      messagesByChat.get(chatId)?.push(message);
      
      io.emit("new_message", { chatId, message });

      // Simulate "delivered" and "read" status
      setTimeout(() => {
        message.status = "delivered";
        io.emit("message_status", { chatId, id: message.id, status: "delivered" });
      }, 1000);

      setTimeout(() => {
        message.status = "read";
        io.emit("message_status", { chatId, id: message.id, status: "read" });
      }, 2500);
    });

    socket.on("delete_message", ({ chatId, messageId }: { chatId: string, messageId: string }) => {
      const history = messagesByChat.get(chatId);
      if (history) {
        const msgIndex = history.findIndex(m => m.id === messageId);
        if (msgIndex !== -1) {
          history[msgIndex].isDeleted = true;
          history[msgIndex].text = "Xabar o'chirildi";
          history[msgIndex].type = "text";
          delete history[msgIndex].image;
          delete history[msgIndex].sticker;
          delete history[msgIndex].voice;
          io.emit("message_deleted", { chatId, messageId });
        }
      }
    });

    socket.on("leave_chat", ({ chatId, phone }: { chatId: string, phone: string }) => {
      // In a real app we'd remove the user from the group members
      // For this mock, we just notify others
      io.emit("user_left", { chatId, phone });
    });

    socket.on("typing", (isTyping: boolean) => {
      const user = onlineUsers.get(socket.id);
      if (user) {
        user.typing = isTyping;
        socket.broadcast.emit("user_typing", { username: user.username, isTyping });
      }
    });

    socket.on("disconnect", () => {
      const user = onlineUsers.get(socket.id);
      if (user) {
        io.emit("users_update", Array.from(onlineUsers.values()).filter(u => u.phone !== user.phone));
        onlineUsers.delete(socket.id);
      }
      console.log("User disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
