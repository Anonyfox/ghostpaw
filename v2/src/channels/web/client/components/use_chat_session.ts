import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { ChatMessageInfo } from "../../shared/chat_message_info.ts";
import type { ChatSessionInfo } from "../../shared/chat_session_info.ts";
import { apiGet } from "../api_get.ts";
import { apiPost } from "../api_post.ts";
import type { ChatWsConnection } from "./connect_chat_ws.ts";
import { connectChatWs } from "./connect_chat_ws.ts";

export interface ToolActivity {
  tools: string[];
  running: boolean;
}

export interface UseChatSessionResult {
  session: ChatSessionInfo | null;
  messages: ChatMessageInfo[];
  streamingContent: string;
  waiting: boolean;
  toolActivity: ToolActivity | null;
  loading: boolean;
  error: string;
  totalTokens: number;
  model: string;
  sendMessage: (text: string, model?: string) => void;
}

interface UseChatSessionOptions {
  sessionId?: number | null;
  onTitleGenerated?: (sessionId: number, title: string) => void;
  onSessionCreated?: (sessionId: number) => void;
}

export function useChatSession(options?: UseChatSessionOptions): UseChatSessionResult {
  const targetSessionId = options?.sessionId ?? null;
  const onTitleGenerated = options?.onTitleGenerated;
  const onSessionCreated = options?.onSessionCreated;

  const [session, setSession] = useState<ChatSessionInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessageInfo[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [loading, setLoading] = useState(!!targetSessionId);
  const [error, setError] = useState("");
  const [totalTokens, setTotalTokens] = useState(0);
  const [model, setModel] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [toolActivity, setToolActivity] = useState<ToolActivity | null>(null);

  const wsRef = useRef<ChatWsConnection | null>(null);
  const sessionIdRef = useRef<number | null>(null);
  const creatingRef = useRef(false);
  const preserveWsRef = useRef(false);
  const onTitleRef = useRef(onTitleGenerated);
  const onCreatedRef = useRef(onSessionCreated);
  onTitleRef.current = onTitleGenerated;
  onCreatedRef.current = onSessionCreated;

  const openWs = useCallback((sid: number): Promise<void> => {
    wsRef.current?.close();
    const conn = connectChatWs(sid, {
      onChunk: (accumulated) => {
        setWaiting(false);
        setStreamingContent(accumulated);
      },
      onDone: (messageId, content, tokens) => {
        setWaiting(false);
        setToolActivity(null);
        setTotalTokens((prev) => prev + tokens);
        setMessages((prev) => [
          ...prev,
          { id: messageId, role: "assistant", content, createdAt: Date.now() },
        ]);
        setStreamingContent("");
      },
      onError: (msg) => {
        setWaiting(false);
        setToolActivity(null);
        setError(msg);
        setStreamingContent("");
      },
      onTitle: (id, title) => {
        setSession((prev) => (prev ? { ...prev, displayName: title } : prev));
        onTitleRef.current?.(id, title);
      },
      onToolStart: (tools) => {
        setWaiting(false);
        setToolActivity((prev) => ({
          tools: [...new Set([...(prev?.tools ?? []), ...tools])],
          running: true,
        }));
      },
      onToolEnd: () => {
        setToolActivity((prev) => (prev ? { ...prev, running: false } : null));
      },
      onBackgroundComplete: () => {
        const currentSid = sessionIdRef.current;
        if (!currentSid) return;
        apiGet<{ messages: ChatMessageInfo[] }>(`/api/chat/${currentSid}`)
          .then((resp) => {
            setMessages(resp.messages);
          })
          .catch(() => {});
      },
    });
    wsRef.current = conn;
    return conn.ready;
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (preserveWsRef.current) {
      preserveWsRef.current = false;
      return () => {
        cancelled = true;
        if (!preserveWsRef.current) wsRef.current?.close();
      };
    }

    wsRef.current?.close();
    sessionIdRef.current = null;
    creatingRef.current = false;
    setSession(null);
    setMessages([]);
    setStreamingContent("");
    setWaiting(false);
    setToolActivity(null);
    setError("");
    setTotalTokens(0);
    setModel("");

    if (targetSessionId) {
      setLoading(true);
      apiGet<{ session: ChatSessionInfo; messages: ChatMessageInfo[] }>(
        `/api/chat/${targetSessionId}`,
      )
        .then((resp) => {
          if (cancelled) return;
          setSession(resp.session);
          setModel(resp.session.model);
          setMessages(resp.messages);
          setTotalTokens(resp.session.totalTokens);
          sessionIdRef.current = resp.session.sessionId;
          openWs(resp.session.sessionId);
          setLoading(false);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        });
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
      if (!preserveWsRef.current) wsRef.current?.close();
    };
  }, [targetSessionId, openWs]);

  const sendMessage = useCallback(
    async (text: string, overrideModel?: string) => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: "user", content: text, createdAt: Date.now() },
      ]);
      setError("");

      let sid = sessionIdRef.current;
      if (!sid) {
        if (creatingRef.current) return;
        creatingRef.current = true;
        try {
          const info = await apiPost<ChatSessionInfo>("/api/chat");
          setSession(info);
          setModel(info.model);
          sessionIdRef.current = info.sessionId;
          sid = info.sessionId;
          await openWs(info.sessionId);
          preserveWsRef.current = true;
          onCreatedRef.current?.(info.sessionId);
        } catch (err) {
          creatingRef.current = false;
          setError(err instanceof Error ? err.message : String(err));
          return;
        }
        creatingRef.current = false;
      }

      const conn = wsRef.current;
      if (!conn) {
        setError("WebSocket not connected.");
        return;
      }

      await conn.ready;
      setWaiting(true);
      conn.send(text, overrideModel);
    },
    [openWs],
  );

  return {
    session,
    messages,
    streamingContent,
    waiting,
    toolActivity,
    loading,
    error,
    totalTokens,
    model,
    sendMessage,
  };
}
