import { redirect } from "next/navigation";

// A raiz não expõe nada: o tablet abre /totem e o RH acessa /admin.
export default function Home() {
  redirect("/totem");
}
