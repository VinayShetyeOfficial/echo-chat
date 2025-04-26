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

    try {
      return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
    } catch (error) {
      console.error("Error getting initials for name:", name);
      return "?";
    }
  };

  // Determine status class based on user's online status
  const getStatusClass = () => {
    if (!user) return "bg-gray-400"; // Offline/unknown
    return user.isOnline ? "bg-green-500" : "bg-gray-400"; // Online or offline
  };

  // If no user is provided or user data is incomplete, show a placeholder
  if (!user || !user.username) {
    return (
      <Avatar className={cn(getSizeClass(), className)}>
        <AvatarFallback className="bg-chat-primary/10 text-chat-primary font-medium">
          ?
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <div className="relative">
      <Avatar className={cn(getSizeClass(), className)}>
        <AvatarImage src={user.avatar} alt={user.username || "User"} />
        <AvatarFallback className="bg-chat-primary/10 text-chat-primary font-medium">
          {getInitials(user.username)}
        </AvatarFallback>
      </Avatar>
      {/* Add status indicator for direct message avatars */}
      {size !== "sm" && (
        <span
          className={cn(
            "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
            getStatusClass()
          )}
        />
      )}
    </div>
  );
}
