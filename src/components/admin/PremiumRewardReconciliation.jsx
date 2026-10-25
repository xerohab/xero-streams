import React, {useState} from "react";
import {base44} from "@/api/base44Client";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Loader2} from "lucide-react";

export default function PremiumRewardReconciliation(){
 const [eventType,setEventType]=useState("purchase_refunded");
 const [orderId,setOrderId]=useState(""),[reference,setReference]=useState("");
 const [pending,setPending]=useState(false),[result,setResult]=useState(null);
 async function submit(event){
  event.preventDefault();setPending(true);setResult(null);
  try{
   const {data}=await base44.functions.invoke("reconcilePremiumReward",{event_type:eventType,orderId:orderId.trim(),reference:reference.trim()});
   if(data?.provider_verified!==true||data.event_submitted!==true)throw Error("The request was not submitted.");
   setResult({ok:true,message:"Verified and submitted for reward processing. Check PerkSphere history for the outcome."});
  }catch(error){
   setResult({ok:false,message:error.response?.data?.error||"The payment could not be verified or reconciliation is paused. No refund was initiated."});
  }finally{setPending(false);}
 }
 return <section className="rounded-lg border border-border/60 bg-card/40 p-4">
  <h3 className="text-sm font-semibold">Premium reward reconciliation</h3>
  <p className="mt-2 text-xs text-muted-foreground">Check a completed refund or resolved full chargeback against PayPal. This submits a reward-reversal request; it does not refund money. Partial disputes require manual review.</p>
  <form onSubmit={submit} className="mt-4 space-y-3">
   <div>
    <label htmlFor="premium-reversal-type" className="mb-1 block text-xs">Provider outcome</label>
    <select id="premium-reversal-type" value={eventType} onChange={e=>{setEventType(e.target.value);setResult(null);}} disabled={pending} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
     <option value="purchase_refunded">Completed refund</option>
     <option value="chargeback_issued">Resolved full chargeback</option>
    </select>
   </div>
   <div className="grid gap-3 sm:grid-cols-2">
    <div><label htmlFor="premium-order-id" className="mb-1 block text-xs">PayPal order ID</label><Input id="premium-order-id" value={orderId} onChange={e=>setOrderId(e.target.value)} required maxLength={100} pattern="[A-Za-z0-9_-]+" autoComplete="off" disabled={pending}/></div>
    <div><label htmlFor="premium-reversal-reference" className="mb-1 block text-xs">{eventType==="purchase_refunded"?"PayPal refund ID":"PayPal dispute ID"}</label><Input id="premium-reversal-reference" value={reference} onChange={e=>setReference(e.target.value)} required maxLength={100} pattern="[A-Za-z0-9_-]+" autoComplete="off" disabled={pending}/></div>
   </div>
   <Button type="submit" size="sm" disabled={pending}>{pending&&<Loader2 className="mr-2 h-4 w-4 animate-spin"/>}{pending?"Checking provider…":"Verify and submit"}</Button>
   {result&&<p role="status" aria-live="polite" className={"break-words text-xs "+(result.ok?"text-green-400":"text-destructive")}>{result.message}</p>}
  </form>
 </section>;
}
