// Programmes 2027 · site privé. Déchiffre content.enc.json dans le navigateur puis affiche les sections.
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
  var inline = function (s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+?)\*/g, "$1<em>$2</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">lien</a>');
  };
  var md = function (s) {
    var out = [], list = null;
    String(s || "").split(/\n/).forEach(function (l) {
      var m = l.match(/^\s*[-*] (.*)$/);
      if (m) { (list = list || []).push("<li>" + inline(m[1]) + "</li>"); return; }
      if (list) { out.push("<ul>" + list.join("") + "</ul>"); list = null; }
      if (/^#{2,4} /.test(l)) { out.push("<h4>" + inline(l.replace(/^#+ /, "")) + "</h4>"); return; }
      if (l.trim()) out.push("<p>" + inline(l) + "</p>");
    });
    if (list) out.push("<ul>" + list.join("") + "</ul>");
    return out.join("");
  };
  var mt = function (txt, q) { if (!q) return true; var re = new RegExp("(^|[^a-z0-9])" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")); return re.test(txt); };
  var norm = function (s) { return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); };
  var b64d = function (s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  var b64e = function (u) { var s = ""; u = new Uint8Array(u); for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); };
  var enc = new TextEncoder();
  var DAY = 864e5, today = new Date(new Date().toDateString());
  var ELECTION = new Date("2027-04-18");
  var days = function (d) { return Math.round((new Date(d) - today) / DAY); };
  var fdate = function (iso, prec) {
    var d = new Date(iso);
    if (prec === "annee") return String(d.getFullYear());
    if (prec === "mois") return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  };


  // ---------- déchiffrement
  var bundle = null;
  function getBundle() {
    if (bundle) return Promise.resolve(bundle);
    return fetch("content.enc.json", { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("bundle"); return r.json(); }).then(function (b) { bundle = b; return b; });
  }
  function openWithKey(rawKey, b) {
    return crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["decrypt"])
      .then(function (k) { return crypto.subtle.decrypt({ name: "AES-GCM", iv: b64d(b.iv) }, k, b64d(b.ct)); })
      .then(function (gz) { return new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream("gzip"))).text(); })
      .then(JSON.parse);
  }
  function login(email, pw) {
    email = email.trim().toLowerCase();
    return getBundle().then(function (b) {
      return crypto.subtle.digest("SHA-256", enc.encode("programmes:" + email)).then(function (h) {
        var e = b.keys[b64e(h).slice(0, 22)];
        if (!e) throw new Error("auth");
        return crypto.subtle.importKey("raw", enc.encode(email + "\u0000" + pw), "PBKDF2", false, ["deriveKey"])
          .then(function (base) { return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: b64d(e.s), iterations: b.kdf.iter }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]); })
          .then(function (kek) { return crypto.subtle.decrypt({ name: "AES-GCM", iv: b64d(e.i) }, kek, b64d(e.w)); })
          .then(function (ck) { sessionStorage.setItem("pk", b64e(ck)); return openWithKey(ck, b); });
      });
    });
  }
  $("#login").addEventListener("submit", function (ev) {
    ev.preventDefault();
    $("#err").textContent = ""; $("#go").disabled = true; $("#go").textContent = "Vérification…";
    login("", $("#pw").value.trim()).then(start).catch(function () { $("#err").textContent = "Code incorrect."; })
      .then(function () { $("#go").disabled = false; $("#go").textContent = "Ouvrir"; });
  });
  $("#logout").addEventListener("click", function () { sessionStorage.removeItem("pk"); location.hash = ""; location.reload(); });
  if (sessionStorage.getItem("pk")) getBundle().then(function (b) { return openWithKey(b64d(sessionStorage.getItem("pk")), b); }).then(start).catch(function () { sessionStorage.removeItem("pk"); });

  // ---------- vocabulaire
  var VLAB = { "solide": "Bien fondée", "bonne-direction": "Bonne direction", "mal-ciblee": "Mal ciblée", "mal-calibree": "Mal calibrée", "mal-concue": "Mal conçue", "a-chiffrer": "À chiffrer", "a-preciser": "À préciser", "analyse-eco": "Analyse économique", "non-analysee": "Non analysée" };
  var VORD = ["solide", "bonne-direction", "a-preciser", "a-chiffrer", "mal-calibree", "mal-ciblee", "mal-concue", "analyse-eco"];
  var ELAB = { continuite: "Continuité", inflexion: "Inflexion", rupture: "Rupture" };
  var VSCORE = { "solide": 100, "bonne-direction": 70, "a-preciser": 50, "a-chiffrer": 50, "mal-calibree": 35, "mal-ciblee": 30, "mal-concue": 15 };
  var POS = { opposee: 70, partielle: 45, convergente: 20, absente: 5 };
  var PLAB = { opposee: "Opposée", partielle: "Désaccord partiel", convergente: "Proche", absente: "Pas de position" };
  var SENS = { forte: "Sensibilité forte", moyenne: "Sensibilité moyenne", faible: "Sensibilité faible" };
  var SLAB = { modifie: "Modifiée depuis le site", precise: "Précisée", nouveau: "Nouvelle (volume 1)", retire: "Retirée" };
  var viz = function (g) {
    var mx = Math.max.apply(null, g.valeurs.map(function (x) { return Math.abs(+x.valeur) || 0; })) || 1;
    return '<figure class="viz"><figcaption>' + esc(g.titre || "") + "</figcaption>" + g.valeurs.map(function (x) {
      return '<div class="vrow"><span class="vl">' + esc(x.label) + '</span><span class="vb"><i data-w="' + Math.round(100 * Math.abs(+x.valeur) / mx) + '"></i></span><span class="vv">' + esc(String(x.valeur).replace(".", ",")) + " " + esc(x.unite || "") + "</span></div>";
    }).join("") + '<p class="vs">Sources : ' + esc(g.valeurs.map(function (x) { return x.source; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; }).join(" ; ")) + "</p></figure>";
  };
  var badge = function (v, lab, cls) { return '<span class="badge ' + (cls || "b-") + esc(v) + '">' + esc(lab || VLAB[v] || v) + "</span>"; };
  var PISTE = /(Mieux vaut|La piste sérieuse|Privilégions|Ciblons|Réservons|Conditionnons|Il faut (?:plutôt|le|reprendre)|Je recommande|Préférer|Mieux vaudrait)[^.]*\./;
  var firstSentence = function (s) { var m = String(s || "").replace(/\s+/g, " ").match(/^.+?[.!?](?=\s|$)/); return m ? m[0] : ""; };
  var plural = function (n, s) { return n + " " + s + (n > 1 ? "s" : ""); };

  function start(C) {
    $("#login").hidden = true; $("#logout").hidden = false; $("#tabs").hidden = false; $("#gq").hidden = false;
    var app = $("#app"); app.hidden = false;
    var P = C.philippe, A = C.adversaires, anal = P.analyses, AT = C.attaques, TH = C.themes, SE = C.sensibilite || {};
    var RIV = AT ? AT.rivaux : [];
    var advById = {}; A.forEach(function (a) { advById[a.id] = a; });
    var blocOf = function (id) { return (RIV.filter(function (r) { return r.id === id; })[0] || {}).bloc || ""; };
    var CONTACT = (C.config || {}).contact, VER = {}, AJN = {};
    if (C.versions) C.versions.changements.forEach(function (v) { if (v.num != null) (VER[v.num] = VER[v.num] || []).push(v); });
    if (C.ajouts) C.ajouts.ajouts.forEach(function (a) { (a.mesures || []).forEach(function (n) { (AJN[n] = AJN[n] || []).push(a); }); });
    var corr = function (ref, title) {
      if (!CONTACT) return "";
      var s = "[Programmes 2027] Correction : " + ref + " " + String(title || "").slice(0, 80);
      return '<a class="corr" href="mailto:' + esc(CONTACT) + "?subject=" + encodeURIComponent(s) + "&body=" + encodeURIComponent("Élément concerné : " + ref + "\n\nCe qui est à corriger :\n\nSource (lien, page) :\n") + '">Signaler une erreur</a>';
    };
    var attScore = function (c) { if (!c || c.position === "absente") return POS.absente; return Math.min(95, POS[c.position] + (c.saillance ? 20 : 0)); };
    var byNum = {};
    P.mesures.forEach(function (m) {
      byNum[m.num] = m;
      var v = [];
      m.analyses.forEach(function (t) { (anal[t].verdicts || []).forEach(function (x) { if (v.indexOf(x) < 0) v.push(x); }); });
      v.sort(function (a, b) { return (VSCORE[a] == null ? 999 : VSCORE[a]) - (VSCORE[b] == null ? 999 : VSCORE[b]); });
      m._v = v.length ? v : ["non-analysee"];
      var sc = v.filter(function (x) { return VSCORE[x] != null; }).map(function (x) { return VSCORE[x]; });
      m._sol = sc.length ? sc.reduce(function (a, b) { return a + b; }, 0) / sc.length : null;
      m._att = (AT && AT.mesures[m.num]) || null; m._expo = 0; m._top = null;
      if (m._att) RIV.forEach(function (r) { var s = attScore(m._att[r.id]); if (s > m._expo) { m._expo = s; m._top = r.id; } });
      m._s = SE[m.num] || null;
      m._e = (C.eco || {})[m.num] || null;
      m._txt = norm("n°" + m.num + " " + m.titre + " " + (m.texte || "") + " " + m.section + " " + m.analyses.join(" "));
      var a0 = m.analyses.length ? anal[m.analyses[0]] : null;
      m._piste = a0 ? ((a0.fiche || a0.detail).match(PISTE) || [])[0] || null : null;
    });
    var PH = C.phares, PHN = {};
    if (PH) PH.mesures.forEach(function (x) { x.nums.forEach(function (n) { PHN[n] = x; }); });
    var thById = {}; TH.forEach(function (t) {
      thById[t.id] = t;
      t.mes = P.mesures.filter(function (m) { return m.theme === t.id; });
      t.an = t.mes.filter(function (m) { return m.analyses.length; });
      t.adv = A.map(function (a) {
        var items = []; a.themes.forEach(function (g) { g.items.forEach(function (it) { if (it.theme === t.id) items.push(it); }); });
        return { a: a, items: items, fiches: a.riposte ? a.riposte.fiches.filter(function (f) { return f.theme === t.id; }) : [] };
      });
      t.nadv = t.adv.reduce(function (n, x) { return n + x.items.length + x.fiches.length; }, 0);
    });

    // ---------- navigation : Accueil, un onglet par thème, Méthode
    var NAV = [["accueil", "Accueil"], ["priorites", "Priorités"], ["droite", "Convergences à droite"], ["etat", "Un État qui marche"], ["preparation", "Préparation"], ["electeurs", "Électeurs simulés"], ["organisation", "Améliorations organisationnelles"], ["chiffrage", "Chiffrage"], ["fiches", "Fiches"]].concat(TH.map(function (t) { return [t.id, t.court]; })).concat([["methode", "Méthode"]]);
    // ---------- Commentaires et suivi des modifications (Édouard Philippe) : brouillon local, envoi par courriel, affichage « track changes »
    var CK = "programmes2027-cmt:", CM = (C.commentaires && C.commentaires.items) || [];
    var wdiff = function (a, b) {
      var x = String(a || "").split(/(\s+)/), y = String(b || "").split(/(\s+)/), n = x.length, m = y.length, L = [], i, j;
      for (i = 0; i <= n; i++) L.push(new Array(m + 1).fill(0));
      for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--) L[i][j] = x[i] === y[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
      var out = "", di = "", ii = "", flush = function () { if (di) out += "<del>" + esc(di) + "</del>"; if (ii) out += "<ins>" + esc(ii) + "</ins>"; di = ""; ii = ""; };
      i = 0; j = 0;
      while (i < n && j < m) { if (x[i] === y[j]) { flush(); out += esc(x[i]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) { di += x[i++]; } else { ii += y[j++]; } }
      while (i < n) di += x[i++];
      while (j < m) ii += y[j++];
      flush(); return out;
    };
    var cGet = function (id) { try { return JSON.parse(localStorage.getItem(CK + id) || "null"); } catch (e) { return null; } };
    var cAll = function () { var o = []; for (var k = 0; k < localStorage.length; k++) { var key = localStorage.key(k); if (key && key.indexOf(CK) === 0) { var v = cGet(key.slice(CK.length)); if (v) o.push(v); } } return o; };
    var cbox = function (id, label, texte) {
      var d = cGet(id), pub = CM.filter(function (c) { return c.id === id; });
      return '<div class="cmt" data-cid="' + esc(id) + '" data-orig="' + esc(texte) + '" data-label="' + esc(label) + '">' +
        pub.map(function (c) { return '<div class="box chg"><h4>' + esc(c.auteur || "Édouard Philippe") + " · " + esc(fdate(c.date)) + "</h4>" + (c.version && c.version !== texte ? '<p class="trk">' + wdiff(texte, c.version) + "</p>" : "") + (c.commentaire ? "<p><i>" + esc(c.commentaire) + "</i></p>" : "") + "</div>"; }).join("") +
        "<details" + (d ? " open" : "") + "><summary>Modifier ou commenter" + (d ? " (brouillon enregistré)" : "") + '</summary><p class="mut">' + esc(label) + ". Modifiez le texte directement : vos changements apparaissent barrés ou soulignés. Rien ne part tant que vous n'appuyez pas sur « Envoyer mes commentaires ».</p>" +
        '<textarea class="cv" rows="4">' + esc(d ? d.version : texte) + '</textarea><textarea class="cc" rows="2" placeholder="Commentaire (facultatif)">' + esc(d ? d.commentaire : "") + "</textarea>" +
        '<p class="trk cp">' + (d && d.version !== texte ? wdiff(texte, d.version) : "") + '</p><p class="filters"><button class="chip csave">Enregistrer le brouillon</button><button class="chip cclear">Effacer le brouillon</button><button class="chip csend">Envoyer mes commentaires (' + cAll().length + ")</button></p></details></div>";
    };
    var cSend = function () {
      var all = cAll(); if (!all.length) return;
      var body = "Commentaires sur le site Programmes 2027 (" + new Date().toLocaleDateString("fr-FR") + ")\n\n" + all.map(function (c) { return "### " + c.id + " | " + c.label + "\nTexte initial : " + c.texte + "\nVersion proposée : " + c.version + (c.commentaire ? "\nCommentaire : " + c.commentaire : ""); }).join("\n\n") + "\n\n--- format machine ---\n" + JSON.stringify(all);
      if (navigator.clipboard) navigator.clipboard.writeText(body).catch(function () {});
      var dest = (C.config && C.config.commentaires_dest) || "";
      location.href = "mailto:" + dest + "?subject=" + encodeURIComponent("[Programmes 2027] Commentaires") + "&body=" + encodeURIComponent(body.length > 1800 ? body.slice(0, 1800) + "\n[Texte complet copié dans le presse-papiers : collez-le ici.]" : body);
    };
    $("#tabs").innerHTML = NAV.map(function (s) { var t = thById[s[0]]; return '<button class="tab" role="tab" id="t-' + s[0] + '">' + esc(s[1]) + "" + "</button>"; }).join("");
    app.innerHTML = NAV.map(function (s) { return '<section class="panel" role="tabpanel" id="p-' + s[0] + '" hidden></section>'; }).join("") + '<section class="panel" id="p-recherche" hidden></section>';
    var cur = null;
    function go(id, sub, num) {
      if (!$("#p-" + id)) id = "accueil";
      $$(".tab").forEach(function (t) { t.setAttribute("aria-selected", t.id === "t-" + id); });
      $$("#app > .panel").forEach(function (p) { p.hidden = p.id !== "p-" + id; });
      cur = id;
      if (thById[id]) showSub(id, sub || "synthese");
      var nh = "#" + id + (thById[id] && sub && sub !== "synthese" ? "/" + sub : ""); if (location.hash !== nh) history.pushState(null, "", nh);
      if (num != null) { var el = $("#m" + num); if (el) { el.open = true; el.scrollIntoView({ block: "start" }); return; } }
      window.scrollTo(0, 0);
    }
    $$(".tab").forEach(function (t) { t.addEventListener("click", function () { $("#gq").value = ""; go(t.id.slice(2)); }); });

    // ---------- éléments communs
    var sensB = function (m) { return m._s ? badge(m._s.niveau, SENS[m._s.niveau], "s-") : ""; };
    var vbar = function (list) {
      var c = {}; list.forEach(function (m) { c[m._v[0]] = (c[m._v[0]] || 0) + 1; });
      var tot = VORD.reduce(function (n, v) { return n + (c[v] || 0); }, 0); if (!tot) return "";
      return '<div class="vbar" title="Répartition des verdicts">' + VORD.filter(function (v) { return c[v]; }).map(function (v) { return '<i class="b-' + v + '" data-f="' + c[v] + '" title="' + esc(VLAB[v]) + " : " + c[v] + '"></i>'; }).join("") + "</div>";
    };
    var vcounts = function (list) {
      var c = {}; list.forEach(function (m) { c[m._v[0]] = (c[m._v[0]] || 0) + 1; });
      return VORD.filter(function (v) { return c[v]; }).map(function (v) { return badge(v, VLAB[v] + " " + c[v]); }).join(" ");
    };
    var posLine = function (m) {
      if (!m._att) return "";
      return '<p class="pos">' + RIV.map(function (r) { var c = m._att[r.id]; var p = c ? c.position : "absente"; return '<span class="p-' + p + '"><b>' + esc(r.bloc) + "</b> " + esc(PLAB[p]) + "</span>"; }).join("") + "</p>";
    };
    function card(m) {
      var h = '<details class="mes v-' + m._v[0] + '" id="m' + m.num + '"><summary><div class="mh"><span class="num">N°' + m.num + "</span>" + badge(m._v[0]) + (m._e && ELAB[m._e.ecart] ? badge(m._e.ecart, ELAB[m._e.ecart], "e-") : "") + sensB(m) + (PHN[m.num] ? badge("phare", "Mesure phare jeunes", "x-") : "") + "</div>" +
        '<div class="mt">' + esc(m.titre) + "</div>";
      var one = m.analyses.length ? firstSentence(anal[m.analyses[0]].fiche || anal[m.analyses[0]].detail) : "";
      if (one) h += '<p class="verd">' + inline(one) + "</p>";
      h += "</summary><div class=\"mb\">";
      if (m.texte) h += '<blockquote class="livret">' + esc(m.texte) + '<cite>Livret, p. ' + esc(m.page) + "</cite></blockquote>";
      if (m._e) h += '<div class="box eco"><p><b>Coût estimé :</b> ' + inline(m._e.cout) + "</p>" + (m._e.ecart_pourquoi ? "<p><b>" + esc(ELAB[m._e.ecart] || "Écart") + " par rapport à aujourd'hui :</b> " + inline(m._e.ecart_pourquoi) + "</p>" : "") + "</div>";
      if (m._s) h += '<p class="sens"><b>' + esc(SENS[m._s.niveau]) + "</b> (prédiction du groupe) : " + esc(m._s.pourquoi) + "</p>";
      if (m._piste || (m.edl_propose && m.edl_propose.par_analyse)) {
        var ep = m.edl_propose && m.edl_propose.par_analyse && m.edl_propose.par_analyse[0];
        h += '<div class="box chg"><h4>Ce qu\'il faudrait changer</h4>' + (m._piste ? "<p>" + inline(m._piste) + "</p>" : ep && ep.pourquoi ? "<p>" + inline(firstSentence(ep.pourquoi)) + "</p>" : "");
        h += cbox("mesure-" + m.num, "N°" + m.num + " · ce qu'il faudrait changer", m._piste || (ep && ep.pourquoi ? firstSentence(ep.pourquoi) : m.titre));
        if (m.edl_propose && m.edl_propose.par_analyse) m.edl_propose.par_analyse.forEach(function (e) { h += '<details class="in"><summary>Élément de langage proposé</summary>' + md(e.edl) + (e.pourquoi ? '<p class="mut">' + inline(e.pourquoi) + "</p>" : "") + "</details>"; });
        h += "</div>";
      }
      var rr = m._att ? RIV.map(function (r) { var c = m._att[r.id]; if (!c || c.position === "absente") return ""; return '<p class="arow"><span class="p-' + c.position + '"><b>' + esc(r.bloc) + "</b> " + esc(PLAB[c.position]) + "</span> " + esc(c.motif || c.proposition || "") + "</p>"; }).join("") : "";
      if (rr) h += '<div class="box"><h4>Face aux adversaires</h4>' + rr + "</div>";
      var CVm = C.convergences && C.convergences.par_mesure && C.convergences.par_mesure[m.num];
      if (CVm) { var PLD = { proche: "proche", partiel: "en partie d'accord", oppose: "opposé", absent: "pas de position" };
        h += '<p class="pos"><b>À droite :</b> ' + ["lisnard", "retailleau"].filter(function (k) { return CVm[k]; }).map(function (k) { var x = CVm[k]; return '<span class="p-' + esc(x.position) + '"><b>' + (k === "lisnard" ? "Lisnard" : "Retailleau") + "</b> " + esc(PLD[x.position] || x.position) + (x.detail ? " : " + esc(x.detail) : "") + "</span>"; }).join(" ") + "</p>"; }
      var etu = ((C.notes_ext || {}).notes || []).filter(function (x) { return x.par_mesure && x.par_mesure[m.num]; });
      if (etu.length) h += '<div class="box"><h4>Autres études à prendre en compte</h4>' + etu.map(function (x) { var p = x.par_mesure[m.num]; return "<p><b>" + esc(x.source) + ", « " + esc(x.titre) + " » (" + esc(fdate(x.date)) + ")</b> · <i>" + esc(p.sens) + "</i> : " + esc(p.texte) + (x.url ? ' <a href="' + esc(encodeURI(decodeURI(x.url))) + '" target="_blank" rel="noopener">source</a>' : "") + "</p>"; }).join("") + "</div>";
      m.analyses.forEach(function (t, i) { var a = anal[t], x = a.fiche || a.detail; if (i === 0) { var fs = firstSentence(x); var k = x.indexOf(fs.split(" ").slice(0, 4).join(" ")); if (k >= 0 && k < 5) { var e = x.indexOf(fs.slice(-12)); if (e > 0) x = x.slice(e + 12); } } h += '<details class="in"><summary>Analyse' + (m.analyses.length > 1 ? " · " + esc(a.titre) : "") + "</summary>" + md(x) + (a.detail && a.fiche ? '<details class="in"><summary>Détail et sources</summary>' + md(a.detail) + "</details>" : "") + "</details>"; });
      if (m.edl && m.edl.length) h += '<details class="in"><summary>Ce que dit la campagne (' + m.edl.length + ")</summary>" + m.edl.map(function (e) { return "<p><strong>" + esc(e.question) + "</strong><br>" + esc(e.reponse) + '</p><p class="mut">' + esc(e.source) + "</p>"; }).join("") + "</details>";
      (VER[m.num] || []).forEach(function (v) { if (v.avant) h += '<details class="in"><summary>' + esc(SLAB[v.statut]) + " : avant / après</summary><p><b>Site :</b> " + esc(v.avant) + "</p><p><b>Livret :</b> " + esc(v.apres) + "</p>" + (v.note ? '<p class="mut">' + esc(v.note) + "</p>" : "") + "</details>"; });
      return h + "</div></details>";
    }
    var rid = function (t) { var x = 0, s = norm(t); for (var i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return "r" + (x >>> 0).toString(36); };
    // ---------- positions déclarées (2027 et moi, Licence Ouverte ; France-Vote en lien seulement)
    var X = C.externe, ELAB = { pour: "Pour", plutot_pour: "Plutôt pour", nuance: "Nuancé", plutot_contre: "Plutôt contre", contre: "Contre", non_connu: "Non connu" };
    var xsrc = function (s) { return s && s.url ? ' <a class="xs" href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.titre || "source") + (s.date ? ", " + esc(fdate(s.date, String(s.date).length === 7 ? "mois" : null)) : "") + "</a>" : ""; };
    var xcred = function () { return X ? '<p class="mut">Source : <a href="' + esc(X.source.url) + '" target="_blank" rel="noopener">2027 et moi</a>, données mises à jour le ' + fdate(X.source.mise_a_jour) + " (" + esc(X.source.licence) + "). Pour comparer, voir aussi " + X.candidats.map(function (c) { return '<a href="' + esc(X.france_vote[c.id]) + '" target="_blank" rel="noopener">' + esc(c.court) + "</a>"; }).join(", ") + ' sur France-Vote.</p>' : ""; };
    var xtable = function (qs) {
      if (!X || !qs.length) return "";
      return '<div class="scroll"><table class="cmp xt"><thead><tr><th>Question</th>' + X.candidats.map(function (c) { return "<th>" + esc(c.court) + "</th>"; }).join("") + "</tr></thead><tbody>" +
        qs.map(function (q) { return "<tr><td>" + esc(q.texte) + "</td>" + X.candidats.map(function (c) { var p = q.positions[c.id], v = p ? p.position : "non_connu"; return '<td class="e-' + v + '"><b class="ml">' + esc(c.court) + " : </b>" + esc(ELAB[v] || v) + (p && p.resume ? '<span class="mut">' + esc(p.resume) + xsrc(p.source) + "</span>" : "") + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>";
    };
    var mlink = function (m, extra) { return '<li><a href="#" data-n="' + m.num + '">N°' + m.num + " " + esc(m.titre) + "</a>" + (extra || "") + "</li>"; };

    // ---------- accueil
    var analysed = P.mesures.filter(function (m) { return m.analyses.length; });
    var fragile = analysed.filter(function (m) { return m._sol != null && m._sol < 50; }).sort(function (a, b) { return b._expo - a._expo; });
    $("#p-accueil").innerHTML =
      '<div class="intro"><p class="kick">Mis à jour le ' + fdate(C.genere_le) + " · J-" + days(ELECTION) + " avant le premier tour</p>" +
      "<h1>Le programme d'Édouard Philippe, mesure par mesure, face aux preuves et aux autres programmes</h1>" +
      '<p class="lead">' + P.mesures.length + " mesures du livret du 18 novembre. " + analysed.length + " sont passées au crible par nos agents de recherche : verdict, preuves, sensibilité politique, ce qu'il faudrait changer, et ce qu'en disent " + A.map(function (a) { return a.nom; }).join(", ").replace(/, ([^,]*)$/, " et $1") + ".</p>" + (C.priorites ? '<p class="tolinks"><a href="#priorites" data-go="priorites">Priorités : ce qui doit porter la campagne</a> · <a href="#preparation" data-go="preparation">Préparation du candidat : fiches, contre-attaques, entraînement</a></p>' : "") + "</div>" +
      (C.electeurs ? '<p class="tolinks"><a href="#electeurs" data-go="electeurs">Électeurs simulés : ' + (C.electeurs.personas || []).length + ' électeurs fictifs lisent le livret (simulation, pas un sondage)</a> · <a href="#organisation" data-go="organisation">Améliorations organisationnelles pour Horizons</a></p>' : "") +
      (C.notes_ext && C.notes_ext.notes.length ? '<h2 class="h2">Notes et commentaires reçus</h2><p class="mut">Relevés chaque matin (FIPECO et liens déposés par le groupe), puis lus et rattachés aux mesures.</p>' + C.notes_ext.notes.slice(0, 6).map(function (x) {
        return '<div class="box"><h4>' + (x.url ? '<a href="' + esc(encodeURI(decodeURI(x.url))) + '" target="_blank" rel="noopener">' + esc(x.titre) + "</a>" : esc(x.titre)) + "</h4><p class=\"mut\">" + esc([x.auteur, x.source, fdate(x.date)].filter(Boolean).join(" · ")) + " · " + esc(x.statut) + "</p>" + (x.resume ? "<p>" + esc(x.resume) + "</p>" : "") + (x.chiffres ? "<ul>" + x.chiffres.map(function (c) { return "<li>" + esc(c) + "</li>"; }).join("") + "</ul>" : "") + (x.ce_que_ca_change ? '<p class="rep"><b>Ce que cela change pour nous :</b> ' + esc(x.ce_que_ca_change) + "</p>" : "") + ((x.mesures_liees || []).length ? '<p class="mut">Mesures : ' + x.mesures_liees.map(function (n) { return '<a href="#" data-n="' + n + '">N°' + n + "</a>"; }).join(", ") + "</p>" : "") + "</div>";
      }).join("") : "") +
      '<h2 class="h2">Par thème</h2><div class="grid">' + TH.map(function (t) {
        var ns = t.mes.filter(function (m) { return m._s && m._s.niveau === "forte"; }).length;
        return '<a class="tile" href="#' + t.id + '" data-go="' + t.id + '"><b>' + esc(t.nom) + '</b><span class="mut">' + (t.an.length ? t.an.length + " sur " + t.mes.length + " mesures analysées" : t.mes.length + " mesures, pas encore analysées") + "</span>" + vbar(t.an) +
          '<span class="mut">' + (ns ? plural(ns, "mesure") + " à sensibilité forte · " : "") + plural(t.nadv, "analyse") + " d'adversaires</span></a>";
      }).join("") + "</div>" +
      (PH ? '<h2 class="h2">Les 11 mesures phares pour les jeunes</h2><p class="mut">' + esc(PH.source) + ". Chaque mesure renvoie à sa fiche dans le livret.</p><ol class=\"lst\">" + PH.mesures.map(function (x) {
        return "<li><b>" + esc(x.titre) + "</b><p>" + x.nums.map(function (n) { var m = byNum[n]; return '<a href="#" data-n="' + n + '">N°' + n + "</a> " + (m.analyses.length ? badge(m._v[0]) : '<span class="mut">analyse en cours</span>') + " " + sensB(m); }).join(" · ") + "</p></li>";
      }).join("") + "</ol>" : "") +
      (fragile.length ? '<h2 class="h2">À corriger en priorité</h2><p class="mut">Fragiles selon nos preuves et les plus exposées aux attaques des adversaires.</p><ol class="lst">' + fragile.slice(0, 6).map(function (m) { return mlink(m, ' <span class="mut">· ' + esc(thById[m.theme].court) + (m._top ? " · attaque " + esc(blocOf(m._top)) : "") + "</span>" + (m._s && m._s.niveau === "forte" ? " " + sensB(m) : "")); }).join("") + "</ol>" : "");

    // ---------- priorités : les 10 priorités du livret, les phares, notre proposition, filtres
    var PR = C.priorites, PP = C.preparation;
    var vOf = function (m) { return m._v[0]; };
    var isSol = function (m) { return m._v.indexOf("solide") >= 0; };
    var isBad = function (m) { return m._v.some(function (v) { return /^mal-/.test(v); }); };
    var mrow = function (m) {
      return '<tr><td class="nw"><a href="#" data-n="' + m.num + '">N°' + m.num + "</a></td><td><b>" + esc(m.titre) + "</b>" + (m._piste ? '<p class="chg1"><b>À changer :</b> ' + inline(m._piste) + "</p>" : "") + "</td><td>" + m._v.map(function (v) { return badge(v); }).join(" ") + "</td><td>" + sensB(m) + (PHN[m.num] ? " " + badge("phare", "Phare jeunes", "x-") : "") + "</td></tr>";
    };
    var mtable = function (list) { return list.length ? '<div class="scroll"><table class="cmp pt"><thead><tr><th>N°</th><th>Mesure</th><th>Verdict</th><th>Sensibilité</th></tr></thead><tbody>' + list.map(mrow).join("") + "</tbody></table></div>" : '<p class="mut">Aucune mesure pour ces filtres.</p>'; };
    if (PR) {
      var prioNums = {}, prioMes = [];
      PR.livret.forEach(function (x) { x.nums.forEach(function (n) { if (!prioNums[n]) { prioNums[n] = x.prio; prioMes.push(byNum[n]); } }); });
      var gpNums = {}; PR.ecart.concat(PR.proposition).forEach(function (x) { x.nums.forEach(function (n) { gpNums[n] = 1; }); });
      var solHors = P.mesures.filter(function (m) { return isSol(m) && !prioNums[m.num]; });
      var phOverlap = PH ? PH.mesures.filter(function (x) { return x.nums.some(function (n) { return prioNums[n]; }); }).length : 0;
      var kv = function (k, v) { return "<tr><td>" + k + "</td><td><b>" + v + "</b></td></tr>"; };
      var LISTS = { livret: ["Les 10 priorités du livret", prioMes], proposition: ["Notre proposition", []], phares: ["Phares jeunes", []], toutes: ["Les " + P.mesures.length + " mesures", P.mesures] };
      PR.proposition.forEach(function (x) { x.nums.forEach(function (n) { if (LISTS.proposition[1].indexOf(byNum[n]) < 0) LISTS.proposition[1].push(byNum[n]); }); });
      if (PR.croissance) { LISTS.croissance = ["Variante croissance", []]; PR.croissance.variante.forEach(function (x) { x.nums.forEach(function (n) { if (byNum[n] && LISTS.croissance[1].indexOf(byNum[n]) < 0) LISTS.croissance[1].push(byNum[n]); }); }); }
      if (PR.griefs) { LISTS.variante = ["Variante griefs", []]; PR.griefs.variante.forEach(function (x) { x.nums.forEach(function (n) { if (byNum[n] && LISTS.variante[1].indexOf(byNum[n]) < 0) LISTS.variante[1].push(byNum[n]); }); }); }
      if (PH) PH.mesures.forEach(function (x) { x.nums.forEach(function (n) { if (LISTS.phares[1].indexOf(byNum[n]) < 0) LISTS.phares[1].push(byNum[n]); }); });
      var pst = { l: "livret", v: null, s: null, gp: false };
      var h = '<div class="thead"><h1>Priorités : ce qui doit porter la campagne</h1><p class="mut">Le livret compte ' + P.mesures.length + " mesures. Lesquelles mettre en avant, lesquelles corriger, lesquelles défendre.</p></div>" +
        '<h2 class="h2">Le constat : un programme sans hiérarchie</h2><div class="scroll"><table class="cmp kvt"><tbody>' +
        kv("Mesures dans le livret", P.mesures.length) +
        kv("Mesures regroupées dans les 10 priorités du livret", prioMes.length) +
        kv("Dont jugées bien fondées par notre revue", prioMes.filter(isSol).length + " (" + prioMes.filter(isSol).map(function (m) { return "N°" + m.num; }).join(", ") + ")") +
        kv("Dont avec un défaut de calibrage, de ciblage ou de conception", prioMes.filter(isBad).length) +
        kv("Dont à sensibilité politique forte", prioMes.filter(function (m) { return m._s && m._s.niveau === "forte"; }).length) +
        (PH ? kv("Phares jeunes (19/11) qui recoupent les 10 priorités", phOverlap + " sur " + PH.mesures.length) : "") +
        kv("Mesures bien fondées absentes des priorités", solHors.length) +
        "</tbody></table></div>" +
        '<p class="mut">Mesures bien fondées hors priorités : ' + solHors.map(function (m) { return '<a href="#" data-n="' + m.num + '">N°' + m.num + "</a> " + esc(m.titre.replace(/\.$/, "")); }).join(" · ") + ".</p>" +
        '<h2 class="h2">La ligne : ' + esc(PR.ligne.titre) + '</h2><p>' + esc(PR.ligne.texte) + ' <span class="mut">(' + esc(PR.ligne.source) + ")</span></p>" +
        '<div class="scroll"><table class="cmp"><thead><tr><th>Thème</th><th>Dans les 10 priorités ?</th><th>Constat</th></tr></thead><tbody>' + PR.ecart.map(function (e) {
          return "<tr><td><b>" + esc(e.theme) + "</b><br>" + e.nums.map(function (n) { return '<a href="#" data-n="' + n + '">N°' + n + "</a>"; }).join(" ") + '</td><td class="t-' + e.top10 + '">' + esc({ oui: "Oui", non: "Non", partiel: "En partie" }[e.top10]) + "</td><td>" + esc(e.note) + "</td></tr>";
        }).join("") + "</tbody></table></div>" +
        '<h2 class="h2">Notre proposition de priorités</h2><p class="mut">Proposition du groupe, à discuter avec l\'équipe. Chaque priorité s\'appuie sur des mesures du livret, avec la correction à apporter.</p><ol class="lst prop">' + PR.proposition.map(function (x) {
          return "<li><b>" + esc(x.titre) + "</b>" + (x.phare ? " " + badge("phare", "Mesure phare", "x-") : "") + "<p>" + esc(x.pourquoi) + "</p><p><b>À corriger :</b> " + esc(x.corriger) + "</p><p>" + x.nums.map(function (n) { var m = byNum[n]; return '<a href="#" data-n="' + n + '">N°' + n + "</a> " + badge(vOf(m)); }).join(" · ") + "</p></li>";
        }).join("") + '</ol><p class="mut">' + esc(PR.garder_en_defense) + "</p>" +
        (PR.croissance ? (function (G) { try {
          var nl = function (ns) { return ns.map(function (n) { var m = byNum[n]; return '<a href="#" data-n="' + n + '">N°' + n + "</a>" + (m ? " " + badge(vOf(m)) : ""); }).join(" · "); };
          var PLAB = { garder: "À garder", renforcer: "À renforcer", recalibrer: "À recalibrer", ajouter: "À ajouter", abandonner: "À abandonner" };
          return '<h2 class="h2">' + esc(G.titre) + '</h2><p class="mut">' + esc(G.source) + "</p>" +
            '<div class="scroll"><table class="cmp"><tbody>' + G.constat.map(function (r) { return "<tr><td>" + esc(r[0]) + "</td><td>" + esc(r[1]) + "</td></tr>"; }).join("") + "</tbody></table></div>" +
            "<p>" + esc(G.lecture) + "</p>" +
            '<h2 class="h2">Une stratégie en trois temps</h2><ul class="lst">' + G.temps.map(function (t) { return "<li><b>" + esc(t.titre) + "</b><p>" + esc(t.texte) + "</p><p>" + nl(t.nums) + "</p></li>"; }).join("") + "</ul>" +
            '<h2 class="h2">Les leviers les mieux prouvés</h2><div class="scroll"><table class="cmp"><thead><tr><th>Levier</th><th>Effet attendu</th><th>Livret</th></tr></thead><tbody>' + G.leviers.map(function (l) {
              return "<tr><td><b>" + esc(l.titre) + '</b><span class="mut">' + esc(PLAB[l.position] || l.position) + " · preuve " + esc(l.preuve) + "</span></td><td>" + esc(l.effet) + "</td><td>" + (l.nums.length ? nl(l.nums) : '<span class="mut">absent du livret</span>') + "</td></tr>";
            }).join("") + "</tbody></table></div>" +
            '<p><b>À abandonner ou différer :</b> ' + esc(G.abandonner.texte) + " " + nl(G.abandonner.nums) + "</p>" +
            '<h2 class="h2">Variante : des priorités pour pouvoir croître à nouveau</h2><p class="mut">À comparer avec la proposition du groupe et la variante griefs ; rien n\'est arbitré.</p><ol class="lst prop">' + G.variante.map(function (x) { return "<li><b>" + esc(x.titre) + "</b><p>" + nl(x.nums) + "</p></li>"; }).join("") + "</ol>" +
            '<p class="mut"><b>Limites :</b> ' + esc(G.limites) + "</p>";
        } catch (e) { console.error("[site] croissance", e); return ""; } })(PR.croissance) : "") +
        (PR.griefs ? (function (G) { try {
          var nl = function (ns) { return ns.map(function (n) { var m = byNum[n]; return '<a href="#" data-n="' + n + '">N°' + n + "</a>" + (m ? " " + badge(vOf(m)) : ""); }).join(" · "); };
          return '<h2 class="h2">' + esc(G.titre) + '</h2><p class="mut">' + esc(G.source) + "</p>" +
            '<div class="scroll"><table class="cmp"><thead><tr><th>Grief</th><th>Ce qu\'on entend</th><th>Ce que le programme peut y répondre</th></tr></thead><tbody>' + G.items.map(function (g) {
              return "<tr><td><b>" + esc(g.grief) + '</b><span class="mut">' + esc(g.force) + "</span></td><td>" + esc(g.constat) + "</td><td>" + esc(g.reponse) + (g.nums.length ? "<p>" + nl(g.nums) + "</p>" : "") + "</td></tr>";
            }).join("") + "</tbody></table></div>" +
            '<h2 class="h2">Variante : réordonner les priorités pour répondre à ces griefs</h2><p class="mut">À comparer avec la proposition du groupe ci-dessus ; rien n\'est arbitré.</p><ol class="lst prop">' + G.variante.map(function (x) {
              return "<li><b>" + esc(x.titre) + "</b>" + (x.phare ? " " + badge("phare", "Mesure phare", "x-") : "") + "<p>" + esc(x.pourquoi) + "</p><p><b>À corriger :</b> " + esc(x.corriger) + "</p><p>" + nl(x.nums) + "</p></li>";
            }).join("") + '</ol><p class="mut"><b>Garde-fou :</b> ' + esc(G.garde_fou) + "</p>" +
            '<h2 class="h2">Angles de discours à arbitrer</h2><ul class="lst">' + G.angles.map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("") + "</ul>";
        } catch (e) { console.error("[site] griefs", e); return ""; } })(PR.griefs) : "") +
        '<h2 class="h2">Filtrer les mesures</h2><div class="filters" id="pf-l">' + Object.keys(LISTS).map(function (k) { return '<button class="chip" data-l="' + k + '">' + esc(LISTS[k][0]) + ' <span class="tn">' + LISTS[k][1].length + "</span></button>"; }).join("") + "</div>" +
        '<div class="filters" id="pf-v"><span class="mut">Verdict :</span>' + VORD.concat(["non-analysee"]).map(function (v) { return '<button class="chip" data-v="' + v + '">' + esc(VLAB[v]) + "</button>"; }).join("") + "</div>" +
        '<div class="filters" id="pf-s"><span class="mut">Sensibilité :</span>' + ["forte", "moyenne", "faible"].map(function (s) { return '<button class="chip" data-s="' + s + '">' + s + "</button>"; }).join("") + '<button class="chip" id="pf-gp">France grande puissance</button></div><div id="pf-out"></div>';
      $("#p-priorites").innerHTML = h;
      var prender = function () {
        $$("#pf-l .chip").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-l") === pst.l); });
        $$("#pf-v .chip").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-v") === pst.v); });
        $$("#pf-s .chip[data-s]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-s") === pst.s); });
        $("#pf-gp").setAttribute("aria-pressed", pst.gp);
        var L = LISTS[pst.l][1].filter(function (m) { return (!pst.v || m._v.indexOf(pst.v) >= 0) && (!pst.s || (m._s && m._s.niveau === pst.s)) && (!pst.gp || gpNums[m.num]); });
        $("#pf-out").innerHTML = '<p class="mut">' + plural(L.length, "mesure") + "</p>" + mtable(L);
      };
      $$("#pf-l .chip").forEach(function (b) { b.addEventListener("click", function () { pst.l = b.getAttribute("data-l"); prender(); }); });
      $$("#pf-v .chip").forEach(function (b) { b.addEventListener("click", function () { var v = b.getAttribute("data-v"); pst.v = pst.v === v ? null : v; prender(); }); });
      $$("#pf-s .chip[data-s]").forEach(function (b) { b.addEventListener("click", function () { var v = b.getAttribute("data-s"); pst.s = pst.s === v ? null : v; prender(); }); });
      $("#pf-gp").addEventListener("click", function () { pst.gp = !pst.gp; prender(); });
      prender();
    } else $("#p-priorites").innerHTML = '<p class="mut">Priorités à venir.</p>';

    // ---------- préparation : fiches orales, contre-attaques, entraînement
    if (PP) {
      var ph = '<div class="thead"><h1>Préparation</h1><p class="mut">Pour chaque priorité : la phrase de 30 secondes, les chiffres qui tiennent, les attaques probables et la réplique, ce que nous assumons et corrigeons, et le lien avec la France grande puissance. ' + esc(PP.redaction) + ".</p></div>" +
        '<nav class="subtabs" id="pp-sub"><button data-m="fiches">Fiches</button><button data-m="contre">Contre-attaques</button><button data-m="drill">Entraînement</button></nav>' +
        '<div data-pm="fiches">' + '<div class="box warn"><h4>Pièges à éviter</h4><ul>' + PP.pieges.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>" +
        PP.cartes.map(function (c) {
          return '<details class="mes prep" id="pc-' + esc(c.id) + '"' + (c.phare ? " open" : "") + '><summary><div class="mh">' + (c.phare ? badge("phare", "Mesure phare", "x-") : "") + c.nums.map(function (n) { return badge(vOf(byNum[n]), "N°" + n + " " + VLAB[vOf(byNum[n])]); }).join("") + '</div><div class="mt">' + esc(c.titre) + "</div></summary><div class=\"mb\">" +
            '<blockquote class="say">' + esc(c.phrase) + "</blockquote>" +
            '<div class="box"><h4>Les chiffres qui tiennent</h4><ul>' + c.chiffres.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>" +
            '<div class="box"><h4>Attaques probables et répliques</h4>' + c.attaques.map(function (a) { return '<p class="att">' + esc(a.attaque) + '</p><p class="rep">' + esc(a.replique) + "</p>"; }).join("") + "</div>" +
            '<div class="box chg"><h4>Ce que j\'assume et corrige</h4><p>' + esc(c.assume) + "</p></div>" +
            '<p class="pont"><b>France grande puissance :</b> ' + esc(c.pont) + "</p>" +
            '<p class="mut">Fiches : ' + c.nums.map(function (n) { return '<a href="#" data-n="' + n + '">N°' + n + " " + esc(byNum[n].titre.replace(/\.$/, "")) + "</a>"; }).join(" · ") + "</p></div></details>";
        }).join("") + "</div>" +
        '<div data-pm="contre"><p class="mut">Démonter un chiffre adverse, puis revenir à notre projet. Le détail et les sources sont dans les fiches riposte de chaque thème.</p>' + PP.contre.map(function (c) {
          return '<div class="box"><h4>' + esc(c.adversaire) + " · " + esc(c.titre) + "</h4><p>" + esc(c.coup) + "</p>" + (c.piege ? '<p class="mut">' + esc(c.piege) + "</p>" : "") + "</div>";
        }).join("") + "</div>" +
        '<div data-pm="drill"><p class="mut">Une attaque tirée au hasard. Répondez à voix haute en 30 secondes, puis comparez avec la réplique préparée.</p><div class="box drill"><p class="kick" id="dr-k"></p><p class="dq" id="dr-q"></p><p class="dt" id="dr-t"></p><div class="filters"><button class="chip" id="dr-go">Démarrer 30 s</button><button class="chip" id="dr-show">Voir la réplique</button><button class="chip" id="dr-next">Suivante</button></div><div id="dr-a" hidden></div></div></div>';
      $("#p-preparation").innerHTML = ph;
      var pmode = function (m) { $$("#pp-sub button").forEach(function (b) { b.setAttribute("aria-selected", b.getAttribute("data-m") === m); }); $$("#p-preparation [data-pm]").forEach(function (d) { d.hidden = d.getAttribute("data-pm") !== m; }); };
      $$("#pp-sub button").forEach(function (b) { b.addEventListener("click", function () { pmode(b.getAttribute("data-m")); }); });
      pmode("fiches");
      var DQ = [];
      PP.cartes.forEach(function (c) { c.attaques.forEach(function (a) { DQ.push({ k: c.titre, q: a.attaque, a: a.replique, x: c.pont }); }); });
      PP.contre.forEach(function (c) { DQ.push({ k: "Contre-attaque · " + c.adversaire, q: "Démontez : " + c.titre, a: c.coup }); });
      var di = -1, tm = null;
      var dnext = function () {
        clearInterval(tm); var j; do { j = Math.floor(Math.random() * DQ.length); } while (DQ.length > 1 && j === di); di = j;
        var d = DQ[di]; $("#dr-k").textContent = d.k; $("#dr-q").textContent = d.q; $("#dr-t").textContent = ""; $("#dr-a").hidden = true;
        $("#dr-a").innerHTML = '<p class="rep">' + esc(d.a) + "</p>" + (d.x ? '<p class="pont"><b>Puis :</b> ' + esc(d.x) + "</p>" : "");
      };
      $("#dr-next").addEventListener("click", dnext);
      $("#dr-show").addEventListener("click", function () { clearInterval(tm); $("#dr-a").hidden = false; });
      $("#dr-go").addEventListener("click", function () { var t = 30; clearInterval(tm); $("#dr-t").textContent = t + " s"; tm = setInterval(function () { t--; $("#dr-t").textContent = t > 0 ? t + " s" : "Temps écoulé"; if (t <= 0) { clearInterval(tm); $("#dr-a").hidden = false; } }, 1000); });
      dnext();
    } else $("#p-preparation").innerHTML = '<p class="mut">Préparation à venir.</p>';

    // ---------- Un État qui marche : pourquoi c'est si dur de faire en France, et comment en sortir
    try {
      var EQ = C.etat_qui_marche;
      if (EQ) {
        var R = EQ.resume || {}, EVE = {}; ((EQ.eval || {}).evaluations || []).forEach(function (e) { EVE[e.id] = e; });
        $("#p-etat").innerHTML = '<div class="thead"><h1>Un État qui marche</h1><p class="lead">' + esc(R.these || "") + "</p></div>" +
          (R.causes ? '<h2 class="h2">Pourquoi c\'est si dur de faire en France</h2><div class="pgrid">' + R.causes.map(function (c) { return '<div class="box"><h4>' + esc(c.titre) + "</h4><p>" + esc(c.fait) + '</p><p class="mut">' + esc(c.source || "") + "</p></div>"; }).join("") + "</div>" : "") +
          (R.ailleurs ? '<h2 class="h2">Ce qui a marché ailleurs</h2><ul class="lst">' + R.ailleurs.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "") +
          '<h2 class="h2">Une sortie de crise : ' + EQ.propositions.length + " propositions pour les 100 premiers jours</h2>" +
          EQ.propositions.map(function (p) { var e = EVE[p.id];
            return '<details class="mes"><summary><div class="mh">' + (e ? badge("x", "Évaluateur : " + e.decision, "x-") : "") + '</div><div class="mt">' + esc(p.titre) + '</div></summary><div class="mb"><p><b>Mécanisme.</b> ' + esc(p.mecanisme) + "</p><p><b>Preuves.</b> " + esc(p.preuves) + "</p><p><b>Ailleurs.</b> " + esc(p.ailleurs) + "</p><p><b>Coût.</b> " + esc(p.cout) + "</p><p><b>Premier pas.</b> " + esc(p.premier_pas) + "</p><p><b>Indicateur publié.</b> " + esc(p.indicateur) + "</p>" +
              ((p.mesures_livret_liees || []).length ? '<p class="mut">Mesures du livret : ' + p.mesures_livret_liees.map(function (n) { return '<a href="#" data-n="' + n + '">N°' + n + "</a>"; }).join(", ") + "</p>" : "") +
              (e ? '<div class="box chg"><h4>Évaluateur « Édouard Philippe » (simulé) : ' + esc(e.decision) + '</h4><p class="mut">Preuves ' + e.preuves + "/5 · coût-efficacité " + e.cout_efficacite + "/5 · croissance " + e.croissance + "/5 · vision " + e.vision + "/5</p><p><b>Sa question :</b> " + esc(e.question) + "</p></div>" : "") +
              cbox("etat-" + p.id, "Un État qui marche · " + p.titre, p.titre + ". " + p.mecanisme) + "</div></details>"; }).join("") +
          (R.confiance ? '<h2 class="h2">Comment l\'efficacité visible reconstruit la confiance</h2><p>' + esc(R.confiance) + "</p>" : "");
      } else $("#p-etat").innerHTML = '<p class="mut">Analyse en cours.</p>';
    } catch (e) { console.error("[site] etat", e); }

    // ---------- Convergences à droite : bonnes idées, terrain commun, désaccords (Lisnard, Retailleau)
    try {
      var CV = C.convergences, CN = { lisnard: "David Lisnard", retailleau: "Bruno Retailleau", groupe: "Préparer l'avenir" };
      if (CV) {
        var idees = (CV.idees_a_prendre || []).map(function (x) { return { src: x.candidat, titre: x.titre, detail: x.detail, eval: x.evaluation, preuves: x.preuves, nums: x.mesures_livret_liees || [], id: "droite-" + x.id, url: x.url, source: x.source }; });
        var EVT = ((C.recherche_travail || {}).eval || {}).evaluations || [];
        (C.recherche_travail ? C.recherche_travail.propositions : []).forEach(function (p) { var e = EVT.filter(function (z) { return z.id === p.id; })[0]; if (e && e.decision === "adopter") idees.push({ src: "groupe", titre: p.titre, detail: p.mecanisme, eval: "adoptée par l'évaluateur (preuves " + e.preuves + "/5)", preuves: p.preuves, nums: p.mesures_livret_liees || [], id: "travail-" + p.id }); });
        (((C.boucle_messages || {}).propositions_sante) || []).forEach(function (p) { idees.push({ src: "groupe", titre: p.titre, detail: p.mecanisme, eval: "proposition du groupe (santé, absente du livret)", preuves: p.preuves, nums: [], id: "sante-" + p.id }); });
        var cnt = function (k, pos) { return Object.keys(CV.par_mesure || {}).filter(function (n) { return CV.par_mesure[n][k] && CV.par_mesure[n][k].position === pos; }).length; };
        var nl = function (ns) { return (ns || []).map(function (n) { return '<a href="#" data-n="' + n + '">N°' + n + "</a>"; }).join(", "); };
        $("#p-droite").innerHTML = '<div class="thead"><h1>Convergences à droite</h1><p class="mut">En cinq minutes : les bonnes idées de David Lisnard, de Bruno Retailleau et de notre groupe qui manquent au livret, le terrain commun pour rassembler, et les vrais désaccords. Positions tirées de leurs déclarations publiques sourcées ; évaluations du groupe selon les mêmes critères que pour le livret. ' + esc(CV.limites || "") + "</p></div>" +
          '<div class="pgrid">' + ["lisnard", "retailleau"].map(function (k) { return '<div class="box"><h4>' + CN[k] + "</h4><p>" + cnt(k, "proche") + " mesures du livret proches, " + cnt(k, "partiel") + " en partie, " + cnt(k, "oppose") + " opposées</p></div>"; }).join("") + "</div>" +
          '<h2 class="h2">Les bonnes idées à prendre, d\'où qu\'elles viennent (' + idees.length + ")</h2>" +
          idees.map(function (x) { return '<details class="mes"><summary><div class="mh">' + badge("x", CN[x.src] || x.src, "x-") + badge("x", x.eval, "x-") + '</div><div class="mt">' + esc(x.titre) + '</div></summary><div class="mb"><p>' + esc(x.detail) + "</p><p><b>Preuves.</b> " + esc(x.preuves) + "</p>" + (x.nums.length ? '<p class="mut">Mesures du livret liées : ' + nl(x.nums) + "</p>" : "") + (x.url ? '<p class="mut"><a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.source || "source") + "</a></p>" : "") + cbox(x.id, "Idée à prendre · " + x.titre, x.titre + ". " + x.detail) + "</div></details>"; }).join("") +
          '<h2 class="h2">Le terrain commun</h2><ul class="lst">' + (CV.convergences_fortes || []).map(function (x) { return "<li><b>" + esc(x.theme) + "</b> (" + x.qui.map(function (k) { return CN[k] || k; }).join(", ") + ") : " + esc(x.resume) + " " + nl(x.nums) + "</li>"; }).join("") + "</ul>" +
          '<h2 class="h2">Les vrais désaccords</h2><ul class="lst">' + (CV.desaccords || []).map(function (x) { return "<li><b>" + esc(x.theme) + "</b> (" + esc(CN[x.qui] || x.qui) + ") : " + esc(x.resume) + " " + nl(x.nums) + "</li>"; }).join("") + "</ul>";
      } else $("#p-droite").innerHTML = '<p class="mut">Analyse en cours.</p>';
    } catch (e) { console.error("[site] droite", e); }

    // ---------- électeurs simulés (personas/ : kit reproductible, simulations, boucle)
    try {
    var EL = C.electeurs;
    if (EL && EL.personas) {
      var PS = EL.personas.filter(function (p) { return EL.sims[p.id]; });
      var RNOM = { lisnard: "David Lisnard", lepen: "Marine Le Pen", melenchon: "Jean-Luc Mélenchon" };
      var rx = function (v) { return '<span class="hx h' + (v < 0 ? "m" : "p") + Math.abs(v) + '">' + (v > 0 ? "+" : "") + v + "</span>"; };
      var simOf = function (p, n) { var s = EL.sims[p.id]; return (s.mesures || []).filter(function (m) { return m.num === n; })[0]; };
      var avg = function (p) { var m = EL.sims[p.id].mesures; return m.reduce(function (a, x) { return a + x.reaction; }, 0) / m.length; };
      var PW = EL.poids || null;
      var wavg = function (pairs) { if (!PW) return pairs.reduce(function (x, y) { return x + y[1]; }, 0) / pairs.length; var t = 0, s = 0; pairs.forEach(function (q) { var w = PW[q[0]] || 0; t += w; s += w * q[1]; }); return t ? s / t : 0; };
      var partOf = function (p) { return PW && PW[p.id] != null ? '<small>' + String(PW[p.id]).replace(".", ",") + " % de la population</small>" : ""; };
      var titreC = function (n) { return byNum[n] ? byNum[n].titre.replace(/\.$/, "") : "N°" + n; };
      var eh = '<div class="thead"><h1>Électeurs simulés</h1><p class="mut"><b>Simulation, pas un sondage.</b> ' + EL.personas.length + ' électeurs fictifs, au moins un par public des fiches « Ce qui changerait pour… », nourris du porte-à-porte et d\'entretiens qualitatifs, lisent le livret mesure par mesure : ce qui les touche, ce qui les repousse, ce que leur candidat préféré leur offre, et ce que personne ne leur dit. C\'est un test de résistance du programme, pas une mesure de l\'opinion.</p></div>' +
        '<nav class="subtabs" id="el-sub"><button data-m="chantiers">Par chantier</button><button data-m="carte">Mesure par mesure</button><button data-m="personas">Les électeurs</button><button data-m="boucle">Ce qui change dans le programme</button><button data-m="kit">Reproduire la méthode</button></nav>';
      // carte de chaleur : personas × mesures communes
      eh += '<div data-em="carte"><p class="mut">Réaction de chaque électeur aux ' + EL.mesures_communes.length + ' mesures communes, de -2 (rejet net) à +2 (adhésion). Survolez une case pour lire sa phrase.</p><div class="hwrap"><table class="heat"><thead><tr><th></th>' +
        EL.mesures_communes.map(function (n) { return '<th title="' + esc(titreC(n)) + '"><a href="#" data-n="' + n + '">N°' + n + "</a><small>" + esc(titreC(n).slice(0, 38)) + "</small></th>"; }).join("") + "<th>Moyenne (16 mesures)</th></tr></thead><tbody>" +
        PS.map(function (p) {
          return "<tr><th>" + esc(p.libelle) + partOf(p) + "<small>" + p.age + " ans · " + esc(p.intention_t1) + "</small></th>" + EL.mesures_communes.map(function (n) { var m = simOf(p, n); return m ? '<td title="' + esc(p.libelle + " : « " + m.verbatim + " »") + '">' + rx(m.reaction) + "</td>" : "<td></td>"; }).join("") + "<td><b>" + (avg(p) > 0 ? "+" : "") + avg(p).toFixed(2) + "</b></td></tr>";
        }).join("") + "</tbody><tfoot><tr><th>Moyenne" + (PW ? " pondérée" : "") + "</th>" + EL.mesures_communes.map(function (n) { var a = wavg(PS.map(function (p) { var m = simOf(p, n); return [p.id, m ? m.reaction : 0]; })); return "<td><b>" + (a > 0 ? "+" : "") + a.toFixed(1) + "</b></td>"; }).join("") + "<td></td></tr></tfoot></table></div>" +
        '<div class="pgrid">' + PS.map(function (p) { var b = EL.sims[p.id].bascule || {}; return '<div class="box"><h4>' + esc(p.libelle) + " · vote Philippe au 1er tour : " + esc(b.probabilite_vote_philippe_t1 || "?") + '</h4><p class="rep">« ' + esc(b.phrase_qui_marche || "") + ' »</p><p class="att">' + esc(b.phrase_qui_repousse || "") + '</p><p class="mut"><b>Condition :</b> ' + esc(b.condition || "") + "</p></div>"; }).join("") + "</div></div>";
      // carte par chantier : personas × 12 chantiers (out/chantiers-*.json)
      var CA = EL.chantiers_avis || {}, CH = EL.chantiers || [], PSC = EL.personas.filter(function (p) { return CA[p.id]; });
      var avOf = function (p, cid) { return (CA[p.id].chantiers || []).filter(function (c) { return c.id === cid; })[0]; };
      eh += '<div data-em="chantiers">' + (PSC.length ? '<p class="mut">Ce que chaque électeur pense de chaque grand chantier du programme, de -2 (rejet) à +2 (adhésion), à partir des doléances réelles et sourcées de son groupe. Cliquez sur une case pour lire son avis, les doléances qu\'il invoque et ce qui manque.</p><div class="hwrap"><table class="heat big"><thead><tr><th></th>' +
        CH.map(function (c) { return "<th>" + esc(c.nom) + "<small>" + (c.mesures.length ? c.mesures.length + " mesures" : "aucune mesure") + "</small></th>"; }).join("") + "</tr></thead><tbody>" +
        PSC.map(function (p) { return "<tr><th>" + esc(p.libelle) + partOf(p) + "</th>" + CH.map(function (c) { var a = avOf(p, c.id); return a ? '<td class="ck" data-p="' + p.id + '" data-c="' + c.id + '" title="' + esc(a.verbatim) + '">' + rx(a.note) + "</td>" : "<td></td>"; }).join("") + "</tr>"; }).join("") +
        "</tbody><tfoot><tr><th>Moyenne</th>" + CH.map(function (c) { var v = PSC.map(function (p) { var a = avOf(p, c.id); return a ? [p.id, a.note] : null; }).filter(function (x) { return x !== null; }); var m = v.length ? wavg(v) : 0; return "<td><b>" + (m > 0 ? "+" : "") + m.toFixed(1) + "</b></td>"; }).join("") + '</tr></tfoot></table></div>' + (PW ? '<p class="mut">Moyenne pondérée par la part de chaque groupe dans la population de 18 ans et plus' + (EL.poids_doc ? " (" + esc(EL.poids_doc.base) + ")" : "") + '. Groupes non représentés par un électeur : ' + esc(((EL.poids_doc || {}).non_represente || []).map(function (x) { return x.segment + " " + String(x.part).replace(".", ",") + " %"; }).join(" ; ")) + ".</p>" : "") + '<div id="ck-out" class="box"><p class="mut">Cliquez sur une case.</p></div>' : '<p class="mut">Avis par chantier en cours de calcul.</p>') + "</div>";
      var docOf = function (p) { var d = (CA[p.id] || {}).doleances || []; if (!d.length) return ""; return '<div class="box"><h4>Doléances documentées de son groupe</h4><ol>' + d.map(function (x) { return "<li><b>" + esc(x.doleance) + "</b> " + esc(x.fait) + ' <span class="mut">(' + (/^https?:/.test(x.url || "") ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.source) + "</a>" : esc(x.source)) + ")</span></li>"; }).join("") + "</ol></div>"; };
      // fiches personas
      eh += '<div data-em="personas">' + PS.map(function (p) {
        var s = EL.sims[p.id], cp = s.candidat_prefere || {}, voix = (EL.voix || {})[p.id];
        var ms = s.mesures.slice().sort(function (a, b) { return b.reaction - a.reaction; });
        return '<details class="mes prep" id="el-' + p.id + '"><summary><div class="mh">' + rx(Math.round(avg(p))) + badge("x", esc(RNOM[p.candidat_prefere] || p.intention_t1), "x-") + '</div><div class="mt">' + esc(p.libelle) + " · " + p.age + " ans, " + esc(p.lieu) + "</div></summary><div class=\"mb\">" +
          '<p class="mut"><b>Public des fiches :</b> ' + esc(p.categorie_fiche || "") + "</p><p>" + esc(p.situation) + " " + esc(p.vote_passe) + ' <b>Intention :</b> ' + esc(p.intention_t1) + ".</p>" +
          '<p class="mut"><b>Ce qui l\'occupe :</b> ' + esc(p.preoccupations.join(" ; ")) + ". <b>S'informe :</b> " + esc(p.sources_info) + "</p>" +
          '<p class="filters">' + (voix ? '<a class="chip" href="' + esc(voix) + '" target="_blank" rel="noopener">Lui parler (voix, simulation)</a>' : '<span class="chip off">Voix : bientôt</span>') + "</p>" +
          docOf(p) + '<div class="box"><h4>Débat simulé avec un porte-parole</h4>' + (s.debat || []).map(function (t) { return '<p class="' + (t.qui === "persona" ? "att" : "rep") + '"><b>' + (t.qui === "persona" ? "L'électeur" : "Porte-parole") + " :</b> " + esc(t.texte) + "</p>"; }).join("") + "</div>" +
          '<div class="box"><h4>Les 16 mesures, de la plus aimée à la plus rejetée</h4><table class="mtab"><tbody>' + ms.map(function (m) { return "<tr><td>" + rx(m.reaction) + '</td><td><a href="#" data-n="' + m.num + '">N°' + m.num + "</a> " + esc(titreC(m.num)) + '<br><i>« ' + esc(m.verbatim) + " »</i>" + (m.reaction < 1 && m.ce_qui_convaincrait ? '<br><span class="mut"><b>Ce qui le ferait bouger :</b> ' + esc(m.ce_qui_convaincrait) + "</span>" : "") + (m.reformulation ? '<br><span class="mut"><b>Mieux dit :</b> ' + esc(m.reformulation) + "</span>" : "") + "</td></tr>"; }).join("") + "</tbody></table></div>" +
          '<div class="box"><h4>Ce que lui offre ' + esc(RNOM[cp.id] || "son candidat") + "</h4><ul>" + (cp.ce_qui_seduit || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" + ((cp.ce_qui_l_inquiete || []).length ? '<p class="mut"><b>Ce qui l\'inquiète chez lui :</b> ' + esc(cp.ce_qui_l_inquiete.join(" ; ")) + "</p>" : "") + "</div>" +
          '<div class="box chg"><h4>Angles morts : là où Philippe peut entrer</h4>' + (s.angles_morts || []).map(function (a) { return "<p><b>" + esc(a.sujet) + ".</b> Son candidat : " + esc(a.ce_que_dit_son_candidat) + ". <b>Angle :</b> " + esc(a.angle_pour_philippe) + ((a.mesures_livret || []).length ? " (" + a.mesures_livret.map(function (n) { return '<a href="#" data-n="' + n + '">N°' + n + "</a>"; }).join(", ") + ")" : "") + "</p>"; }).join("") + "</div></div></details>";
      }).join("") + "</div>";
      // boucle
      var BO = EL.boucle, EV = {}; ((EL.eval_philippe || {}).evaluations || []).forEach(function (e) { EV[e.id] = e; });
      var evOf = function (id) { var e = EV[id]; if (!e) return ""; return '<div class="box chg"><h4>Évaluateur « Édouard Philippe » (simulé) : ' + esc(e.decision) + '</h4><p class="mut">Preuves ' + e.preuves + "/5 · coût-efficacité " + e.cout_efficacite + "/5 · croissance " + e.croissance + "/5 · vision " + e.vision + "/5</p><p><b>Sa question :</b> " + esc(e.question) + "</p>" + (e.ce_quil_garde ? "<p><b>Ce qu'il garde :</b> " + esc(e.ce_quil_garde) + "</p>" : "") + "</div>"; };
      eh += '<div data-em="boucle">' + (BO ? '<p class="mut">' + esc(BO.intro) + (EL.eval_philippe ? " Chaque proposition passe ensuite un dernier filtre : un évaluateur simulé, inspiré du profil public du candidat, qui juge les preuves, le coût, l'effet sur la croissance et la cohérence avec une France qui compte dans le monde. Il ne parle pas au nom du candidat." : "") + "</p>" + (BO.propositions || []).map(function (x) {
        return '<div class="box"><h4>' + (x.nums || []).map(function (n) { return '<a href="#" data-n="' + n + '">N°' + n + "</a>"; }).join(", ") + " · " + esc(x.titre) + '</h4><p><b>Ce que disent les électeurs simulés :</b> ' + esc(x.constat) + '</p><p class="rep"><b>Proposition (à valider) :</b> ' + esc(x.proposition) + "</p>" + (x.type ? '<p class="mut">' + esc(x.type) + "</p>" : "") + evOf(x.id) + cbox("electeurs-" + x.id, "Électeurs simulés · " + x.titre, x.proposition) + "</div>";
      }).join("") : '<p class="mut">Synthèse à venir.</p>') + "</div>";
      // kit
      var KF = (EL.kit || {}).fichiers || [];
      eh += '<div data-em="kit"><div class="box"><h4>Refaire l\'exercice en 15 minutes</h4><ol>' +
        "<li>Téléchargez le kit (zip) ci-dessous : " + EL.personas.length + " fiches d'électeurs, le prompt, les 142 mesures du livret et les programmes Lisnard, Le Pen et Mélenchon.</li>" +
        "<li><b>Sans code :</b> ouvrez Claude, ChatGPT, Le Chat ou Gemini, collez <code>prompts/simulation.md</code>, puis la fiche d'un électeur, ses 16 mesures et le programme de son candidat. La réponse est un fichier JSON au format du site.</li>" +
        "<li><b>Avec Python :</b> <code>pip install anthropic</code>, puis <code>python3 simulate.py</code> relance tous les électeurs (<code>--prompt-only</code> écrit seulement les prompts complets à coller).</li>" +
        "<li>Changez une fiche, ajoutez un électeur ou remplacez une mesure par sa nouvelle formulation, puis relancez : vous voyez si la réaction change. C'est la boucle écouter, décider, agir, réinjecter.</li></ol>" +
        '<p class="filters">' + (EL.kit && EL.kit.zip ? '<button class="chip" id="kit-zip">Télécharger le kit complet (zip)</button>' : "") + KF.map(function (f, i) { return '<button class="chip" data-kf="' + i + '">' + esc(f.nom) + "</button>"; }).join("") + "</p></div>" +
        '<p class="mut">Garde-fous : électeurs fictifs, aucune donnée personnelle ; le modèle peut se tromper sur un électorat ; les programmes Lisnard, Le Pen et Mélenchon fournis aux électeurs sont nos revues de leur volet économique (sécurité et justice non couvertes) ; les résultats orientent les questions à poser au terrain, ils ne remplacent ni le porte-à-porte ni les sondages.</p></div>';
      $("#p-electeurs").innerHTML = eh;
      var emode = function (m) { $$("#el-sub button").forEach(function (b) { b.setAttribute("aria-selected", b.getAttribute("data-m") === m); }); $$("#p-electeurs [data-em]").forEach(function (d) { d.hidden = d.getAttribute("data-em") !== m; }); };
      $$("#el-sub button").forEach(function (b) { b.addEventListener("click", function () { emode(b.getAttribute("data-m")); }); });
      emode(PSC.length ? "chantiers" : "carte");
      $$("#p-electeurs td.ck").forEach(function (td) { td.addEventListener("click", function () {
        var p = EL.personas.filter(function (x) { return x.id === td.getAttribute("data-p"); })[0], c = CH.filter(function (x) { return x.id === td.getAttribute("data-c"); })[0], a = avOf(p, c.id), d = CA[p.id].doleances || [];
        $("#ck-out").innerHTML = "<h4>" + esc(p.libelle) + " · " + esc(c.nom) + " " + rx(a.note) + '</h4><p class="att">« ' + esc(a.verbatim) + " »</p><p><b>Répond à ses doléances :</b> " + esc(a.repond) + (a.manque ? ". <b>Ce qui manque :</b> " + esc(a.manque) : "") + "</p>" + ((a.doleances || []).length ? "<ul>" + a.doleances.map(function (n) { var x = d.filter(function (y) { return y.n === n; })[0]; return x ? "<li>" + esc(x.doleance) + " " + esc(x.fait) + ' <span class="mut">(' + (/^https?:/.test(x.url || "") ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.source) + "</a>" : esc(x.source)) + ")</span></li>" : ""; }).join("") + "</ul>" : "") + (c.mesures.length ? '<p class="mut">Mesures du chantier : ' + c.mesures.map(function (m) { return '<a href="#" data-n="' + m.num + '">N°' + m.num + "</a>"; }).join(", ") + "</p>" : '<p class="mut">' + esc(c.note || "") + "</p>");
      }); });
      var dl = function (name, blob) { var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
      $$("#p-electeurs [data-kf]").forEach(function (b) { b.addEventListener("click", function () { var f = KF[+b.getAttribute("data-kf")]; dl(f.nom.split("/").pop(), new Blob([f.contenu], { type: "text/plain;charset=utf-8" })); }); });
      if ($("#kit-zip")) $("#kit-zip").addEventListener("click", function () { var s = atob(EL.kit.zip), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); dl("kit-electeurs-simules.zip", new Blob([u], { type: "application/zip" })); });
    } else $("#p-electeurs").innerHTML = '<p class="mut">Électeurs simulés à venir.</p>';

    // ---------- Améliorations organisationnelles pour Horizons (leçons des midterms 2026 appliquées au parti et à la campagne)
    var MT = C.midterms;
    if (MT && MT.length) {
      var slide = function (d, i) {
        return '<section class="slide"><p class="kick">' + esc(d.surtitre || "") + "</p><h2>" + esc(d.titre || "") + '</h2><p class="lead">' + esc(d.chapeau || "") + '</p><div class="sgrid">' + d.blocs.map(function (b) { return '<div class="box"><h4>' + esc(b.titre) + "</h4><p>" + esc(b.texte) + "</p></div>"; }).join("") + "</div>" +
          (d.a_retenir ? '<p class="pont"><b>À retenir :</b> ' + esc(d.a_retenir) + "</p>" : "") + (d.sources ? '<p class="mut src">' + esc(d.sources) + "</p>" : "") + (/SIMUL/i.test(d.surtitre || "") ? '<p class="tolinks"><a href="#electeurs" data-go="electeurs">Voir les électeurs simulés</a></p>' : "") + "</section>";
      };
      var plan = MT.filter(function (d) { return /PLAN|SIMUL/i.test(d.surtitre || ""); }), why = MT.filter(function (d) { return plan.indexOf(d) < 0; });
      var LM = C.boucle_messages;
      $("#p-organisation").innerHTML = '<div class="thead"><h1>Améliorations organisationnelles pour Horizons</h1><p class="mut">Ce qu\'Horizons et la campagne peuvent changer dans leur organisation, à coût quasi nul et dans le respect du droit électoral français : une machine légère et rapide, les adhérents et les maires comme premier média, et une campagne qui apprend chaque semaine. Inspiré des midterms américains du 3 novembre 2026 (présentation du groupe, 17 et 22 novembre 2026). Pistes à valider.</p></div>' +
        (function () { var R = C.organisation_reco; if (!R) return "";
          return '<h2 class="h2">Organiser la campagne : diagnostic et recommandations</h2><p>' + esc(R.intro) + "</p>" +
            (R.diagnostic ? '<div class="box"><h4>Quelle course courons-nous ? ' + esc(R.diagnostic.course) + "</h4><p>" + esc(R.diagnostic.pourquoi) + '</p><p class="rep"><b>Ce que cela implique :</b> ' + esc(R.diagnostic.implication) + "</p></div>" : "") +
            R.recommandations.map(function (r, i) { return '<details class="mes"' + (i < 2 ? " open" : "") + '><summary><div class="mt">' + (i + 1) + ". " + esc(r.titre) + '</div></summary><div class="mb"><p><b>Problème.</b> ' + esc(r.probleme) + "</p><p><b>Ce qu'il faut faire.</b> " + esc(r.mesure) + "</p><p><b>Preuves.</b> " + esc(r.preuves) + "</p>" + (r.outil ? "<p><b>Avec le site.</b> " + esc(r.outil) + "</p>" : "") + "<p><b>Premier pas.</b> " + esc(r.premier_pas) + '</p><p class="mut"><b>Risque :</b> ' + esc(r.risque) + "</p>" + cbox("organisation-" + r.id, "Organisation · " + r.titre, r.titre + ". " + r.mesure) + "</div></details>"; }).join("") +
            ((R.sources || []).length ? '<details class="in"><summary>Sources (' + R.sources.length + ")</summary><ul>" + R.sources.map(function (s) { return "<li>" + esc(typeof s === "string" ? s : (s.titre || "") + (s.url ? " " + s.url : "")) + "</li>"; }).join("") + "</ul></details>" : "");
        })() +
        '<h2 class="h2">Ce que nous proposons à Horizons</h2>' + plan.map(slide).join("") +
        '<h2 class="h2">La boucle d\'amélioration des messages</h2>' + (LM ? (function () {
          var T = LM.tours, last = T[T.length - 1], TH = { M1: "Retraites", M2: "Économies et État", M3: "Familles et vie chère", M4: "Jeunes et premier emploi", M5: "Sécurité du quotidien", M6: "Le travail doit payer", M7: "Santé et accès aux soins" };
          var ths = last.themes.map(function (t) { return t.theme; });
          return '<p class="mut">Chaque tour : 10 électeurs simulés écoutent les messages à leur porte, les notent (intérêt et crédibilité, sur 10) et disent ce qui les fait décrocher ; nous en tirons de nouvelles propositions et de nouveaux messages, puis on recommence. ' + T.length + " tour(s) à ce jour. Simulation, pas un sondage : le terrain tranche.</p>" +
            '<div class="hwrap"><table class="heat"><thead><tr><th>Thème</th>' + T.map(function (t) { return "<th>Tour " + t.tour + "</th>"; }).join("") + "<th>Meilleur message (dernier tour)</th></tr></thead><tbody>" +
            ths.map(function (th) { var lt = last.themes.filter(function (x) { return x.theme === th; })[0], bm = last.messages.filter(function (m) { return m.id === lt.meilleur; })[0];
              return "<tr><th>" + esc(TH[th] || th) + "</th>" + T.map(function (t) { var x = t.themes.filter(function (y) { return y.theme === th; })[0]; return "<td>" + (x ? "<b>" + x.score.toFixed(1) + "</b>/10" + (x.progres != null ? '<small>' + (x.progres >= 0 ? "+" : "") + x.progres.toFixed(1) + "</small>" : "") : "") + "</td>"; }).join("") + '<td style="text-align:left">' + esc(bm ? bm.texte : "") + '<small>Le moins convaincu : ' + esc(bm ? bm.min_electeur : "") + "</small></td></tr>"; }).join("") + "</tbody></table></div>";
        })() : '<p class="mut">Retours des électeurs simulés → propositions → messages → nouvelle simulation → nouvelles propositions. Premiers tours en cours ; les résultats s\'afficheront ici.</p>') +
        '<h2 class="h2">Pourquoi : ce que les midterms nous apprennent</h2>' + why.map(slide).join("");
    } else $("#p-organisation").innerHTML = '<p class="mut">À venir.</p>';
    } catch (e) { console.error("électeurs/organisation", e); }

    try {
    // ---------- Chiffrage et arbitrages (data/chiffrage.json, build/chiffrage_merge.py)
    var CF = C.chiffrage;
    if (CF && CF.candidats && CF.candidats.length) {
      var thName = function (id) { return thById[id] ? thById[id].court : id; };
      var fmt = function (x) { return x == null ? "n.c." : (x > 0 ? "+" : "") + x.toFixed(1).replace(".", ",") + " Md€"; };
      var cOf = function (m) { var v = val(m); return v == null ? 0 : v; };
      var cst = { cand: CF.candidats[0].id, off: {}, pick: null, mode: "prudent" };
      var val = function (m) { return cst.mode === "candidat" && m.nd ? m.nd.candidat : m.central; };
      var candById = {}; CF.candidats.forEach(function (c) { candById[c.id] = c; });
      var byTheme = function (c, off) {
        var o = {}; CF.themes.forEach(function (t) { o[t] = { cout: 0, eco: 0, n: 0, nc: 0 }; });
        c.mesures.forEach(function (m) { var t = o[m.theme]; if (!t) return; t.n++; if (val(m) == null) { t.nc++; return; } if (off && off[m.id]) return; var v = val(m); if (v > 0) t.cout += v; else t.eco += v; });
        return o;
      };
      var mlab = function (c, m) { return c.id === "philippe" && m.num ? '<a href="#" data-n="' + m.num + '">N°' + m.num + "</a> " + esc(m.titre) : esc(m.titre); };
      var ch = '<div class="thead"><h1>Chiffrage et arbitrages</h1><p class="mut">Coût estimé de chaque mesure, en milliards d\'euros par an en fin de quinquennat, et son effet sur le solde public : <b>+</b> coûte, <b>−</b> rapporte. Estimations de nos agents de recherche, sourcées mesure par mesure ; effets sur la croissance exclus. Chiffrage du ' + esc(CF.date) + ".</p></div>" +
        '<div class="filters" id="cf-c">' + CF.candidats.map(function (c) { return '<button class="chip" data-c="' + c.id + '">' + esc(c.nom) + "</button>"; }).join("") + "</div>" +
        '<div class="filters" id="cf-m"><span class="mut">Économies annoncées sans mesures précises :</span><button class="chip" data-m="prudent">comptées à 20 % (prudent)</button><button class="chip" data-m="candidat">au mot du candidat</button></div>' +
        '<div id="cf-out"></div><div id="cf-cmp"></div>';
        ''; var cmpHtml = function () { return '<h2 class="h2">Comparaison des programmes, bloc par bloc</h2><p class="mut">Solde central par bloc (coûts moins économies et recettes), en Md€ par an.</p><div class="scroll"><table class="cmp"><thead><tr><th>Bloc</th>' + CF.candidats.map(function (c) { return "<th>" + esc(c.nom) + "</th>"; }).join("") + "</tr></thead><tbody>" +
        CF.themes.map(function (t) { return "<tr><td><b>" + esc(thName(t)) + "</b></td>" + CF.candidats.map(function (c) { var x = byTheme(c)[t]; return "<td>" + (x.n ? fmt(x.cout + x.eco) : '<span class="mut">—</span>') + "</td>"; }).join("") + "</tr>"; }).join("") +
        '<tr class="tot"><td><b>Total</b></td>' + CF.candidats.map(function (c) { var s = c.mesures.reduce(function (a, m) { return a + cOf(m); }, 0); return "<td><b>" + fmt(s) + "</b></td>"; }).join("") + "</tr>" +
        '<tr><td>Annoncé par le candidat</td>' + CF.candidats.map(function (c) { var t = c.total_annonce; return '<td class="mut">' + (t ? esc(t.md_eur_an != null ? fmt(+t.md_eur_an) : "") + " " + esc(t.texte || "") : "—") + "</td>"; }).join("") + "</tr>" +
        '<tr><td>Simulation externe</td>' + CF.candidats.map(function (c) { return '<td class="mut">' + (c.externe.length ? c.externe.map(function (e) { return esc(e.note || ""); }).join(" ") : "—") + "</td>"; }).join("") + "</tr>" +
        "</tbody></table></div>"; };
      $("#p-chiffrage").innerHTML = ch;
      var crender = function () {
        var c = candById[cst.cand];
        $$("#cf-c .chip").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-c") === cst.cand); });
        var bt = byTheme(c, cst.off), tot = { cout: 0, eco: 0 }, maxv = 1;
        CF.themes.forEach(function (t) { tot.cout += bt[t].cout; tot.eco += bt[t].eco; maxv = Math.max(maxv, bt[t].cout, -bt[t].eco); });
        var nNc = c.mesures.filter(function (m) { return val(m) == null; }).length, nOff = Object.keys(cst.off).filter(function (k) { return cst.off[k]; }).length;
        var h = '<h2 class="h2">Où va l\'argent : ' + esc(c.nom) + "</h2>" +
          '<div class="scroll"><table class="cmp kvt"><tbody><tr><td>Coûts (dépenses nouvelles et baisses d\'impôts)</td><td><b>' + fmt(tot.cout) + "</b></td></tr><tr><td>Économies et recettes nouvelles</td><td><b>" + fmt(tot.eco) + "</b></td></tr><tr><td>Effet net sur le solde public" + (nOff ? " (sans les " + plural(nOff, "mesure") + " écartées)" : "") + "</td><td><b>" + fmt(tot.cout + tot.eco) + "</b></td></tr><tr><td>Mesures non chiffrables</td><td>" + nNc + " sur " + c.mesures.length + "</td></tr></tbody></table></div>" +
          '<div class="cfbars">' + CF.themes.filter(function (t) { return bt[t].n; }).map(function (t) {
            var x = bt[t];
            return '<div class="cfrow"><span class="cft">' + esc(thName(t)) + '</span><span class="cfneg"><i class="bneg" data-w="' + (100 * -x.eco / maxv).toFixed(1) + '"></i><em>' + (x.eco ? fmt(x.eco) : "") + '</em></span><span class="cfpos"><i class="bpos" data-w="' + (100 * x.cout / maxv).toFixed(1) + '"></i><em>' + (x.cout ? fmt(x.cout) : "") + "</em></span></div>";
          }).join("") + '</div><p class="mut">À gauche, ce que le bloc rapporte ; à droite, ce qu\'il coûte.</p>' +
          '<h2 class="h2">Arbitrer</h2><p class="mut">Décochez une mesure pour voir le solde sans elle. Cliquez sur « Équivalences » pour voir ce qu\'elle représente en économies ailleurs dans le programme.</p>' +
          CF.themes.filter(function (t) { return bt[t].n; }).map(function (t) {
            var ms = c.mesures.filter(function (m) { return m.theme === t; }).sort(function (a, b) { return Math.abs(cOf(b)) - Math.abs(cOf(a)); });
            return '<details class="cfth"><summary><b>' + esc(thName(t)) + '</b> <span class="mut">' + plural(ms.length, "mesure") + " · solde " + fmt(bt[t].cout + bt[t].eco) + "</span></summary><ul class=\"lst cfl\">" + ms.map(function (m) {
              return '<li><label><input type="checkbox" data-id="' + esc(m.id) + '"' + (cst.off[m.id] ? "" : " checked") + (val(m) == null ? " disabled" : "") + "> " + mlab(c, m) + "</label> <b>" + fmt(val(m)) + "</b>" + (m.bas != null && m.haut != null && m.bas !== m.haut ? ' <span class="mut">(' + fmt(m.bas) + " à " + fmt(m.haut) + ")</span>" : "") + (m.nd ? ' <span class="badge b-a-chiffrer">sans mesures précises : ' + fmt(m.nd.candidat) + " annoncés</span>" : "") + ' <span class="mut">confiance ' + esc(m.confiance || "") + "</span>" + (val(m) ? ' <button class="lnk" data-eq="' + esc(m.id) + '">Équivalences</button>' : "") +
                (cst.pick === m.id ? eqBox(c, m) : "") +
                (m.note || m.calcul || (m.sources && m.sources.length) ? '<p class="mut">' + esc(m.note || "") + (m.calcul ? " Calcul : " + esc(m.calcul) : "") + (m.sources || []).map(function (s) { return " " + (s.url ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.ref) + "</a>" : esc(s.ref)) + (s.page ? ", " + esc(s.page) : ""); }).join(" ;") + "</p>" : "") + "</li>";
            }).join("") + "</ul></details>";
          }).join("");
        $("#cf-out").innerHTML = h; $("#cf-cmp").innerHTML = cmpHtml();
        $$("#cf-m .chip").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-m") === cst.mode); });
        $$("#cf-out [data-w]").forEach(function (el) { el.style.width = Math.max(0, Math.min(100, +el.getAttribute("data-w"))) + "%"; });
        $$("#cf-out input[data-id]").forEach(function (b) { b.addEventListener("change", function () { cst.off[b.getAttribute("data-id")] = !b.checked; var op = $$("#cf-out details[open]").map(function (d) { return d.querySelector("summary b").textContent; }); crender(); $$("#cf-out details").forEach(function (d) { if (op.indexOf(d.querySelector("summary b").textContent) >= 0) d.open = true; }); }); });
        $$("#cf-out [data-eq]").forEach(function (b) { b.addEventListener("click", function () { var id = b.getAttribute("data-eq"); cst.pick = cst.pick === id ? null : id; var op = $$("#cf-out details[open]").map(function (d) { return d.querySelector("summary b").textContent; }); crender(); $$("#cf-out details").forEach(function (d) { if (op.indexOf(d.querySelector("summary b").textContent) >= 0) d.open = true; }); }); });
      };
      var eqBox = function (c, m) {
        var v = val(m), opp = c.mesures.filter(function (x) { return val(x) != null && x.id !== m.id && (v > 0 ? val(x) < 0 : val(x) > 0); });
        opp.sort(function (a, b) { return Math.abs(Math.abs(a.central) - Math.abs(v)) - Math.abs(Math.abs(b.central) - Math.abs(v)); });
        var same = c.mesures.filter(function (x) { return val(x) != null && x.id !== m.id && x.theme !== m.theme && (v > 0 ? val(x) > 0 : val(x) < 0); }).sort(function (a, b) { return Math.abs(b.central) - Math.abs(a.central); }).slice(0, 3);
        return '<div class="box eco"><p><b>' + (v > 0 ? "Pour financer " : "Ce que rapporte ") + fmt(v) + " par an :</b></p><ul>" + opp.slice(0, 4).map(function (x) { return "<li>" + mlab(c, x) + " : " + fmt(val(x)) + " (" + (Math.abs(v / val(x))).toFixed(1).replace(".", ",") + " fois)</li>"; }).join("") + "</ul>" +
          (same.length ? "<p><b>" + (v > 0 ? "Elle entre en concurrence avec :" : "Elle pourrait financer :") + "</b> " + same.map(function (x) { return mlab(c, x) + " (" + fmt(val(x)) + ")"; }).join(" · ") + "</p>" : "") + "</div>";
      };
      $$("#cf-m .chip").forEach(function (b) { b.addEventListener("click", function () { cst.mode = b.getAttribute("data-m"); crender(); }); });
      $$("#cf-c .chip").forEach(function (b) { b.addEventListener("click", function () { cst.cand = b.getAttribute("data-c"); cst.off = {}; cst.pick = null; crender(); }); });
      crender();
    } else if ($("#p-chiffrage")) $("#p-chiffrage").innerHTML = '<p class="mut">Chiffrage en cours.</p>';


    } catch (e) { console.error("[site] bloc chiffrage", e); var _p = document.getElementById("p-chiffrage"); if (_p) _p.innerHTML = '<p class="mut">Cette section n\'a pas pu s\'afficher.</p>'; }
    try {
    // ---------- Fiches thématiques « Ce qui changerait pour… » (data/fiches-thematiques.json)
    var FT = C.fiches_th;
    if (FT && $("#p-fiches")) {
      var SLAB = { livret: "Dans le livret", precision: "Précise ou modifie le livret", nouveau: "Absent du livret" };
      var pubOf = {}; FT.fiches.forEach(function (f) { pubOf[f.num] = f.public; });
      var nlink = function (ns) { return (ns || []).map(function (n) { var m = byNum[n]; return '<a href="#" data-n="' + n + '">N°' + n + "</a>" + (m ? " " + badge(m._v[0]) : ""); }).join(" · "); };
      var pubs = function (p) { return p.fiches.map(function (n) { return esc(pubOf[n] || "Fiche " + n); }).join(", "); };
      var ficheCard = function (p) {
        return '<li><b>' + esc(p.titre) + "</b> " + badge(p.statut, SLAB[p.statut], "s-") + (p.contradiction ? " " + badge("contradiction", "Contredit le livret", "x-") : "") + " " + (p.verdict || []).map(function (v) { return badge(v); }).join(" ") +
          '<p class="mut">Fiches : ' + pubs(p) + (p.nums && p.nums.length ? " · Livret : " + nlink(p.nums) : "") + "</p>" +
          '<p class="q">« ' + esc(p.phrase_cle) + " »</p>" +
          (p.ecart ? "<p><b>Écart :</b> " + esc(p.ecart) + "</p>" : "") +
          (p.justification ? "<p><b>Analyse :</b> " + esc(p.justification) + "</p>" : "") +
          (p.cout_md_an != null || p.cout_source ? "<p><b>Coût estimé :</b> " + (p.cout_md_an != null ? esc(String(p.cout_md_an).replace(".", ",")) + " Md€ par an" : "à chiffrer") + (p.cout_source ? ' <span class="mut">(' + esc(p.cout_source) + ")</span>" : "") + "</p>" : "") +
          (p.ailleurs ? "<p><b>Ailleurs.</b> " + esc(p.ailleurs) + "</p>" : "") +
          (p.alternative ? '<div class="box chg"><p><b>Mieux vaut :</b> ' + esc(p.alternative) + "</p></div>" : "") +
          ((p.sources || []).length ? '<p class="mut">Sources : ' + p.sources.map(function (s) { return (s.url ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.ref) + "</a>" : esc(s.ref)) + (s.page ? ", " + esc(s.page) : ""); }).join(" ; ") + "</p>" : "") + "</li>";
      };
      var P_ = FT.propositions, contra = P_.filter(function (p) { return p.contradiction; }), autres = P_.filter(function (p) { return p.statut !== "livret" && !p.contradiction; }), K = FT.comptes || {};
      var fh = '<div class="thead"><h1>Fiches thématiques : ce qui changerait pour…</h1><p class="mut">' + esc(FT.source) + ". Chaque proposition des neuf fiches est rapprochée du livret ; celles qui le précisent, le modifient ou n'y figurent pas sont évaluées comme les mesures du site.</p></div>" +
        '<div class="scroll"><table class="cmp kvt"><tbody><tr><td>Propositions dans les 9 fiches</td><td><b>' + (K.propositions_brutes || "") + "</b>, soit " + P_.length + " distinctes</td></tr><tr><td>Identiques au livret</td><td><b>" + P_.filter(function (p) { return p.statut === "livret"; }).length + "</b></td></tr><tr><td>Précisent ou modifient le livret</td><td><b>" + P_.filter(function (p) { return p.statut === "precision"; }).length + "</b></td></tr><tr><td>Absentes du livret</td><td><b>" + P_.filter(function (p) { return p.statut === "nouveau"; }).length + "</b></td></tr><tr><td>Contredisent le livret</td><td><b>" + contra.length + "</b></td></tr></tbody></table></div>" +
        '<h2 class="h2">À corriger avant diffusion : contradictions avec le livret</h2><ul class="lst prop">' + contra.map(ficheCard).join("") + "</ul>" +
        (FT.engagements ? '<h2 class="h2">Engagements des fiches qui contraignent le programme</h2><ul class="lst">' + FT.engagements.map(function (e) { return "<li><b>" + esc(e.titre) + "</b><p>" + esc(e.conflit) + "</p><p>" + nlink(e.nums) + "</p></li>"; }).join("") + "</ul>" : "") +
        '<h2 class="h2">Propositions qui précisent le livret ou n\'y figurent pas</h2><ul class="lst prop">' + autres.map(ficheCard).join("") + "</ul>" +
        '<h2 class="h2">Fiche par fiche</h2>' + FT.fiches.map(function (f) {
          var ps = P_.filter(function (p) { return p.fiches.indexOf(f.num) >= 0; });
          return '<details class="cfth"><summary><b>' + esc(f.public) + '</b> <span class="mut">' + plural(ps.length, "proposition") + "</span></summary><p class=\"mut\">" + esc(f.accroche) + '</p><div class="scroll"><table class="cmp"><thead><tr><th>Proposition</th><th>Livret</th><th>Statut</th></tr></thead><tbody>' + ps.map(function (p) {
            return "<tr><td><b>" + esc(p.titre) + '</b><span class="mut">' + esc(p.rubrique || "") + "</span></td><td>" + (p.nums && p.nums.length ? nlink(p.nums) : '<span class="mut">—</span>') + "</td><td>" + badge(p.statut, SLAB[p.statut], "s-") + (p.contradiction ? " " + badge("contradiction", "Contredit", "x-") : "") + "</td></tr>";
          }).join("") + "</tbody></table></div></details>";
        }).join("");
      $("#p-fiches").innerHTML = fh;
    }
    } catch (e) { console.error("[site] bloc fiches", e); var _p = document.getElementById("p-fiches"); if (_p) _p.innerHTML = '<p class="mut">Cette section n\'a pas pu s\'afficher.</p>'; }
    // ---------- pages thème
    var SUBS = [["synthese", "Synthèse"], ["mesures", "Mesures de Philippe"], ["adversaires", "Face aux adversaires"]];
    var tst = {};
    TH.forEach(function (t) {
      tst[t.id] = { v: null, s: null, onlyA: t.an.length > 0 };
      $("#p-" + t.id).innerHTML = '<div class="thead"><h1>' + esc(t.nom) + '</h1><p class="mut">' + (t.an.length ? t.an.length + " sur " + t.mes.length + " mesures analysées" : t.mes.length + " mesures, pas encore analysées par le groupe") + "</p></div>" +
        '<nav class="subtabs">' + SUBS.map(function (s) { return '<button data-sub="' + s[0] + '">' + s[1] + "</button>"; }).join("") + "</nav>" +
        SUBS.map(function (s) { return '<div class="sub" data-p="' + s[0] + '"></div>'; }).join("");
      $$("#p-" + t.id + " .subtabs button").forEach(function (b) { b.addEventListener("click", function () { go(t.id, b.getAttribute("data-sub")); }); });
      [renderSyn, renderMes, renderAdv].forEach(function (f) { try { f(t); } catch (e) { console.error("[site] thème " + t.id + " " + f.name, e && e.stack || e); } });
    });
    function showSub(id, sub) {
      $$("#p-" + id + " .subtabs button").forEach(function (b) { b.setAttribute("aria-selected", b.getAttribute("data-sub") === sub); });
      $$("#p-" + id + " .sub").forEach(function (d) { d.hidden = d.getAttribute("data-p") !== sub; });
    }
    function renderSyn(t) {
      var h = "";
      if (t.an.length) h += '<div class="kv">' + vbar(t.an) + '<p>' + vcounts(t.an) + "</p></div>";
      var RT = C.recherche_travail;
      if (t.id === "travail" && RT) {
        var RE = {}; ((RT.eval || {}).evaluations || []).forEach(function (e) { RE[e.id] = e; });
        h += '<h2 class="h2">Travailler plus, jeunes, seniors : ce que dit la recherche <span class="mut">· ' + fdate(RT.maj) + "</span></h2>" + (RT.resume ? "<p>" + esc(RT.resume.intro) + "</p><ul>" + RT.resume.verdicts.map(function (v) { return "<li>" + esc(v) + "</li>"; }).join("") + "</ul>" : "") +
          '<p class="mut">' + RT.propositions.length + " propositions alternatives ou complémentaires, à valider. Chacune est passée au filtre de l'évaluateur « Édouard Philippe » simulé (preuves, coût, croissance, vision), qui ne parle pas au nom du candidat.</p>" +
          RT.propositions.map(function (p) { var e = RE[p.id];
            return '<details class="mes"><summary><div class="mh">' + badge("x", esc(p.public), "x-") + (e ? badge("x", "Évaluateur : " + esc(e.decision), "x-") : "") + '</div><div class="mt">' + esc(p.titre) + '</div></summary><div class="mb"><p><b>Mécanisme.</b> ' + esc(p.mecanisme) + "</p><p><b>Preuves.</b> " + esc(p.preuves) + "</p><p><b>Ailleurs.</b> " + esc(p.ailleurs) + "</p><p><b>Coût.</b> " + esc(p.cout) + "</p><p><b>Premier pas.</b> " + esc(p.premier_pas) + "</p>" + ((p.mesures_livret_liees || []).length ? '<p class="mut">Mesures du livret : ' + p.mesures_livret_liees.map(function (n) { return '<a href="#" data-n="' + n + '">N°' + n + "</a>"; }).join(", ") + "</p>" : "") +
              (e ? '<div class="box chg"><h4>Évaluateur « Édouard Philippe » (simulé) : ' + esc(e.decision) + '</h4><p class="mut">Preuves ' + e.preuves + "/5 · coût-efficacité " + e.cout_efficacite + "/5 · croissance " + e.croissance + "/5 · vision " + e.vision + "/5</p><p><b>Sa question :</b> " + esc(e.question) + "</p>" + (e.ce_quil_garde ? "<p><b>Ce qu'il garde :</b> " + esc(e.ce_quil_garde) + "</p>" : "") + "</div>" : "") + cbox("travail-" + p.id, "Travail, jeunes, seniors · " + p.titre, p.titre + ". " + p.mecanisme) + "</div></details>"; }).join("");
      }
      var PS2 = (C.boucle_messages || {}).propositions_sante;
      if (t.id === "social" && PS2) {
        h += '<h2 class="h2">Santé : l\'accès au médecin traitant <span class="mut">· propositions du groupe, à valider</span></h2><p>Le livret ne contient aucune mesure sur l\'accès aux soins, alors que la santé est le premier sujet du porte-à-porte (6 mentions sur 159 portes) et le seul chantier noté négativement par les dix électeurs simulés. Quatre pistes sourcées :</p>' +
          PS2.map(function (p) { return '<details class="mes"><summary><div class="mt">' + esc(p.titre) + '</div></summary><div class="mb"><p><b>Mécanisme.</b> ' + esc(p.mecanisme) + "</p><p><b>Preuves.</b> " + esc(p.preuves) + "</p><p><b>Ailleurs.</b> " + esc(p.ailleurs) + "</p><p><b>Coût.</b> " + esc(p.cout) + "</p><p><b>Premier pas.</b> " + esc(p.premier_pas) + "</p>" + cbox("sante-" + p.id, "Santé · " + p.titre, p.titre + ". " + p.mecanisme) + "</div></details>"; }).join("");
      }
      var chg = t.an.filter(function (m) { return m._piste; }).sort(function (a, b) { return (a._sol || 0) - (b._sol || 0); }).slice(0, 6);
      if (chg.length) h += '<h2 class="h2">Ce que nous recommandons de changer</h2><p class="mut">Les mesures les plus fragiles d\'abord ; toutes les fiches sont dans « Mesures de Philippe ».</p><ul class="lst rec">' + chg.map(function (m) { return mlink(m, " " + badge(m._v[0]) + '<p>' + inline(m._piste) + "</p>"); }).join("") + "</ul>";
      (C.pistes || []).filter(function (x) { return x.theme === t.id; }).forEach(function (x) {
        h += '<h2 class="h2">' + esc(x.titre) + ' <span class="mut">· proposition du groupe, ' + fdate(x.maj) + "</span></h2>" + (x.en_bref ? md(x.en_bref) : "") +
          x.items.map(function (it) {
            return '<details class="mes' + (it.verdicts && it.verdicts[0] ? " v-" + it.verdicts[0] : "") + '"><summary><div class="mh"><span class="num">Piste</span>' + (it.verdicts || []).map(function (v) { return badge(v); }).join("") + '</div><div class="mt">' + esc(it.titre) + '</div>' + (it["Le grief"] ? '<p class="verd">' + inline(it["Le grief"]) + "</p>" : "") + '</summary><div class="mb">' +
              Object.keys(it).filter(function (k) { return ["titre", "verdicts", "Le grief"].indexOf(k) < 0; }).map(function (k) { return "<h4>" + esc(k) + "</h4>" + md(it[k]); }).join("") + "</div></details>";
          }).join("");
      });
      if (t.voir_aussi) h += '<h2 class="h2">' + esc(t.voir_aussi.titre) + '</h2><p class="mut">Mesures rangées dans d\'autres thèmes, qui reposent aussi sur l\'IA.</p><ul class="lst">' + t.voir_aussi.nums.map(function (n) { var m = byNum[n]; return mlink(m, " " + badge(m._v[0]) + ' <span class="mut">· ' + esc(thById[m.theme].court) + "</span>"); }).join("") + "</ul>";
      var ecos = t.mes.filter(function (m) { return m._e; });
      if (ecos.length) {
        var ec = { rupture: 0, inflexion: 0, continuite: 0 }; ecos.forEach(function (m) { if (ec[m._e.ecart] != null) ec[m._e.ecart]++; });
        h += '<h2 class="h2">Ce qui change et ce que cela coûte</h2><p class="mut">Analyse économique neutre de ' + plural(ecos.length, "mesure") + " : " + ec.rupture + " rupture" + (ec.rupture > 1 ? "s" : "") + ", " + ec.inflexion + " inflexion" + (ec.inflexion > 1 ? "s" : "") + ", " + ec.continuite + " continuité" + (ec.continuite > 1 ? "s" : "") + ". Les ruptures d\'abord.</p><ul class=\"lst\">" +
          ecos.filter(function (m) { return m._e.ecart === "rupture"; }).map(function (m) { return mlink(m, "<p>" + inline(m._e.ecart_pourquoi || "") + ' <span class="mut">Coût : ' + inline(m._e.cout) + "</span></p>"); }).join("") + "</ul>";
      }
      var fortes = t.mes.filter(function (m) { return m._s && m._s.niveau === "forte"; });
      if (fortes.length) h += '<h2 class="h2">Les mesures politiquement sensibles</h2><p class="mut">Prédiction du groupe, pas un sondage.</p><ul class="lst">' + fortes.map(function (m) { return mlink(m, "<p>" + esc(m._s.pourquoi) + "</p>"); }).join("") + "</ul>";
      var withAtt = t.an.filter(function (m) { return m._att; });
      if (withAtt.length) {
        h += '<h2 class="h2">Comment se situent les adversaires</h2><table class="pt"><thead><tr><th></th><th>Opposée</th><th>Désaccord partiel</th><th>Proche</th></tr></thead><tbody>' + RIV.map(function (r) {
          var c = { opposee: 0, partielle: 0, convergente: 0 }; withAtt.forEach(function (m) { var x = m._att[r.id]; if (x && c[x.position] != null) c[x.position]++; });
          return "<tr><th>" + esc(r.bloc) + "</th><td>" + c.opposee + "</td><td>" + c.partielle + "</td><td>" + c.convergente + "</td></tr>";
        }).join("") + '</tbody></table><p class="mut">Nombre de mesures analysées du thème, selon la position de chaque adversaire. Détail dans « Face aux adversaires ».</p>';
      }
      var qs = P.questions.filter(function (q) { return q.t === t.id; });
      if (qs.length) h += '<details class="in"><summary>Questions à poser à l\'équipe programme</summary>' + qs.map(function (q) { return "<ul>" + q.items.map(function (i) { return "<li>" + inline(i) + "</li>"; }).join("") + "</ul>"; }).join("") + "</details>";
      var ech = (C.echeances || []).filter(function (e) { return e.theme === t.id && days(e.date) >= -365; });
      if (ech.length) h += '<details class="in"><summary>Échéances qui touchent ce thème (' + ech.length + ")</summary><ul>" + ech.map(function (e) { return "<li><b>" + esc(fdate(e.date, e.precision)) + "</b> " + esc(e.quoi) + ' <span class="mut">(' + esc(e.effet) + (e.verifie ? "" : ", à vérifier") + ", " + esc(e.source) + ")</span></li>"; }).join("") + "</ul></details>";
      var xq = X ? X.questions.filter(function (q) { return q.onglet === t.id; }) : [];
      if (xq.length) h += '<h2 class="h2">Positions déclarées sur les grandes questions</h2><p class="mut">Ce que chaque candidat a dit ou écrit, question par question, avec la source et la date. Relevé tenu à jour chaque jour.</p>' + xtable(xq) + xcred();
      if (t.encours) h += '<p class="encours"><b>En cours au groupe :</b> ' + inline(t.encours) + "</p>";
      if (!t.an.length && !h) h = '<p class="mut">Ce thème n\'a pas encore été analysé par le groupe. Les mesures du livret sont dans l\'onglet « Mesures de Philippe ».</p>';
      $("#p-" + t.id + ' [data-p="synthese"]').innerHTML = h;
    }
    function renderMes(t) {
      var box = $("#p-" + t.id + ' [data-p="mesures"]'), st = tst[t.id];
      var vc = {}, sc = {}; t.mes.forEach(function (m) { vc[m._v[0]] = (vc[m._v[0]] || 0) + 1; if (m._s) sc[m._s.niveau] = (sc[m._s.niveau] || 0) + 1; });
      var chip = function (k, v, lab, n) { return '<button class="chip" data-k="' + k + '" data-v="' + v + '" aria-pressed="' + (st[k] === v) + '">' + esc(lab) + ' <span class="tn">' + n + "</span></button>"; };
      var list = t.mes.filter(function (m) { return (!st.onlyA || m.analyses.length) && (!st.v || m._v[0] === st.v) && (!st.s || (m._s && m._s.niveau === st.s)); });
      box.innerHTML = '<div class="filters">' + Object.keys(VLAB).filter(function (v) { return vc[v]; }).map(function (v) { return chip("v", v, VLAB[v], vc[v]); }).join("") + "</div>" +
        '<div class="filters">' + ["forte", "moyenne", "faible"].filter(function (s) { return sc[s]; }).map(function (s) { return chip("s", s, SENS[s], sc[s]); }).join("") +
        (t.an.length && t.an.length < t.mes.length ? '<label class="tog"><input type="checkbox"' + (st.onlyA ? " checked" : "") + "> Analysées seulement</label>" : "") + "</div>" +
        '<p class="mut">' + plural(list.length, "mesure") + ". Cliquer sur une mesure pour l'analyse.</p>" + (list.map(card).join("") || '<p class="mut">Aucune mesure ne correspond.</p>');
      $$(".chip", box).forEach(function (b) { b.addEventListener("click", function () { var k = b.getAttribute("data-k"), v = b.getAttribute("data-v"); st[k] = st[k] === v ? null : v; renderMes(t); }); });
      var cb = $(".tog input", box); if (cb) cb.addEventListener("change", function () { st.onlyA = cb.checked; renderMes(t); });
    }
    function renderAdv(t) {
      var h = "", withAtt = t.an.filter(function (m) { return m._att; });
      if (withAtt.length) h += '<h2 class="h2">Les mesures de Philippe face aux autres programmes</h2><div class="scroll"><table class="cmp"><thead><tr><th>Mesure de Philippe</th>' + RIV.map(function (r) { return "<th>" + esc(r.bloc) + "</th>"; }).join("") + "</tr></thead><tbody>" +
        withAtt.map(function (m) { return '<tr><td><a href="#" data-n="' + m.num + '">N°' + m.num + "</a> " + esc(m.titre) + "</td>" + RIV.map(function (r) { var c = m._att[r.id], p = c ? c.position : "absente"; return '<td class="p-' + p + '"><b class="ml">' + esc(r.bloc) + ' : </b>' + esc(PLAB[p]) + (c && c.proposition && p !== "absente" ? '<span class="mut">' + esc(c.proposition) + "</span>" : "") + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>";
      var comm = [];
      t.adv.forEach(function (x) { x.fiches.forEach(function (f) {
        var autres = (f.aussi || []).filter(function (y) { return !/philippe/i.test(y.candidat); });
        var ph = (f.aussi || []).filter(function (y) { return /philippe/i.test(y.candidat); });
        if (autres.length) comm.push({ a: x.a, f: f, autres: autres, ph: ph });
      }); });
      if (comm.length) {
        h += '<h2 class="h2">Attaques communes</h2><p class="mut">Fiches dont la critique vaut aussi contre d\'autres candidats (même proposition ou proposition voisine). « Attention » signale qu\'une proposition proche figure dans le programme de Philippe : attaquer le financement ou le calibrage, pas le principe.</p><ul class="lst comm">' +
          comm.map(function (c) {
            return '<li><a href="#" data-go="' + t.id + '" data-sub="adversaires" data-r="' + rid(c.f.titre) + '"><b>' + esc(c.a.nom) + "</b> : " + esc(c.f.titre) + "</a>" + (c.f.verdicts ? " " + c.f.verdicts.map(function (v) { return badge(v); }).join("") : "") +
              '<p>Vaut aussi contre : ' + c.autres.map(function (y) { return esc(y.candidat) + ' <span class="mut">(' + esc(y.degre || "") + ")</span>"; }).join(", ") + "</p>" +
              (c.ph.length ? '<p class="warn">Attention : ' + c.ph.map(function (y) { return inline(y.detail || "proposition proche chez Philippe"); }).join(" ") + "</p>" : "") + "</li>";
          }).join("") + "</ul>";
      }
      t.adv.forEach(function (x) {
        if (!x.items.length && !x.fiches.length) return;
        h += '<h2 class="h2">' + esc(x.a.nom) + ' <span class="mut">· ' + (x.a.source.maj ? "revue du " + fdate(x.a.source.maj) : "fiches riposte du " + fdate(x.a.source.fiches_maj)) + "</span></h2>";
        x.fiches.forEach(function (f) {
          h += '<details class="mes" id="' + rid(f.titre) + '"><summary><div class="mh"><span class="num">Fiche riposte</span>' + (f.verdict ? badge(f.verdict, f.verdict, "f-") : "") + (f.verdicts ? f.verdicts.map(function (v) { return badge(v); }).join("") : "") + '</div><div class="mt">' + esc(f.titre) + "</div>" + (f["Ce qui a été dit"] ? '<p class="verd">' + inline(f["Ce qui a été dit"]) + "</p>" : "") + '</summary><div class="mb">' +
            (f["Riposte"] ? '<div class="box chg"><h4>Riposte</h4>' + md(f["Riposte"]) + "</div>" : "") +
            (f.aussi ? '<div class="aussi"><h4>Aussi chez</h4><ul>' + f.aussi.map(function (x) { return "<li><b>" + esc(x.candidat) + "</b> <span class=\"mut\">(" + esc(x.degre || "") + ")</span> " + inline(x.detail || "") + "</li>"; }).join("") + "</ul></div>" : "") +
            (f.visuel ? viz(f.visuel) : "") +
            Object.keys(f).filter(function (k) { return ["titre", "verdict", "verdicts", "aussi", "visuel", "theme", "Ce qui a été dit", "Riposte"].indexOf(k) < 0; }).map(function (k) { return '<details class="in"><summary>' + esc(k) + "</summary>" + md(f[k]) + "</details>"; }).join("") + "</div></details>";
        });
        x.items.forEach(function (it) { h += '<details class="mes' + (it.verdicts ? " v-" + it.verdicts[0] : "") + '" id="' + rid(it.titre) + '"><summary>' + (it.verdicts ? '<div class="mh">' + it.verdicts.map(function (v) { return badge(v); }).join("") + "</div>" : "") + '<div class="mt">' + esc(it.titre) + '</div><p class="verd">' + inline(it.justif || firstSentence(it.texte)) + '</p></summary><div class="mb">' + md(it.texte) + "</div></details>"; });
      });
      if (X) {
        var xh = "";
        X.candidats.filter(function (c) { return c.id !== "philippe"; }).forEach(function (c) {
          var it = ((X.mesures[c.id] || {}).items || []).filter(function (m) { return m.onglet === t.id; });
          var pr = X.prises_de_parole.filter(function (x) { return x.id === c.id && x.onglets.indexOf(t.id) >= 0; });
          if (!it.length && !pr.length) return;
          xh += '<details class="in"><summary>' + esc(c.nom) + " · " + (it.length ? plural(it.length, "mesure") : "") + (it.length && pr.length ? ", " : "") + (pr.length ? plural(pr.length, "prise") + " de parole récente" + (pr.length > 1 ? "s" : "") : "") + "</summary>" +
            (it.length ? '<ul class="lst">' + it.map(function (m) { return "<li>" + esc(m.texte) + ' <span class="mut">' + (m.nature === "declaration" ? "déclaration · " : "") + xsrc(m.source) + "</span></li>"; }).join("") + "</ul>" : "") +
            (pr.length ? '<ul class="lst">' + pr.map(function (x) { return "<li><b>" + esc(fdate(x.date)) + "</b> · " + esc(x.type) + ", " + esc(x.media) + (x.declare.length ? "<p>" + x.declare.map(esc).join(" ") + "</p>" : "") + ' <a class="xs" href="' + esc(x.url) + '" target="_blank" rel="noopener">source</a></li>'; }).join("") + "</ul>" : "") + "</details>";
        });
        if (xh) h += '<h2 class="h2">Mesures et déclarations recensées ailleurs</h2><p class="mut">Relevé indépendant, mis à jour chaque jour, qui complète nos revues.</p>' + xh + xcred();
      }
      $("#p-" + t.id + ' [data-p="adversaires"]').innerHTML = h || '<p class="mut">Les revues des programmes adverses ne couvrent pas encore ce thème.</p>';
    }

    // ---------- méthode
    $("#p-methode").innerHTML = '<div class="thead"><h1>Méthode et sources</h1></div><div class="prose">' +
      (function () {
        var I = C.intl, pc = function (x) { return x && x.n ? Math.round(100 * x.intl / x.n) + " %" : "n.d."; };
        return '<h2 class="h2">Sources</h2><p>Chaque analyse s\'appuie sur deux revues : les études académiques, en privilégiant les études causales françaises puis les études étrangères comparables, et les travaux des institutions spécialisées (Trésor, Cour des comptes, CAE et son simulateur budgétaire, France Stratégie, IPP, Insee, OFCE, OCDE, Eurostat, Commission européenne). Chaque chiffre est vérifié contre sa source originale et inscrit dans un registre (chiffre, source, page, citation).</p>' +
          (I ? '<p><strong>Comparaisons internationales.</strong> Les analyses comparent systématiquement le fonctionnement de politiques similaires à l\'étranger (Allemagne, Royaume-Uni, Suède, Danemark, États-Unis, Espagne…) ou s\'appuient sur des données européennes et internationales. Chaque analyse comporte une rubrique « Ailleurs » : un exemple étranger comparable, tiré d\'une évaluation causale ou d\'un rapport d\'institution, et ce qu\'il implique pour la mesure ; quand aucun exemple pertinent n\'existe, la rubrique le dit. Analyses avec un exemple étranger : ' + pc(I.philippe) + " pour les mesures de Philippe, " + pc(I.adversaires) + " pour les propositions adverses, " + pc(I.fiches) + " pour les fiches riposte (calcul automatique à chaque mise à jour).</p>" : "");
      })() +
      "<h2 class=\"h2\">Verdicts</h2><p>" + ["solide", "bonne-direction", "mal-ciblee", "mal-calibree", "mal-concue", "a-chiffrer", "a-preciser", "non-analysee"].map(function (v) { return badge(v); }).join(" ") + "</p>" +
      "<ul><li><strong>Bien fondée</strong> : les études et évaluations disponibles soutiennent la mesure telle qu'elle est écrite, pour sa cible, son instrument et son montant.</li><li><strong>Bonne direction</strong> : l'objectif et l'instrument sont les bons, mais l'ampleur ou les modalités ne sont pas encore étayées par les études.</li><li><strong>Mal ciblée</strong> : l'instrument peut fonctionner, mais ses bénéfices iront surtout à d'autres publics que ceux visés (effet d'aubaine, ménages qui n'en ont pas besoin). À corriger : <em>qui</em> en bénéficie (conditions, plafonds, publics).</li><li><strong>Mal calibrée</strong> : la cible et l'instrument sont les bons, mais le montant, le seuil ou le calendrier est trop élevé, trop faible ou irréaliste au regard du coût et de l'effet attendu. À corriger : <em>un chiffre</em>.</li><li><strong>Mal conçue</strong> : l'instrument ne peut pas produire l'effet annoncé, quels que soient son montant et sa cible, parce qu'il est contre-productif, redondant avec un dispositif existant ou seulement déclaratif. À corriger : <em>l'instrument lui-même</em>.</li><li><strong>À chiffrer</strong> : le coût n'est pas donné, la mesure ne peut pas être jugée sans lui. <strong>À préciser</strong> : la forme de la mesure n'est pas encore connue.</li></ul><p><strong>Pour trancher entre les trois verdicts critiques</strong> : si la correction porte sur les bénéficiaires, la mesure est mal ciblée ; si elle porte sur un chiffre, mal calibrée ; si elle oblige à changer d'outil, mal conçue. Une mesure peut porter deux verdicts. Les mêmes définitions s'appliquent aux propositions des adversaires.</p>" +
      '<h2 class="h2">Analyse économique (mesures régaliennes et autres)</h2><p>Pour les mesures qui ne se prêtent pas à un verdict d\'efficacité (sécurité, justice, immigration, défense, Outre-mer…), le groupe donne une analyse neutre : coût estimé et source, et écart avec la politique actuelle. <strong>Continuité</strong> : le dispositif existe déjà. <strong>Inflexion</strong> : extension ou renforcement d\'un dispositif existant. <strong>Rupture</strong> : nouveau principe ou changement de droit.</p><h2 class="h2">Sensibilité politique</h2><p>Prédiction du groupe, mesure par mesure : forte, moyenne ou faible, selon la taille et la visibilité des perdants, le poids symbolique du sujet et le fait que les adversaires en font un thème phare. C\'est une estimation, pas un sondage.</p>' +
      (X ? '<h2 class="h2">À propos des positions déclarées</h2><p>Les positions affichées dans « Positions déclarées » et « Mesures et déclarations recensées ailleurs » viennent de 2027 et moi, un site indépendant qui relève, pour chaque candidat, ses prises de position avec leur source et leur date. Ses données sont publiques (' + esc(X.source.licence) + ') : nous les récupérons chaque jour et republions le site. Elles ne remplacent pas nos analyses : elles disent ce que le candidat a déclaré, pas si la mesure est bonne. Pour un second regard, chaque bloc renvoie aussi vers la fiche du candidat sur France-Vote, qui estime ses positions à partir de ses déclarations, de ses votes et des textes de son parti ; nous n\'en reprenons pas le contenu. Les programmes pour 2027 ne sont pas tous publiés ni complets : ces positions peuvent changer d\'ici l\'élection. « Non connu » signifie qu\'aucune source vérifiable n\'a été trouvée, pas que le candidat n\'a pas d\'avis.</p><p class="mut">Dernière récupération : ' + fdate(X.recupere_le) + ". Données 2027 et moi du " + fdate(X.source.mise_a_jour) + ' (<a href="' + esc(X.source.depot) + '" target="_blank" rel="noopener">dépôt public</a>).</p>' +
        (function () { var o = X.questions.filter(function (q) { return !q.onglet; }); return o.length ? '<h3>Autres questions (hors thèmes du site)</h3>' + xtable(o) : ""; })() : "") +
      '<h2 class="h2">Positions des adversaires</h2><p>Pour chaque mesure analysée, la position de chaque adversaire d\'après nos revues de leurs programmes : opposée, désaccord partiel, proche, ou pas de position. Chaque proposition adverse est rangée dans un seul thème.</p>' +
      "<h2 class=\"h2\">Preuves</h2><p>Études causales (françaises d'abord), puis évaluations officielles (Cour des comptes, CAE, Insee, DREES, IPP, OCDE), puis chiffrages (Fipeco, Institut Montaigne). La presse sert de piste, jamais de preuve. Chaque chiffre a été lu dans sa source, sinon il est marqué « à vérifier ». Les mesures et éléments de langage de la campagne sont repris mot pour mot du livret (" + esc(P.source.livret) + ") et du site edouardphilippe.fr.</p>" +
      '<p>' + corr("site", "") + '</p><h2 class="h2">Mises à jour</h2><ul><li>Programme Philippe : revue du ' + fdate(P.source.maj) + "</li>" + A.map(function (a) { return "<li>" + esc(a.nom) + " : " + (a.source.maj ? "revue du " + fdate(a.source.maj) : "pas de revue complète") + (a.source.fiches_maj ? ", fiches riposte du " + fdate(a.source.fiches_maj) : "") + "</li>"; }).join("") + "</ul>" +
      '<details class="in"><summary>Sources de l\'analyse du programme Philippe</summary>' + md(P.sources_md) + "</details></div>";

    // ---------- recherche globale
    var advAll = []; A.forEach(function (a) { a.themes.forEach(function (g) { g.items.forEach(function (it) { if (it.theme) advAll.push({ a: a, t: it.theme, titre: it.titre, s: norm(it.titre + " " + it.texte) }); }); }); if (a.riposte) a.riposte.fiches.forEach(function (f) { if (f.theme) advAll.push({ a: a, t: f.theme, titre: f.titre, s: norm(f.titre + " " + (f["Ce qui a été dit"] || "") + " " + (f["Riposte"] || "")) }); }); });
    var prev = "accueil";
    $("#gq").addEventListener("input", function () {
      var q = norm(this.value.trim());
      if (!q) { go(prev); return; }
      if (cur !== "recherche") prev = cur;
      var ms = P.mesures.filter(function (m) { return mt(m._txt, q); }), as = advAll.filter(function (x) { return mt(x.s, q); });
      $$(".tab").forEach(function (t) { t.setAttribute("aria-selected", false); });
      $$("#app > .panel").forEach(function (p) { p.hidden = p.id !== "p-recherche"; }); cur = "recherche";
      $("#p-recherche").innerHTML = '<div class="thead"><h1>Recherche</h1><p class="mut">' + plural(ms.length, "mesure") + " de Philippe, " + plural(as.length, "analyse") + " d'adversaires</p></div>" +
        (ms.length ? '<h2 class="h2">Mesures de Philippe</h2><ul class="lst">' + ms.slice(0, 60).map(function (m) { return mlink(m, ' <span class="mut">· ' + esc(thById[m.theme].court) + "</span>"); }).join("") + "</ul>" : "") +
        (as.length ? '<h2 class="h2">Programmes adverses</h2><ul class="lst">' + as.slice(0, 60).map(function (x) { return '<li><a href="#" data-go="' + x.t + '" data-sub="adversaires" data-r="' + rid(x.titre) + '">' + esc(x.titre) + '</a> <span class="mut">· ' + esc(x.a.nom) + " · " + esc(thById[x.t].court) + "</span></li>"; }).join("") + "</ul>" : "");
    });

    document.addEventListener("click", function (ev) {
      var t = ev.target; if (!t || !t.closest) return;
      var cb = t.closest(".cmt"); if (cb && t.closest("button")) {
        ev.preventDefault(); var cid = cb.getAttribute("data-cid"), btn = t.closest("button");
        if (btn.classList.contains("csend")) { cSend(); return; }
        if (btn.classList.contains("cclear")) { localStorage.setItem(CK + cid, "null"); cb.querySelector(".cp").innerHTML = ""; cb.querySelector(".cc").value = ""; cb.querySelector(".cv").value = cb.getAttribute("data-orig"); return; }
        if (btn.classList.contains("csave")) { var orig = cb.getAttribute("data-orig") || ""; var rec = { id: cid, label: cb.getAttribute("data-label") || cid, texte: orig, version: cb.querySelector(".cv").value, commentaire: cb.querySelector(".cc").value, date: new Date().toISOString() }; localStorage.setItem(CK + cid, JSON.stringify(rec)); cb.querySelector(".cp").innerHTML = wdiff(orig, rec.version); $$(".csend").forEach(function (x) { x.textContent = "Envoyer mes commentaires (" + cAll().length + ")"; }); return; }
      }
      var n = t.closest("[data-n]"); if (n) { ev.preventDefault(); var m = byNum[+n.getAttribute("data-n")]; $("#gq").value = ""; tst[m.theme].v = tst[m.theme].s = null; if (!m.analyses.length) tst[m.theme].onlyA = false; renderMes(thById[m.theme]); go(m.theme, "mesures", m.num); return; }
      var g = t.closest("[data-go]"); if (g) { ev.preventDefault(); $("#gq").value = ""; go(g.getAttribute("data-go"), g.getAttribute("data-sub")); var r = g.getAttribute("data-r") && document.getElementById(g.getAttribute("data-r")); if (r) { r.open = true; r.scrollIntoView({ block: "start" }); } }
    });
    $$("[data-f]").forEach(function (el) { el.style.flex = el.getAttribute("data-f"); });
    $$("[data-w]").forEach(function (el) { el.style.width = el.getAttribute("data-w") + "%"; });
    var fromHash = function () { var h = location.hash.slice(1).split("/"); go(h[0] || "accueil", h[1]); };
    window.addEventListener("hashchange", fromHash);
    window.addEventListener("popstate", fromHash);
    fromHash();
  }
})();
