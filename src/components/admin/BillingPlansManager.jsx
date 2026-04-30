import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Pencil, Trash } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export default function BillingPlansManager() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["subscription_plans"],
    queryFn: () => base44.entities.SubscriptionPlan.list()
  });

  const createPlan = useMutation({
    mutationFn: (data) => base44.entities.SubscriptionPlan.create(data),
    onSuccess: () => { queryClient.invalidateQueries(["subscription_plans"]); setEditing(null); }
  });

  const updatePlan = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SubscriptionPlan.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(["subscription_plans"]); setEditing(null); }
  });

  const deletePlan = useMutation({
    mutationFn: (id) => base44.entities.SubscriptionPlan.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["subscription_plans"])
  });

  const handleSave = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get("name"),
      description: formData.get("description"),
      price: parseFloat(formData.get("price")),
      interval: formData.get("interval"),
      is_active: formData.get("is_active") === "on"
    };

    if (editing?.id) {
      updatePlan.mutate({ id: editing.id, data });
    } else {
      createPlan.mutate(data);
    }
  };

  if (isLoading) return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Subscription Plans</h3>
        <Button onClick={() => setEditing({})} className="gap-2"><Plus className="w-4 h-4" /> New Plan</Button>
      </div>

      {editing !== null && (
        <form onSubmit={handleSave} className="bg-secondary p-4 rounded-lg space-y-4">
          <Input name="name" placeholder="Plan Name" defaultValue={editing.name} required />
          <Textarea name="description" placeholder="Description" defaultValue={editing.description} />
          <div className="flex gap-4">
            <Input name="price" type="number" step="0.01" placeholder="Price" defaultValue={editing.price} required />
            <select name="interval" defaultValue={editing.interval || "monthly"} className="bg-background border border-input rounded-md px-3 py-1">
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Switch name="is_active" defaultChecked={editing.is_active !== false} />
            <label className="text-sm">Active</label>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      )}

      <div className="grid gap-3">
        {plans.map(plan => (
          <div key={plan.id} className="flex justify-between items-center bg-secondary p-4 rounded-lg">
            <div>
              <p className="font-bold">{plan.name} <span className="text-muted-foreground font-normal ml-2">${plan.price}/{plan.interval}</span></p>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
              {!plan.is_active && <span className="text-xs text-destructive">Inactive</span>}
            </div>
            <div className="flex gap-2">
              <Button size="icon" variant="ghost" onClick={() => setEditing(plan)}><Pencil className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if(confirm("Delete?")) deletePlan.mutate(plan.id); }}><Trash className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}