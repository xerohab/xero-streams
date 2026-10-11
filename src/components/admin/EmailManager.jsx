import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Mail } from "lucide-react";
import toast from "react-hot-toast";

export default function EmailManager() {
  const [recipient, setRecipient] = useState("all");
  const [individualEmail, setIndividualEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => base44.entities.User.list()
  });

  const handleSend = async (e) => {
    e.preventDefault();
    if (!subject || !body) return toast.error("Subject and body are required");

    setSending(true);
    try {
      let targetEmails = [];
      if (recipient === "all") {
        targetEmails = users.map(u => u.email).filter(Boolean);
      } else {
        if (!individualEmail) {
          setSending(false);
          return toast.error("Please specify an email address");
        }
        targetEmails = [individualEmail];
      }

      if (targetEmails.length === 0) {
        setSending(false);
        return toast.error("No recipients found");
      }

      // Send emails sequentially or in chunks to avoid rate limits
      for (const email of targetEmails) {
        await base44.integrations.Core.SendEmail({
          to: email,
          subject: subject,
          body: body
        });
      }

      toast.success(`Sent email to ${targetEmails.length} recipient(s)`);
      setSubject("");
      setBody("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to send emails");
    }
    setSending(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Mail className="w-5 h-5 text-primary" /> Email Users</h3>
      </div>

      <form onSubmit={handleSend} className="bg-secondary p-5 border border-border rounded-lg space-y-4 max-w-2xl">
        <div className="space-y-2">
          <label className="text-sm font-medium">Recipient</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" checked={recipient === "all"} onChange={() => setRecipient("all")} className="accent-primary" />
              All Users ({users.length})
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={recipient === "individual"} onChange={() => setRecipient("individual")} className="accent-primary" />
              Individual User
            </label>
          </div>
        </div>

        {recipient === "individual" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">User Email</label>
            <Input value={individualEmail} onChange={e => setIndividualEmail(e.target.value)} placeholder="user@example.com" className="bg-background" />
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Subject</label>
          <Input value={subject} onChange={e => setSubject(e.target.value)} required className="bg-background" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Message Body</label>
          <Textarea value={body} onChange={e => setBody(e.target.value)} required className="bg-background h-40" />
        </div>

        <Button type="submit" disabled={sending} className="w-full">
          {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
          Send Email
        </Button>
      </form>
    </div>
  );
}
