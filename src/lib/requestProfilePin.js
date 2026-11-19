let pending=false;
let cancelPending=null;
export function cancelProfilePin(){cancelPending?.();}
export function requestProfilePin(message, { recovery = false } = {}){
 if(pending)return Promise.resolve(null);
 pending=true;
 return new Promise(resolve=>{
 const dialog=document.createElement("dialog");
 dialog.setAttribute("aria-label",message);
 dialog.className="rounded-xl border border-border bg-background text-foreground p-6 w-80 max-w-full";
 const form=document.createElement("form");form.className="flex flex-col gap-4";
 const label=document.createElement("label");label.textContent=message;
 const input=document.createElement("input");input.type="password";input.inputMode=recovery?"text":"numeric";input.autocomplete="off";input.maxLength=recovery?32:8;input.pattern=recovery?"[a-fA-F0-9]{32}":"[0-9]{4,8}";input.required=true;input.className="block w-full rounded border border-border bg-background p-2 mt-2";label.append(input);
 const buttons=document.createElement("div");buttons.className="flex justify-end gap-3";
 const cancel=document.createElement("button");cancel.type="button";cancel.textContent="Cancel";
 const submit=document.createElement("button");submit.type="submit";submit.textContent="Continue";submit.className="rounded bg-primary text-primary-foreground px-3 py-2";
 buttons.append(cancel,submit);form.append(label,buttons);dialog.append(form);document.body.append(dialog);
 let done=false;const finish=value=>{if(done)return;done=true;pending=false;cancelPending=null;input.value="";dialog.remove();resolve(value);};
 cancelPending=()=>finish(null);
 cancel.onclick=()=>finish(null);dialog.addEventListener("cancel",e=>{e.preventDefault();finish(null);});form.onsubmit=e=>{e.preventDefault();finish(input.value);};
 try{dialog.showModal();input.focus();}catch{finish(null);}
 });
}
