"use client";
import { useState } from "react";
import ChatNovios from "@/components/ChatNovios";

export default function PestanasBoda({ token, yo, titulares, comercial, miBoda }: {
  token: string; yo: { nombre: string; posicion: number }; titulares: string; comercial: { nombre: string; foto: string | null } | null; miBoda: React.ReactNode;
}) {
  const [pestana, setPestana] = useState<"chat" | "boda">("chat");
  const estilo = (activa: boolean) => ({ flex: 1, height: 48, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: activa ? 600 : 500, color: activa ? "#282828" : "#5E5A52", background: "none", border: 0, borderBottom: `3px solid ${activa ? "#F3AF42" : "transparent"}`, cursor: "pointer", fontFamily: "inherit" });
  return (
    <>
      <nav aria-label="Secciones" role="tablist" style={{ display: "flex", background: "#fff", borderBottom: "1px solid #EFE3C6" }}>
        <button role="tab" aria-selected={pestana === "chat"} type="button" style={estilo(pestana === "chat")} onClick={() => setPestana("chat")}>Chat</button>
        <button role="tab" aria-selected={pestana === "boda"} type="button" style={estilo(pestana === "boda")} onClick={() => setPestana("boda")}>Mi boda</button>
      </nav>
      <div style={{ flex: 1, minHeight: 0, display: pestana === "chat" ? "flex" : "none", flexDirection: "column" }}><ChatNovios token={token} yo={yo} titulares={titulares} comercial={comercial} /></div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: pestana === "boda" ? "block" : "none" }}>{miBoda}</div>
    </>
  );
}
