"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Search, X, Users, Lock, UserPlus, Check } from "lucide-react";
import type { User } from "../types";
import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getAllUsers } from "@/lib/api";
import { InviteButton } from "./InviteButton";

interface CreateChannelDialogProps {
  open: boolean;
  onClose: () => void;
  type?: "group" | "direct";
}

export function CreateChannelDialog({
  open,
  onClose,
  type = "group",
}: CreateChannelDialogProps) {
  const { createChannel } = useChat();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Reset form when dialog opens
    if (open) {
      setName(type === "direct" ? "" : "");
      setIsPrivate(type === "direct");
      setSelectedUsers([]);
      setSearchTerm("");
      setIsLoading(true);

      // Load users from the database using the API
      getAllUsers()
        .then((users) => {
          // Filter out current user
          const filteredUsers = users.filter((u) => u.id !== user?.id);
          console.log("Available users for chat:", filteredUsers);
          setAvailableUsers(filteredUsers);
        })
        .catch((error) => {
          console.error("Error loading users:", error);
          // Don't show error toast here, as it's expected that users might not be available
          // if no invitations have been exchanged yet
          setAvailableUsers([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, user, type]);

  // Fix for the aria-hidden issue
  useEffect(() => {
    return () => {
      // Clean up aria-hidden attributes on unmount
      const rootElement = document.getElementById("root");
      if (rootElement) {
        rootElement.removeAttribute("aria-hidden");
        rootElement.removeAttribute("data-aria-hidden");
      }
    };
  }, []);

  // Also clean up when the dialog closes
  useEffect(() => {
    if (!open) {
      // Remove aria-hidden when dialog is closed
      const rootElement = document.getElementById("root");
      if (rootElement) {
        rootElement.removeAttribute("aria-hidden");
        rootElement.removeAttribute("data-aria-hidden");
      }
    }
  }, [open]);

  const handleCreateChannel = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // For direct messages, ensure exactly one recipient is selected
      if (type === "direct" && selectedUsers.length !== 1) {
        throw new Error("Direct messages must have exactly one recipient");
      }

      // For direct messages, use the recipient's username as the channel name
      const channelName =
        type === "direct" ? selectedUsers[0].username : name.trim();

      // Create the channel
      await createChannel(
        channelName,
        selectedUsers,
        isPrivate || type === "direct", // Direct messages are always private
        type === "direct"
      );

      // Close the dialog on success
      onClose();
    } catch (error: any) {
      console.error("Error creating channel:", error);
      toast.error(
        error?.response?.data?.error?.message || "Failed to create channel"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = availableUsers.filter((user) =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isUserSelected = (userId: string) => {
    return selectedUsers.some((selected) => selected._id === userId);
  };

  const handleSelectUser = (user: User) => {
    if (type === "direct") {
      setSelectedUsers([user]);
    } else {
      // Check if user is already selected to prevent duplicates
      if (!selectedUsers.some((selected) => selected._id === user._id)) {
        setSelectedUsers((prev) => [...prev, user]);
      }
    }
    setSearchTerm("");
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u._id !== userId));
  };

  const isCreateDisabled =
    isSubmitting ||
    isLoading ||
    (type === "group" && (name.trim() === "" || selectedUsers.length === 0)) ||
    (type === "direct" && selectedUsers.length === 0);

  // Render the empty state with invitation option
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-10 h-60 mt-1 rounded-md border">
      <UserPlus className="h-12 w-12 text-muted-foreground mb-2" />
      <h3 className="font-medium mb-1">No users available</h3>
      <p className="text-sm text-muted-foreground mb-4 text-center px-4">
        Invite someone to join Echo Chat to start messaging
      </p>
      <InviteButton variant="secondary" size="sm" />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {type === "direct" ? "New Direct Message" : "Create Channel"}
          </DialogTitle>
          <DialogDescription>
            {type === "direct"
              ? "Start a conversation with another user."
              : "Create a new channel for group conversations."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {type === "direct" ? (
            <div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="user-search">Select User</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="user-search"
                      placeholder="Search users..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedUsers.map((user) => (
                      <div
                        key={user._id}
                        className="flex items-center gap-1 bg-secondary rounded-full pl-1 pr-2 py-1"
                      >
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={user.avatar} alt={user.username} />
                          <AvatarFallback>
                            {user.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{user.username}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 rounded-full"
                          onClick={() => handleRemoveUser(user._id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <Label>Users</Label>
                  {isLoading ? (
                    <div className="flex justify-center py-8 h-60 mt-1 rounded-md border">
                      <div className="animate-spin h-6 w-6 border-2 border-primary rounded-full border-t-transparent self-center"></div>
                    </div>
                  ) : availableUsers.length === 0 ? (
                    renderEmptyState()
                  ) : (
                    <ScrollArea className="h-60 mt-1 rounded-md border">
                      <div className="p-2">
                        {filteredUsers.length > 0 ? (
                          filteredUsers.map((user) => (
                            <div
                              key={user._id}
                              className={`flex items-center gap-3 p-2 rounded-md cursor-pointer ${
                                isUserSelected(user._id)
                                  ? "bg-secondary/50"
                                  : "hover:bg-accent"
                              }`}
                              onClick={() => handleSelectUser(user)}
                            >
                              <Avatar>
                                <AvatarImage
                                  src={user.avatar}
                                  alt={user.username}
                                />
                                <AvatarFallback>
                                  {user.username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {user.username}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {user.email}
                                </span>
                              </div>
                              {isUserSelected(user._id) && (
                                <div className="ml-auto text-primary">
                                  <Check className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                          ))
                        ) : searchTerm ? (
                          <div className="text-center py-4 text-muted-foreground">
                            No users found
                          </div>
                        ) : (
                          <div className="h-32"></div>
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="channel-name">Channel Name</Label>
                <Input
                  id="channel-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. general"
                  className="mt-1"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="private"
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                />
                <Label htmlFor="private" className="flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5" />
                  Private Channel
                </Label>
              </div>

              <div>
                <Label className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  Add Members
                </Label>
                <div className="relative mt-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center gap-1 bg-secondary rounded-full pl-1 pr-2 py-1"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={user.avatar} alt={user.username} />
                        <AvatarFallback>
                          {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{user.username}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 rounded-full"
                        onClick={() => handleRemoveUser(user._id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {isLoading ? (
                <div className="flex justify-center py-8 h-40 rounded-md border">
                  <div className="animate-spin h-6 w-6 border-2 border-primary rounded-full border-t-transparent self-center"></div>
                </div>
              ) : availableUsers.length === 0 ? (
                renderEmptyState()
              ) : (
                <ScrollArea className="h-40 rounded-md border">
                  <div className="p-2">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <div
                          key={user._id}
                          className={`flex items-center gap-2 p-2 rounded-md cursor-pointer ${
                            isUserSelected(user._id)
                              ? "bg-secondary/50"
                              : "hover:bg-accent"
                          }`}
                          onClick={() => handleSelectUser(user)}
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage
                              src={user.avatar}
                              alt={user.username}
                            />
                            <AvatarFallback>
                              {user.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{user.username}</span>
                          {isUserSelected(user._id) && (
                            <div className="ml-auto text-primary">
                              <Check className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      ))
                    ) : searchTerm ? (
                      <div className="text-center py-4 text-muted-foreground">
                        No users found
                      </div>
                    ) : (
                      <div className="h-32"></div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateChannel}
              disabled={isCreateDisabled}
              className="gap-1"
            >
              {type === "direct" ? "Create" : "Create Channel"}
              {isSubmitting && (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
