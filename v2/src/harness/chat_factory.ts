import { Chat } from "chatoyant";
import type { ChatFactory } from "../core/chat/index.ts";

export const defaultChatFactory: ChatFactory = (model: string) => new Chat({ model });
