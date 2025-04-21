import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@/types";
import { cn } from "@/lib/utils";

export interface UserAvatarProps {
  user?: User | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function UserAvatar({ user, size = "md", className }: UserAvatarProps) {
  const getSizeClass = () => {
    switch (size) {
      case "sm":
        return "h-8 w-8";
      case "lg":
        return "h-12 w-12";
      case "md":
      default:
        return "h-10 w-10";
    }
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // If no user is provided, show a placeholder
  if (!user) {
    return (
      <Avatar className={cn(getSizeClass(), className)}>
        <AvatarFallback className="bg-chat-primary/10 text-chat-primary font-medium">
          ?
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <Avatar className={cn(getSizeClass(), className)}>
      <AvatarImage src={user.avatar} alt={user?.username || "User"} />
      <AvatarFallback className="bg-chat-primary/10 text-chat-primary font-medium">
        {getInitials(user.username)}
      </AvatarFallback>
    </Avatar>
  );
}
