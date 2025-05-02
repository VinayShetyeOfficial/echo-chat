"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Mail, Copy, Share2, Check } from "lucide-react"
import { createInvitation } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"

interface InviteButtonProps {
  channelId?: string
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
  fullWidth?: boolean
  className?: string
}

export function InviteButton({
  channelId,
  variant = "default",
  size = "default",
  fullWidth = false,
  className = "",
}: InviteButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [inviteCode, setInviteCode] = useState("")
  const [inviteUrl, setInviteUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState("")
  const { user } = useAuth()

  const handleCreateInvite = async () => {
    if (isLoading) return
    setIsLoading(true)

    try {
      // Default expiration to 24 hours
      const invitation = await createInvitation(channelId, email, 24)
      const inviteLink = `${window.location.origin}/invite/${invitation.code}`

      setInviteCode(invitation.code)
      setInviteUrl(inviteLink)

      toast.success("Invitation link created successfully")
    } catch (error: any) {
      console.error("Failed to create invitation:", error)

      // More specific error message based on status code
      if (error.response?.status === 404) {
        toast.error("Invitation service is not available. Please try again later.")
      } else if (error.response?.status === 401) {
        toast.error("You need to be logged in to create invitations")
      } else {
        toast.error("Failed to create invitation link")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyInvite = async () => {
    if (!inviteUrl) return

    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      toast.success("Invite link copied to clipboard")

      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
      toast.error("Failed to copy invite link")
    }
  }

  const handleShareInvite = async () => {
    if (!inviteUrl) return

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join me on Echo Chat",
          text: `${user?.username} has invited you to join Echo Chat`,
          url: inviteUrl,
        })
        toast.success("Invitation shared successfully")
      } else {
        // Fallback to copy if Web Share API not available
        await handleCopyInvite()
      }
    } catch (error) {
      console.error("Error sharing:", error)
      toast.error("Could not share invitation")
    }
  }

  const handleSendEmailInvite = () => {
    if (!inviteUrl || !email) return

    // Open mail client with pre-filled content
    const subject = "Join me on Echo Chat"
    const body = `Hello,\n\nI'd like to invite you to join me on Echo Chat. Click the link below to accept the invitation:\n\n${inviteUrl}\n\nBest regards,\n${user?.username}`

    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
    toast.success("Email client opened")
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={`${fullWidth ? "w-full" : ""} ${className}`}
        onClick={() => setIsOpen(true)}
      >
        <Share2 className="h-4 w-4 mr-2" />
        Invite People
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite people to join</DialogTitle>
            <DialogDescription>
              {channelId ? "Generate a link to invite people to this channel" : "Invite others to join Echo Chat"}
            </DialogDescription>
          </DialogHeader>

          {!inviteCode ? (
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  You can provide an email to pre-fill the recipient when sharing
                </p>
              </div>

              <Button onClick={handleCreateInvite} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></span>
                    Generating...
                  </>
                ) : (
                  "Generate Invite Link"
                )}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="invite-link">Invite Link</Label>
                <div className="flex items-center gap-2">
                  <Input id="invite-link" value={inviteUrl} readOnly className="flex-1" />
                  <Button size="icon" variant="outline" onClick={handleCopyInvite}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Share</Label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="flex-1" onClick={handleShareInvite}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>

                  {email && (
                    <Button variant="outline" className="flex-1" onClick={handleSendEmailInvite}>
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="secondary"
              className="mx-auto"
              onClick={() => {
                if (inviteCode) {
                  setInviteCode("")
                  setInviteUrl("")
                } else {
                  setIsOpen(false)
                }
              }}
            >
              {inviteCode ? "Create New Invite" : "Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
