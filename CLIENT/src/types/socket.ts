export interface Message {
  id: string;
  text: string;
  channelId: string;
  sender: {
    id: string;
    username: string;
    avatar: string | null;
  };
  timestamp: Date;
  attachments: any[];
  reactions: any[];
  isEdited: boolean;
}

export interface ServerToClientEvents {
  receive_message: (message: Message) => void;
}

export interface ClientToServerEvents {
  join_channel: (channelId: string) => void;
  send_message: (message: Message) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
}
