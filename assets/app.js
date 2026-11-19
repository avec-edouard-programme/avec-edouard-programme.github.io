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
    var NAV = [["accueil", "Accueil"]].concat(TH.map(function (t) { return [t.id, t.court]; })).concat([["methode", "Méthode"]]);
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
        if (m.edl_propose && m.edl_propose.par_analyse) m.edl_propose.par_analyse.forEach(function (e) { h += '<details class="in"><summary>Élément de langage proposé</summary>' + md(e.edl) + (e.pourquoi ? '<p class="mut">' + inline(e.pourquoi) + "</p>" : "") + "</details>"; });
        h += "</div>";
      }
      var rr = m._att ? RIV.map(function (r) { var c = m._att[r.id]; if (!c || c.position === "absente") return ""; return '<p class="arow"><span class="p-' + c.position + '"><b>' + esc(r.bloc) + "</b> " + esc(PLAB[c.position]) + "</span> " + esc(c.motif || c.proposition || "") + "</p>"; }).join("") : "";
      if (rr) h += '<div class="box"><h4>Face aux adversaires</h4>' + rr + "</div>";
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
      '<p class="lead">' + P.mesures.length + " mesures du livret du 18 novembre. " + analysed.length + " sont passées au crible par nos agents de recherche : verdict, preuves, sensibilité politique, ce qu'il faudrait changer, et ce qu'en disent " + A.map(function (a) { return a.nom; }).join(", ").replace(/, ([^,]*)$/, " et $1") + ".</p></div>" +
      '<h2 class="h2">Par thème</h2><div class="grid">' + TH.map(function (t) {
        var ns = t.mes.filter(function (m) { return m._s && m._s.niveau === "forte"; }).length;
        return '<a class="tile" href="#' + t.id + '" data-go="' + t.id + '"><b>' + esc(t.nom) + '</b><span class="mut">' + (t.an.length ? t.an.length + " sur " + t.mes.length + " mesures analysées" : t.mes.length + " mesures, pas encore analysées") + "</span>" + vbar(t.an) +
          '<span class="mut">' + (ns ? plural(ns, "mesure") + " à sensibilité forte · " : "") + plural(t.nadv, "analyse") + " d'adversaires</span></a>";
      }).join("") + "</div>" +
      (PH ? '<h2 class="h2">Les 11 mesures phares pour les jeunes</h2><p class="mut">' + esc(PH.source) + ". Chaque mesure renvoie à sa fiche dans le livret.</p><ol class=\"lst\">" + PH.mesures.map(function (x) {
        return "<li><b>" + esc(x.titre) + "</b><p>" + x.nums.map(function (n) { var m = byNum[n]; return '<a href="#" data-n="' + n + '">N°' + n + "</a> " + (m.analyses.length ? badge(m._v[0]) : '<span class="mut">analyse en cours</span>') + " " + sensB(m); }).join(" · ") + "</p></li>";
      }).join("") + "</ol>" : "") +
      (fragile.length ? '<h2 class="h2">À corriger en priorité</h2><p class="mut">Fragiles selon nos preuves et les plus exposées aux attaques des adversaires.</p><ol class="lst">' + fragile.slice(0, 6).map(function (m) { return mlink(m, ' <span class="mut">· ' + esc(thById[m.theme].court) + (m._top ? " · attaque " + esc(blocOf(m._top)) : "") + "</span>" + (m._s && m._s.niveau === "forte" ? " " + sensB(m) : "")); }).join("") + "</ol>" : "");

    // ---------- pages thème
    var SUBS = [["synthese", "Synthèse"], ["mesures", "Mesures de Philippe"], ["adversaires", "Face aux adversaires"]];
    var tst = {};
    TH.forEach(function (t) {
      tst[t.id] = { v: null, s: null, onlyA: t.an.length > 0 };
      $("#p-" + t.id).innerHTML = '<div class="thead"><h1>' + esc(t.nom) + '</h1><p class="mut">' + (t.an.length ? t.an.length + " sur " + t.mes.length + " mesures analysées" : t.mes.length + " mesures, pas encore analysées par le groupe") + "</p></div>" +
        '<nav class="subtabs">' + SUBS.map(function (s) { return '<button data-sub="' + s[0] + '">' + s[1] + "</button>"; }).join("") + "</nav>" +
        SUBS.map(function (s) { return '<div class="sub" data-p="' + s[0] + '"></div>'; }).join("");
      $$("#p-" + t.id + " .subtabs button").forEach(function (b) { b.addEventListener("click", function () { go(t.id, b.getAttribute("data-sub")); }); });
      renderSyn(t); renderMes(t); renderAdv(t);
    });
    function showSub(id, sub) {
      $$("#p-" + id + " .subtabs button").forEach(function (b) { b.setAttribute("aria-selected", b.getAttribute("data-sub") === sub); });
      $$("#p-" + id + " .sub").forEach(function (d) { d.hidden = d.getAttribute("data-p") !== sub; });
    }
    function renderSyn(t) {
      var h = "";
      if (t.an.length) h += '<div class="kv">' + vbar(t.an) + '<p>' + vcounts(t.an) + "</p></div>";
      var chg = t.an.filter(function (m) { return m._piste; }).sort(function (a, b) { return (a._sol || 0) - (b._sol || 0); }).slice(0, 6);
      if (chg.length) h += '<h2 class="h2">Ce que nous recommandons de changer</h2><p class="mut">Les mesures les plus fragiles d\'abord ; toutes les fiches sont dans « Mesures de Philippe ».</p><ul class="lst rec">' + chg.map(function (m) { return mlink(m, " " + badge(m._v[0]) + '<p>' + inline(m._piste) + "</p>"); }).join("") + "</ul>";
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
      t.adv.forEach(function (x) {
        if (!x.items.length && !x.fiches.length) return;
        h += '<h2 class="h2">' + esc(x.a.nom) + ' <span class="mut">· revue du ' + fdate(x.a.source.maj) + "</span></h2>";
        x.fiches.forEach(function (f) {
          h += '<details class="mes" id="' + rid(f.titre) + '"><summary><div class="mh"><span class="num">Fiche riposte</span>' + (f.verdict ? badge(f.verdict, f.verdict, "f-") : "") + '</div><div class="mt">' + esc(f.titre) + "</div>" + (f["Ce qui a été dit"] ? '<p class="verd">' + inline(f["Ce qui a été dit"]) + "</p>" : "") + '</summary><div class="mb">' +
            (f["Riposte"] ? '<div class="box chg"><h4>Riposte</h4>' + md(f["Riposte"]) + "</div>" : "") +
            Object.keys(f).filter(function (k) { return ["titre", "verdict", "theme", "Ce qui a été dit", "Riposte"].indexOf(k) < 0; }).map(function (k) { return '<details class="in"><summary>' + esc(k) + "</summary>" + md(f[k]) + "</details>"; }).join("") + "</div></details>";
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
      "<h2 class=\"h2\">Verdicts</h2><p>" + ["solide", "bonne-direction", "mal-ciblee", "mal-calibree", "mal-concue", "a-chiffrer", "a-preciser", "non-analysee"].map(function (v) { return badge(v); }).join(" ") + "</p>" +
      "<ul><li><strong>Bien fondée</strong> : les études soutiennent la mesure telle qu'écrite.</li><li><strong>Bonne direction</strong> : le diagnostic est juste, l'instrument est à ajuster.</li><li><strong>Mal ciblée</strong> : elle profite surtout à d'autres publics que ceux visés.</li><li><strong>Mal calibrée</strong> : montant, seuil ou calendrier à revoir.</li><li><strong>Mal conçue</strong> : l'instrument ne produira pas l'effet annoncé.</li><li><strong>À chiffrer</strong> : coût absent. <strong>À préciser</strong> : la forme de la mesure n'est pas encore connue.</li></ul>" +
      '<h2 class="h2">Analyse économique (mesures régaliennes et autres)</h2><p>Pour les mesures qui ne se prêtent pas à un verdict d\'efficacité (sécurité, justice, immigration, défense, Outre-mer…), le groupe donne une analyse neutre : coût estimé et source, et écart avec la politique actuelle. <strong>Continuité</strong> : le dispositif existe déjà. <strong>Inflexion</strong> : extension ou renforcement d\'un dispositif existant. <strong>Rupture</strong> : nouveau principe ou changement de droit.</p><h2 class="h2">Sensibilité politique</h2><p>Prédiction du groupe, mesure par mesure : forte, moyenne ou faible, selon la taille et la visibilité des perdants, le poids symbolique du sujet et le fait que les adversaires en font un thème phare. C\'est une estimation, pas un sondage.</p>' +
      (X ? '<h2 class="h2">À propos des positions déclarées</h2><p>Les positions affichées dans « Positions déclarées » et « Mesures et déclarations recensées ailleurs » viennent de 2027 et moi, un site indépendant qui relève, pour chaque candidat, ses prises de position avec leur source et leur date. Ses données sont publiques (' + esc(X.source.licence) + ') : nous les récupérons chaque jour et republions le site. Elles ne remplacent pas nos analyses : elles disent ce que le candidat a déclaré, pas si la mesure est bonne. Pour un second regard, chaque bloc renvoie aussi vers la fiche du candidat sur France-Vote, qui estime ses positions à partir de ses déclarations, de ses votes et des textes de son parti ; nous n\'en reprenons pas le contenu. Les programmes pour 2027 ne sont pas tous publiés ni complets : ces positions peuvent changer d\'ici l\'élection. « Non connu » signifie qu\'aucune source vérifiable n\'a été trouvée, pas que le candidat n\'a pas d\'avis.</p><p class="mut">Dernière récupération : ' + fdate(X.recupere_le) + ". Données 2027 et moi du " + fdate(X.source.mise_a_jour) + ' (<a href="' + esc(X.source.depot) + '" target="_blank" rel="noopener">dépôt public</a>).</p>' +
        (function () { var o = X.questions.filter(function (q) { return !q.onglet; }); return o.length ? '<h3>Autres questions (hors thèmes du site)</h3>' + xtable(o) : ""; })() : "") +
      '<h2 class="h2">Positions des adversaires</h2><p>Pour chaque mesure analysée, la position de chaque adversaire d\'après nos revues de leurs programmes : opposée, désaccord partiel, proche, ou pas de position. Chaque proposition adverse est rangée dans un seul thème.</p>' +
      "<h2 class=\"h2\">Preuves</h2><p>Études causales (françaises d'abord), puis évaluations officielles (Cour des comptes, CAE, Insee, DREES, IPP, OCDE), puis chiffrages (Fipeco, Institut Montaigne). La presse sert de piste, jamais de preuve. Chaque chiffre a été lu dans sa source, sinon il est marqué « à vérifier ». Les mesures et éléments de langage de la campagne sont repris mot pour mot du livret (" + esc(P.source.livret) + ") et du site edouardphilippe.fr.</p>" +
      '<p>' + corr("site", "") + '</p><h2 class="h2">Mises à jour</h2><ul><li>Programme Philippe : revue du ' + fdate(P.source.maj) + "</li>" + A.map(function (a) { return "<li>" + esc(a.nom) + " : revue du " + fdate(a.source.maj) + (a.source.fiches_maj ? ", fiches riposte du " + fdate(a.source.fiches_maj) : "") + "</li>"; }).join("") + "</ul>" +
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
      var n = t.closest("[data-n]"); if (n) { ev.preventDefault(); var m = byNum[+n.getAttribute("data-n")]; $("#gq").value = ""; tst[m.theme].v = tst[m.theme].s = null; if (!m.analyses.length) tst[m.theme].onlyA = false; renderMes(thById[m.theme]); go(m.theme, "mesures", m.num); return; }
      var g = t.closest("[data-go]"); if (g) { ev.preventDefault(); $("#gq").value = ""; go(g.getAttribute("data-go"), g.getAttribute("data-sub")); var r = g.getAttribute("data-r") && document.getElementById(g.getAttribute("data-r")); if (r) { r.open = true; r.scrollIntoView({ block: "start" }); } }
    });
    $$("[data-f]").forEach(function (el) { el.style.flex = el.getAttribute("data-f"); });
    var fromHash = function () { var h = location.hash.slice(1).split("/"); go(h[0] || "accueil", h[1]); };
    window.addEventListener("hashchange", fromHash);
    window.addEventListener("popstate", fromHash);
    fromHash();
  }
})();
