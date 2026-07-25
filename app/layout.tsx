import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata={title:"LG Properties",description:"Santa Marina y Villa Ernesta: mar, naturaleza y experiencias memorables."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
