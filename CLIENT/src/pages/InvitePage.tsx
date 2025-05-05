"use client"

import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { redeemInvitation, getPublicInviteDetails } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { Loader2, Check, X, UserPlus } from "lucide-react"

interface InviteData {
  invitation: {
    code: string
    createdBy: {
      id: string
      username: string
      avatar?: string
    }
    channel?: {
      id: string
      name: string
      type: string
    }
    expires: string
  }
}

export default function InvitePage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inviteData, setInviteData] = useState<InviteData | null>(null)
  const [isRedeeming, setIsRedeeming] = useState(false)

  useEffect(() => {
    const checkInvitation = async () => {
      if (!code) {
        setError("Invalid invitation link")
        setIsLoading(false)
        return
      }

      try {
        // Use the public endpoint which doesn't require authentication
        const data = await getPublicInviteDetails(code)
        setInviteData(data)
      } catch (error: any) {
        const message = error.response?.data?.error?.message || "This invitation is invalid or has expired"
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    checkInvitation()
  }, [code])

  const handleRedeemInvite = async () => {
    if (!code) return

    // If user is not authenticated, redirect to auth page with invite code
    if (!isAuthenticated) {
      // Redirect to auth page with invite code as parameter
      navigate(`/auth?invite=${code}`)
      return
    }

    setIsRedeeming(true)

    try {
      const result = await redeemInvitation(code)
      toast.success(result.message || "Invitation accepted successfully")

      // Navigate to the channel if this was a channel invite
      if (result.channel) {
        navigate(`/chat/${result.channel.id}`)
      } else {
        navigate("/chat")
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || "Failed to accept invitation"
      toast.error(message)
    } finally {
      setIsRedeeming(false)
    }
  }

  const handleCancel = () => {
    navigate("/chat")
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 mx-auto text-primary mb-4" />
          <p className="text-white">Verifying invitation...</p>
        </div>
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <Card className="w-full max-w-md mx-auto border-destructive shadow-xl">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="flex items-center text-destructive">
              <X className="h-5 w-5 mr-2" />
              Invalid Invitation
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter className="pt-5">
            <Button onClick={handleCancel} className="w-full">
              Go to Chat
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Render invitation details
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <Card className="w-full max-w-md mx-auto shadow-xl">
        <CardHeader className="text-center border-b border-border pb-6">
          <div className="flex justify-center">
            <Avatar className="h-16 w-16 mb-4">
              {inviteData?.invitation?.createdBy?.avatar ? (
                <AvatarImage src={inviteData.invitation.createdBy.avatar} />
              ) : (
                <AvatarFallback>
                  {inviteData?.invitation?.createdBy?.username.charAt(0).toUpperCase() || "?"}
                </AvatarFallback>
              )}
            </Avatar>
          </div>
          <CardTitle className="text-2xl">You've been invited!</CardTitle>
          <CardDescription className="text-base mt-1">
            <span className="font-medium">{inviteData?.invitation?.createdBy?.username}</span>
            {" has invited you to join "}
            {inviteData?.invitation?.channel ? `the "${inviteData.invitation.channel.name}" channel` : "Echo Chat"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <UserPlus className="h-5 w-5 text-primary" />
            <span className="text-sm">
              {isAuthenticated ? "Click accept to join" : "You need to sign up or log in to accept this invitation"}
            </span>
          </div>
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={handleCancel}>
            Cancel
          </Button>
          <Button className="flex-1" disabled={isRedeeming} onClick={handleRedeemInvite}>
            {isRedeeming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Accepting...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                {isAuthenticated ? "Accept Invite" : "Sign Up & Join"}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
