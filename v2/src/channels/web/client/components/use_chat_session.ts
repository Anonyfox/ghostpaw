import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { ChatMessageInfo } from "../../shared/chat_message_info.ts";
import type { ChatSessionInfo } from "../../shared/chat_session_info.ts";
import { apiGet } from "../api_get.ts";
import { apiPost } from "../api_post.ts";
import { connectChatSse } from "./connect_chat_sse.ts";

export interface UseChatSessionResult {
  session: ChatSessionInfo | null;
  messages: ChatMessageInfo[];
  streamingContent: string;
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

  const esRef = useRef<EventSource | null>(null);
  const sseReadyRef = useRef<Promise<void> | null>(null);
  const sessionIdRef = useRef<number | null>(null);
  const creatingRef = useRef(false);
  const onTitleRef = useRef(onTitleGenerated);
  const onCreatedRef = useRef(onSessionCreated);
  onTitleRef.current = onTitleGenerated;
  onCreatedRef.current = onSessionCreated;

  const openSse = useCallback((sid: number): Promise<void> => {
    esRef.current?.close();
    const conn = connectChatSse(sid, {
      onChunk: setStreamingContent,
      onDone: (messageId, content, tokens) => {
        setTotalTokens((prev) => prev + tokens);
        setMessages((prev) => [
          ...prev,
          { id: messageId, role: "assistant", content, createdAt: Date.now() },
        ]);
        setStreamingContent("");
      },
      onError: (msg) => {
        setError(msg);
        setStreamingContent("");
      },
      onTitle: (id, title) => {
        setSession((prev) => (prev ? { ...prev, displayName: title } : prev));
        onTitleRef.current?.(id, title);
      },
    });
    esRef.current = conn.eventSource;
    sseReadyRef.current = conn.ready;
    return conn.ready;
  }, []);

  useEffect(() => {
    let cancelled = false;
    esRef.current?.close();
    sessionIdRef.current = null;
    creatingRef.current = false;
    setSession(null);
    setMessages([]);
    setStreamingContent("");
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
          openSse(resp.session.sessionId);
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
      esRef.current?.close();
    };
  }, [targetSessionId, openSse]);

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
          await openSse(info.sessionId);
          onCreatedRef.current?.(info.sessionId);
        } catch (err) {
          creatingRef.current = false;
          setError(err instanceof Error ? err.message : String(err));
          return;
        }
        creatingRef.current = false;
      }

      if (sseReadyRef.current) await sseReadyRef.current;

      const body: Record<string, string> = { content: text };
      if (overrideModel) body.model = overrideModel;
      apiPost(`/api/chat/${sid}/send`, body).catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
      });
    },
    [openSse],
  );

  return { session, messages, streamingContent, loading, error, totalTokens, model, sendMessage };
}
