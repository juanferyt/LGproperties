"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import { PriceCalendar } from "@/components/booking/price-calendar"
import { formatShortEs, nightsBetween } from "@/lib/booking/date-utils"

type Property = { id:string; name:string; slug:string; capacity:number; deposit_percentage:number }
type Result = { id:string; code:string; property_name:string; total_amount:number; deposit_amount:number }
const money = new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0})

export function BookingForm(){
 const [properties,setProperties]=useState<Property[]>([]), [propertyId,setPropertyId]=useState("")
 const [checkIn,setCheckIn]=useState(""),[checkOut,setCheckOut]=useState(""),[adults,setAdults]=useState(2),[children,setChildren]=useState(0)
 const [modality,setModality]=useState<"accommodation"|"day_pass">("accommodation"),[fullName,setFullName]=useState(""),[email,setEmail]=useState(""),[phone,setPhone]=useState(""),[document,setDocument]=useState(""),[notes,setNotes]=useState("")
 const [paymentOption,setPaymentOption]=useState<"deposit"|"full">("deposit"),[acceptedTerms,setAcceptedTerms]=useState(false),[loading,setLoading]=useState(false),[paying,setPaying]=useState(false),[error,setError]=useState(""),[done,setDone]=useState<Result|null>(null)
 const [showCalendar,setShowCalendar]=useState(false)
 const [showTransferDetails,setShowTransferDetails]=useState(false)
 const [transferDetails,setTransferDetails]=useState<{bankName:string;bankAccountType:string;bankAccountNumber:string;bankAccountHolder:string;bankAccountDocument:string;whatsappNumber:string}|null>(null)
 const [transferLoading,setTransferLoading]=useState(false)
 const [uploadingProof,setUploadingProof]=useState(false)
 const [proofMessage,setProofMessage]=useState("")
 const fileInputRef=useRef<HTMLInputElement>(null)
 useEffect(()=>{fetch('/api/properties').then(r=>r.json()).then(d=>{if(Array.isArray(d)){setProperties(d);setPropertyId(d[0]?.id||"")}}).catch(()=>setError('No se pudieron cargar las propiedades. Revisa la conexión con Supabase.'))},[])
 const selected=useMemo(()=>properties.find(p=>p.id===propertyId),[properties,propertyId])
 async function submit(e:React.FormEvent){e.preventDefault();setError('');setLoading(true);try{
  const res=await fetch('/api/reservations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({propertyId,fullName,email,phone,document,checkIn,checkOut,adults,children,modality,notes,paymentOption,acceptedTerms})})
  const data=await res.json(); if(!res.ok)throw new Error(data.error||'No se pudo crear la reserva'); setDone(data)
 }catch(err:any){setError(err.message)}finally{setLoading(false)}}
 async function payNow(){if(!done?.id)return;setPaying(true);setError('');try{const res=await fetch('/api/payments/wompi/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bookingId:done.id})});const data=await res.json();if(!res.ok)throw new Error(data.error||'No se pudo crear el pago');if(data.checkoutUrl){window.location.href=data.checkoutUrl}else{throw new Error('No se pudo abrir el checkout de Wompi')}}catch(err:any){setError(err.message)}finally{setPaying(false)}}
 async function openTransferDetails(){if(!done?.id)return;setTransferLoading(true);setError('');setProofMessage('');try{const res=await fetch('/api/transfers/details');const data=await res.json();if(!res.ok)throw new Error(data.error||'No se pudieron cargar los datos de transferencia');setTransferDetails(data);setShowTransferDetails(true)}catch(err:any){setError(err.message)}finally{setTransferLoading(false)}}
 async function handleProofSelection(e:React.ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];if(!done?.id||!file)return;setUploadingProof(true);setError('');setProofMessage('');const formData=new FormData();formData.append('bookingId',done.id);formData.append('file',file);try{const res=await fetch('/api/transfers/upload',{method:'POST',body:formData});const data=await res.json();if(!res.ok)throw new Error(data.error||'No se pudo enviar el comprobante');setProofMessage('Comprobante enviado correctamente. Lo revisaremos pronto.')}catch(err:any){setError(err.message)}finally{setUploadingProof(false);e.target.value=''}}
 if(done){const msg=encodeURIComponent(`Hola, solicité la reserva ${done.code} para ${done.property_name}. Total: ${money.format(done.total_amount)}. Anticipo: ${money.format(done.deposit_amount)}.`);return <div className="rounded-[2rem] bg-white p-8 shadow-luxury"><p className="text-xs uppercase tracking-[.25em] text-gold">Solicitud registrada</p><h2 className="mt-3 text-4xl">Reserva {done.code}</h2><p className="mt-4 text-black/60">Total: <b>{money.format(done.total_amount)}</b><br/>Valor a pagar ahora: <b>{money.format(done.deposit_amount)}</b></p><p className="mt-3 text-sm text-black/45">Guarda el código <b>{done.code}</b>: con él y tu correo puedes consultar el estado o cancelar tu reserva más adelante en <a className="underline" href="/mi-reserva">/mi-reserva</a>.</p>{error&&<p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap"><button onClick={payNow} disabled={paying} className="rounded-full bg-forest px-6 py-4 text-center font-semibold text-white disabled:opacity-50">{paying?'Generando pago…':'Pagar ahora con Wompi'}</button><button type="button" onClick={openTransferDetails} disabled={transferLoading} className="rounded-full border border-forest/20 bg-forest/5 px-6 py-4 text-center font-semibold text-forest disabled:opacity-50">{transferLoading?'Cargando datos…':'Pagar con transferencia'}</button><a className="rounded-full border border-black/10 px-6 py-4 text-center font-semibold text-black" href={`https://wa.me/${transferDetails?.whatsappNumber||'573122823625'}?text=${msg}`}>Continuar por WhatsApp</a></div>{showTransferDetails&&transferDetails&&<div className="mt-5 rounded-[1.5rem] border border-black/10 bg-[#faf6eb] p-5"><p className="text-sm font-semibold text-gold">Datos para transferir</p><div className="mt-3 space-y-2 text-sm text-black/70"><p><span className="font-semibold text-black">Banco:</span> {transferDetails.bankName}</p><p><span className="font-semibold text-black">Tipo de cuenta:</span> {transferDetails.bankAccountType}</p><p><span className="font-semibold text-black">Número:</span> {transferDetails.bankAccountNumber}</p><p><span className="font-semibold text-black">Titular:</span> {transferDetails.bankAccountHolder}</p><p><span className="font-semibold text-black">Documento:</span> {transferDetails.bankAccountDocument}</p></div><p className="mt-4 text-sm text-black/60">Una vez realices la transferencia, sube el comprobante para que lo revisemos.</p><div className="mt-4 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={()=>fileInputRef.current?.click()} disabled={uploadingProof} className="rounded-full bg-gold px-5 py-3 text-center font-semibold text-white disabled:opacity-50">{uploadingProof?'Enviando comprobante…':'Enviar comprobante'}</button><a className="rounded-full border border-black/10 px-5 py-3 text-center font-semibold text-black" href={`https://wa.me/${transferDetails.whatsappNumber}?text=${msg}`}>Avisar por WhatsApp</a></div>{proofMessage&&<p className="mt-3 text-sm text-green-700">{proofMessage}</p>}<input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={handleProofSelection}/></div>}</div>}
 return <form onSubmit={submit} className="rounded-[2rem] bg-white p-7 shadow-luxury"><p className="text-xs uppercase tracking-[.25em] text-gold">Reserva segura</p><h2 className="mt-3 text-4xl">Planea tu experiencia</h2>{error&&<p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}<div className="mt-7 grid gap-4 md:grid-cols-2">
 <label className="grid gap-2 text-sm">Propiedad<select required value={propertyId} onChange={e=>setPropertyId(e.target.value)} className="rounded-xl border p-3"><option value="">Selecciona</option>{properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
 <label className="grid gap-2 text-sm">Modalidad<select value={modality} onChange={e=>setModality(e.target.value as any)} className="rounded-xl border p-3"><option value="accommodation">Alojamiento</option>{selected?.slug==='villa-ernesta'&&<option value="day_pass">Pasadía</option>}</select></label>
 <label className="grid gap-2 text-sm">Adultos<input required type="number" min="1" max={selected?.capacity||20} value={adults} onChange={e=>setAdults(+e.target.value)} className="rounded-xl border p-3"/></label><label className="grid gap-2 text-sm">Niños<input type="number" min="0" value={children} onChange={e=>setChildren(+e.target.value)} className="rounded-xl border p-3"/></label>
 <div className="grid gap-2 text-sm md:col-span-2">
  <span>Fechas</span>
  <button type="button" onClick={()=>setShowCalendar(v=>!v)} className="flex items-center justify-between rounded-xl border p-3 text-left">
   <span>{checkIn&&checkOut?`${formatShortEs(checkIn)} – ${formatShortEs(checkOut)} · ${nightsBetween(checkIn,checkOut)} ${nightsBetween(checkIn,checkOut)===1?"noche":"noches"}`:"Selecciona entrada y salida"}</span>
   <span className="text-xs font-semibold text-gold">{showCalendar?"Cerrar calendario":checkIn&&checkOut?"Editar":"Abrir calendario"}</span>
  </button>
  {showCalendar&&propertyId&&(
   <div className="mt-2">
    <PriceCalendar
     propertyId={propertyId}
     propertySlug={selected?.slug}
     modality={modality}
     guests={adults+children}
     checkIn={checkIn}
     checkOut={checkOut}
     onConfirm={(ci,co)=>{setCheckIn(ci);setCheckOut(co);setShowCalendar(false)}}
    />
   </div>
  )}
 </div>
 <label className="grid gap-2 text-sm">Nombre completo<input required value={fullName} onChange={e=>setFullName(e.target.value)} className="rounded-xl border p-3"/></label><label className="grid gap-2 text-sm">Documento<input value={document} onChange={e=>setDocument(e.target.value)} className="rounded-xl border p-3"/></label>
 <label className="grid gap-2 text-sm">Correo<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="rounded-xl border p-3"/></label><label className="grid gap-2 text-sm">WhatsApp<input required value={phone} onChange={e=>setPhone(e.target.value)} className="rounded-xl border p-3"/></label>
 <label className="grid gap-2 text-sm">Forma de pago<select value={paymentOption} onChange={e=>setPaymentOption(e.target.value as any)} className="rounded-xl border p-3"><option value="deposit">Pagar anticipo</option><option value="full">Pagar totalidad</option></select></label><label className="grid gap-2 text-sm md:col-span-2">Notas<textarea value={notes} onChange={e=>setNotes(e.target.value)} className="min-h-24 rounded-xl border p-3"/></label>
 </div><label className="mt-5 flex gap-3 text-sm"><input type="checkbox" checked={acceptedTerms} onChange={e=>setAcceptedTerms(e.target.checked)}/><span>Acepto los <a className="underline" href="/legal/terminos">términos</a> y la <a className="underline" href="/legal/privacidad">política de privacidad</a>.</span></label><button disabled={loading||!acceptedTerms||!propertyId||!checkIn||!checkOut} className="mt-6 w-full rounded-full bg-gold px-6 py-4 font-semibold text-white disabled:opacity-50">{loading?'Validando disponibilidad…':'Solicitar reserva'}</button><p className="mt-3 text-xs text-black/45">La base de datos impide reservas duplicadas para las mismas fechas.</p></form>
}
