import { Chat } from "chatoyant";
import type { ChatFactory } from "../core/chat/api/write/index.ts";

export const defaultChatFactory: ChatFactory = (model: string) => new Chat({ model });
