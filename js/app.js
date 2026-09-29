"use strict";
const $ = (s) => document.querySelector(s);
const pagina = document.body.dataset.page;


/* Favoritos en localStorage */
const F = {
  ids() { try { return JSON.parse(localStorage.getItem("poliradar-fav")) || []; } catch { return []; } },
  has(id) { return this.ids().includes(id); },
  toggle(id) {
    const a = this.ids();
    const n = a.includes(id) ? a.filter((x) => x !== id) : [...a, id];
    try { localStorage.setItem("poliradar-fav", JSON.stringify(n)); } catch {}
  }
};

const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const card = (n) => `<article class="card"><a class="thumb" data-cat="${n.categoria}" href="articulo.html?id=${n.id}" tabindex="-1" aria-hidden="true">${n.imagen ? `<img src="${n.imagen}" alt="" onerror="this.remove()">` : ""}<span class="tag">${n.categoria}</span></a><div class="cb"><h3>${n.titulo}</h3><p>${n.resumen}</p><div class="pie-c"><time>${n.fecha}</time><span><button class="fav${F.has(n.id)?" on":""}" data-id="${n.id}" aria-pressed="${F.has(n.id)}" aria-label="Marcar como favorito">♥</button><a class="btn sm" href="articulo.html?id=${n.id}">Ver más</a></span></div></div></article>`;

let pintar = () => {};
document.addEventListener("click", (e) => {
  const b = e.target.closest(".fav");
  if (b) { F.toggle(Number(b.dataset.id)); pintar(); }
});

/* Formulario con validaciones */
function iniciarFormulario() {
  const reglas = {
    nombre: (v) => v.trim().length >= 3 || "Escribe tu nombre (mínimo 3 letras).",
    correo: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || "Escribe un correo válido, por ejemplo nombre@correo.com.",
    asunto: (v) => v.trim().length >= 3 || "Escribe el asunto del mensaje.",
    mensaje: (v) => v.trim().length >= 10 || "El mensaje debe tener al menos 10 caracteres."
  };
  const form = $("#form");
  const revisar = (campo) => {
    const r = reglas[campo.name](campo.value);
    const ok = r === true;
    form.querySelector(`[data-for="${campo.name}"]`).textContent = ok ? "" : r;
    campo.setAttribute("aria-invalid", String(!ok));
    return ok;
  };
  Object.keys(reglas).forEach((n) => form[n].addEventListener("blur", () => revisar(form[n])));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const validos = Object.keys(reglas).map((n) => revisar(form[n]));
    if (validos.every(Boolean)) {
      form.reset();
      $("#ok").hidden = false;
    } else {
      $("#ok").hidden = true;
      form.querySelector('[aria-invalid="true"]').focus();
    }
  });
}

/* Páginas con noticias */
async function iniciar() {
  let datos;
  try {
    const r = await fetch("data/noticias.json");
    if (!r.ok) throw new Error(r.status);
    datos = await r.json();
  } catch {
    $("main").innerHTML = '<p class="wrap aviso">No se pudieron cargar las noticias. Abre el sitio con un servidor local (por ejemplo, la extensión Live Server de VS Code) en lugar de abrir el archivo con doble clic.</p>';
    return;
  }

  if (pagina === "inicio") {
    pintar = () => { $("#lista").innerHTML = datos.slice(0, 3).map(card).join(""); };
  }

  if (pagina === "noticias") {
    const POR_PAGINA = 6;
    let q = "", cat = "", p = 1;
    [...new Set(datos.map((n) => n.categoria))].forEach((c) => $("#cat").insertAdjacentHTML("beforeend", `<option>${c}</option>`));
    pintar = () => {
      const f = datos.filter((n) => (!cat || n.categoria === cat) && norm(n.titulo + " " + n.resumen).includes(norm(q)));
      const total = Math.max(1, Math.ceil(f.length / POR_PAGINA));
      p = Math.min(p, total);
      $("#lista").innerHTML = f.slice((p - 1) * POR_PAGINA, p * POR_PAGINA).map(card).join("") || '<p class="aviso">No hay noticias con esa búsqueda. Prueba con otra palabra o cambia la categoría.</p>';
      $("#pag").innerHTML = total > 1 ? Array.from({ length: total }, (_, i) => `<button class="${i + 1 === p ? "on" : ""}" data-p="${i + 1}" aria-label="Página ${i + 1}">${i + 1}</button>`).join("") : "";
    };
    $("#filtros").addEventListener("submit", (e) => { e.preventDefault(); q = $("#q").value; cat = $("#cat").value; p = 1; pintar(); });
    $("#cat").addEventListener("change", () => $("#filtros").requestSubmit());
    $("#pag").addEventListener("click", (e) => { const b = e.target.closest("[data-p]"); if (b) { p = Number(b.dataset.p); pintar(); } });
  }

  if (pagina === "favoritos") {
    pintar = () => {
      const f = datos.filter((n) => F.has(n.id));
      $("#lista").innerHTML = f.map(card).join("");
      $("#vacio").hidden = f.length > 0;
    };
  }

  if (pagina === "articulo") {
    const n = datos.find((x) => x.id === Number(new URLSearchParams(location.search).get("id")));
    if (!n) { $("main").innerHTML = '<p class="wrap aviso">No encontramos esa noticia. <a href="noticias.html"><u>Vuelve al listado</u></a> y elige otra.</p>'; return; }
    document.title = `Poliradar · ${n.titulo}`;
    $("#hero").dataset.cat = n.categoria;
    $("#tit").textContent = n.titulo;
    if (n.imagen) { $("#foto").src = n.imagen; $("#foto").alt = n.titulo; $("#foto").hidden = false; }
    $("#cuerpo").innerHTML = n.contenido.split("\n").map((t) => `<p>${t}</p>`).join("");
    $("#i-cat").textContent = n.categoria;
    $("#i-fecha").textContent = n.fecha;
    $("#i-autor").textContent = n.autor;
    pintar = () => { $("#favbtn").textContent = F.has(n.id) ? "Quitar de favoritos" : "Marcar como favorito"; };
    $("#favbtn").addEventListener("click", () => { F.toggle(n.id); pintar(); });
  }
  pintar();
}

if (pagina === "contacto") iniciarFormulario(); else iniciar();
