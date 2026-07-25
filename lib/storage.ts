"use client";
import type { Reservation } from "./types";
const KEY = "lg-properties-reservations";
export function listReservations(): Reservation[] {
 if (typeof window === "undefined") return [];
 try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
export function saveReservation(reservation: Reservation) {
 const items = listReservations(); localStorage.setItem(KEY, JSON.stringify([reservation, ...items]));
}
export function replaceReservations(items: Reservation[]) { localStorage.setItem(KEY, JSON.stringify(items)); }
