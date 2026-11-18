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
  $("#cdtop").innerHTML = "<b>J-" + days(ELECTION) + "</b> avant le premier tour";

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
    login($("#email").value, $("#pw").value).then(start).catch(function () { $("#err").textContent = "Adresse ou mot de passe incorrect."; })
      .then(function () { $("#go").disabled = false; $("#go").textContent = "Ouvrir"; });
  });
  $("#logout").addEventListener("click", function () { sessionStorage.removeItem("pk"); location.hash = ""; location.reload(); });
  if (sessionStorage.getItem("pk")) getBundle().then(function (b) { return openWithKey(b64d(sessionStorage.getItem("pk")), b); }).then(start).catch(function () { sessionStorage.removeItem("pk"); });

  // ---------- vocabulaire
  var VLAB = { "solide": "Bien fondée", "bonne-direction": "Bonne direction", "mal-ciblee": "Mal ciblée", "mal-calibree": "Mal calibrée", "mal-concue": "Mal conçue", "a-chiffrer": "À chiffrer", "a-preciser": "À préciser", "non-analysee": "Non analysée" };
  var VSCORE = { "solide": 100, "bonne-direction": 70, "a-preciser": 50, "a-chiffrer": 50, "mal-calibree": 35, "mal-ciblee": 30, "mal-concue": 15 };
  var POS = { opposee: 70, partielle: 45, convergente: 20, absente: 5 };
  var PLAB = { opposee: "Position opposée", partielle: "Désaccord partiel", convergente: "Position proche", absente: "Pas de position" };
  var BCOL = { lepen: "#5B8DEF", melenchon: "#FF5C61", lisnard: "#F2B84B" };
  var badge = function (v, lab) { return '<span class="badge b-' + esc(v) + '">' + esc(lab || VLAB[v] || v) + "</span>"; };
  var PISTE = /(Mieux vaut|La piste sérieuse|Privilégions|Ciblons|Réservons|Conditionnons|Il faut (?:plutôt|le|reprendre)|Je recommande|Préférer|Mieux vaudrait)[^.]*\./;
  var firstSentence = function (s) { var m = String(s || "").replace(/\s+/g, " ").match(/^.+?[.!?](?=\s|$)/); return m ? m[0] : ""; };

  function start(C) {
    $("#login").hidden = true; $("#logout").hidden = false; $("#tabs").hidden = false;
    var app = $("#app"); app.hidden = false;
    var P = C.philippe, A = C.adversaires, anal = P.analyses, AT = C.attaques, ECH = C.echeances || [];
    var advById = {}; A.forEach(function (a) { advById[a.id] = a; });
    var RIV = AT ? AT.rivaux : [];
    var CONTACT = (C.config || {}).contact, VER = {}, AJN = {};
    var ds = function (txt) { return ' data-s="' + esc(norm(txt)) + '"'; };
    var corr = function (ref, title) {
      if (!CONTACT) return "";
      var s = "[Programmes 2027] Correction : " + ref + " " + String(title || "").slice(0, 80);
      var b = "Élément concerné : " + ref + "\n\nCe qui est à corriger :\n\nSource (lien, page) :\n";
      return '<a class="corr" href="mailto:' + esc(CONTACT) + "?subject=" + encodeURIComponent(s) + "&body=" + encodeURIComponent(b) + '">Signaler une correction</a>';
    };
    var SLAB = { modifie: "Modifiée depuis le site", precise: "Précisée", nouveau: "Nouvelle (volume 1)", retire: "Retirée" };
    var RLAB = { "complète": "Complète", "corrige": "Corrige", "nouveau": "Proposition nouvelle" };
    var rkey = function (r) { return norm(r).replace(/[^a-z]/g, ""); };
    if (C.versions) C.versions.changements.forEach(function (v) { if (v.num != null) (VER[v.num] = VER[v.num] || []).push(v); });
    if (C.ajouts) C.ajouts.ajouts.forEach(function (a) { (a.mesures || []).forEach(function (n) { (AJN[n] = AJN[n] || []).push(a); }); });
    var blocOf = function (id) { return (RIV.filter(function (r) { return r.id === id; })[0] || {}).bloc || ""; };

    // scores
    var attScore = function (c) { if (!c || c.position === "absente") return POS.absente; return Math.min(95, POS[c.position] + (c.saillance ? 20 : 0)); };
    P.mesures.forEach(function (m) {
      var v = [];
      m.analyses.forEach(function (t) { (anal[t].verdicts || []).forEach(function (x) { if (v.indexOf(x) < 0) v.push(x); }); });
      m._v = v.length ? v : ["non-analysee"];
      var sc = v.filter(function (x) { return VSCORE[x] != null; }).map(function (x) { return VSCORE[x]; });
      m._sol = sc.length ? sc.reduce(function (a, b) { return a + b; }, 0) / sc.length : null;
      var at = AT && AT.mesures[m.num];
      m._att = at || null; m._expo = 0; m._top = null;
      if (at) RIV.forEach(function (r) { var s = attScore(at[r.id]); if (s > m._expo) { m._expo = s; m._top = r.id; } });
      m._txt = norm("n°" + m.num + " " + m.titre + " " + (m.texte || "") + " " + m.section + " " + m.analyses.join(" ") + " " + (AJN[m.num] || []).map(function (a) { return a.titre; }).join(" "));
    });
    var analysed = P.mesures.filter(function (m) { return m.analyses.length; });
    var vc = {}; P.mesures.forEach(function (m) { m._v.forEach(function (v) { vc[v] = (vc[v] || 0) + 1; }); });
    var sectionPP = function (sec) {
      var subs = (C.rattachement_pp || {})[sec] || [], names = [];
      if (!C.porte_parole) return "";
      C.porte_parole.themes.forEach(function (t) { t.sous_themes.forEach(function (s) { if (subs.indexOf(s.sous_theme) >= 0) s.personnes.forEach(function (p) { if (names.indexOf(p.nom) < 0) names.push(p.nom); }); }); });
      return names.length ? "Porte-parole : " + names.join(", ") : "";
    };

    // ---------- navigation numérotée
    var SECS = [["synthese", "Vue d'ensemble"], ["philippe", "Programme Philippe"], ["versions", "Ce qui a changé"], ["ajouts", "Nos ajouts"], ["attaques", "Attaques probables"], ["questions", "Questions à l'équipe"], ["adversaires", "Adversaires"], ["comparer", "Comparer"], ["echeances", "Échéances"], ["calendrier", "Calendrier"], ["methode", "Méthode"]];
    var nn = function (i) { return (i < 9 ? "0" : "") + (i + 1); };
    $("#tabs").innerHTML = SECS.map(function (s, i) { return '<button class="tab" role="tab" id="t-' + s[0] + '" aria-controls="p-' + s[0] + '" aria-selected="' + (i === 0) + '"><span>' + nn(i) + "</span>" + s[1] + '<em class="hits" hidden></em></button>'; }).join("");
    app.innerHTML = SECS.map(function (s, i) { return '<section class="panel sec" role="tabpanel" id="p-' + s[0] + '"' + (i ? " hidden" : "") + "></section>"; }).join("");
    var openTab = function (id) {
      $$(".tab").forEach(function (t) { var on = t.id === "t-" + id; t.setAttribute("aria-selected", on); $("#p-" + t.id.slice(2)).hidden = !on; });
      history.replaceState(null, "", "#" + id); window.scrollTo(0, 0);
    };
    $$(".tab").forEach(function (t) { t.addEventListener("click", function () { openTab(t.id.slice(2)); }); });
    var shead = function (i, q, h, lead) { return '<div class="shead"><span class="num">' + nn(i) + '</span><div><p class="q">' + q + "</p><h2>" + h + "</h2></div>" + (lead ? '<p class="lead">' + lead + "</p>" : "") + "</div>"; };
    var gotoMesure;

    // ---------- 01 vue d'ensemble
    var upcoming = C.calendrier.map(function (e) { return { date: e.date, t: e.quand, p: e.sujet, tg: "Campagne" }; })
      .concat(ECH.map(function (e) { return { date: e.date, t: fdate(e.date, e.precision), p: e.quoi, tg: "Échéance · " + e.effet }; }))
      .filter(function (e) { return days(e.date) >= 0; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }).slice(0, 8);
    var fragile = analysed.filter(function (m) { return m._sol != null && m._sol < 50; }).sort(function (a, b) { return b._expo - a._expo; });
    $("#p-synthese").innerHTML =
      '<div class="hero"><span class="kicker">Mise à jour du ' + fdate(C.genere_le) + "</span>" +
      "<h1>Le programme d'Édouard Philippe, <em>mesure par mesure</em></h1>" +
      '<div class="hfoot"><div class="hintro"><p>Les <b>' + P.mesures.length + " mesures</b> du livret du 18 novembre, reprises mot pour mot. <b>" + analysed.length + "</b> sont analysées par le groupe : verdict, preuves, ce que dit la campagne, ce qui pourrait changer et les attaques à prévoir de la part du RN, de LFI et de la droite.</p><p>Reconstruit chaque semaine à partir des revues du groupe.</p></div>" +
      '<div class="cd"><b>' + days(ELECTION) + "</b><span>jours avant le premier tour</span></div>" +
      '<div class="nextd"><div class="hd"><span>Prochaines dates</span><span class="nv"><button id="np" aria-label="Précédente">‹</button><button id="nx" aria-label="Suivante">›</button></span></div><div id="ndone"></div><div class="dots" id="ndots"></div></div></div></div>' +
      '<div class="kpis"><div class="kpi"><b>' + P.mesures.length + '</b>mesures dans le livret</div><div class="kpi"><b>' + analysed.length + "</b>analysées</div>" +
      ["solide", "bonne-direction", "mal-ciblee", "mal-calibree", "mal-concue"].map(function (v) { return '<div class="kpi"><b>' + (vc[v] || 0) + "</b>" + VLAB[v].toLowerCase() + "</div>"; }).join("") + "</div>" +
      (fragile.length ? '<h3 class="sub">À corriger en priorité</h3><p class="pp">Mesures jugées fragiles par le groupe et les plus exposées à une attaque d\'un adversaire.</p><div class="box att"><ol class="top5">' + fragile.slice(0, 5).map(function (m) { return '<li><a data-n="' + m.num + '">N°' + m.num + "</a> " + esc(m.titre) + ' <span class="pp">exposition ' + m._expo + (m._top ? " · " + esc(blocOf(m._top)) : "") + "</span></li>"; }).join("") + "</ol></div>" : "") +
      '<h3 class="sub">Les dix priorités du livret</h3><ol>' + P.priorites.map(function (p) { return "<li><strong>" + esc(p.titre) + ".</strong> " + esc(p.texte) + "</li>"; }).join("") + "</ol>" +
      '<h3 class="sub">Adversaires : l\'essentiel</h3>' + A.map(function (a) { return '<div class="card"><div class="titre">' + esc(a.nom) + '</div><p class="pp">Revue du ' + fdate(a.source.maj) + "</p>" + (a.riposte && a.riposte.en_bref ? md(a.riposte.en_bref) : md(a.intro)) + '<p><a href="#adversaires" data-adv="' + a.id + '">Voir l\'analyse complète</a></p></div>'; }).join("");
    var ni = 0, timer = null;
    var showN = function (i) {
      if (!upcoming.length) return; ni = (i + upcoming.length) % upcoming.length; var e = upcoming[ni], d = days(e.date);
      $("#ndone").innerHTML = '<div class="one"><b>' + (d === 0 ? "Aujourd'hui" : "J-" + d) + "<small>" + esc(e.t) + "</small></b><p>" + esc(e.p) + '<span class="tg">' + esc(e.tg) + "</span></p></div>";
      $("#ndots").innerHTML = upcoming.map(function (_, k) { return "<i" + (k === ni ? ' class="on"' : "") + "></i>"; }).join("");
    };
    var auto = function () { clearInterval(timer); if (!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) timer = setInterval(function () { showN(ni + 1); }, 5000); };
    showN(0); auto();
    $("#np").addEventListener("click", function () { showN(ni - 1); auto(); });
    $("#nx").addEventListener("click", function () { showN(ni + 1); auto(); });

    // ---------- 02 programme Philippe
    var sectionsL = []; P.mesures.forEach(function (m) { if (sectionsL.indexOf(m.section) < 0) sectionsL.push(m.section); });
    var st = { sec: null, v: null, onlyA: true, q: "" };
    $("#p-philippe").innerHTML = shead(1, "Que propose le livret, et que faudrait-il changer ?", "Le programme, mesure par mesure",
      "Chaque mesure est reprise mot pour mot. Pour les mesures analysées : le verdict en une phrase, puis l'analyse, ce que dit la campagne aujourd'hui, ce qui pourrait changer avec un élément de langage proposé, et ce que les adversaires peuvent attaquer.") +
      '<div class="filters" id="f-v"><span class="lbl">Verdict</span></div><div class="filters" id="f-s"><span class="lbl">Thème</span></div>' +
      '<div class="filters"><label class="tog"><input type="checkbox" id="onlyA" checked> Mesures analysées seulement</label><input class="search" id="q" type="search" placeholder="Rechercher (N°49, retraites, IFI…)"></div><p class="count2" id="count"></p><div id="cards"></div>';
    var chip = function (box, key, val, lab, n) {
      var b = document.createElement("button"); b.className = "chip"; b.setAttribute("aria-pressed", "false");
      b.innerHTML = esc(lab) + (n != null ? '<span class="n">' + n + "</span>" : "");
      b.addEventListener("click", function () { st[key] = st[key] === val ? null : val; renderP(); });
      b._k = key; b._v = val; box.appendChild(b);
    };
    Object.keys(VLAB).forEach(function (v) { if (vc[v]) chip($("#f-v"), "v", v, VLAB[v], vc[v]); });
    sectionsL.forEach(function (s) { chip($("#f-s"), "sec", s, s, P.mesures.filter(function (m) { return m.section === s; }).length); });
    $("#onlyA").addEventListener("change", function () { st.onlyA = this.checked; renderP(); });
    $("#q").addEventListener("input", function () { st.q = norm(this.value); renderP(); });
    var attRows = function (m) {
      if (!m._att) return "";
      var rows = RIV.map(function (r) { var c = m._att[r.id]; if (!c || c.position === "absente") return ""; return '<div class="att-row"><span style="color:' + BCOL[r.id] + '">' + esc(r.bloc) + '</span><span class="sc">' + attScore(c) + "</span><span>" + esc(PLAB[c.position]) + (c.motif ? " · " + esc(c.motif) : "") + '<br><span class="pp">' + esc(advById[r.id] ? advById[r.id].nom : "") + " : " + esc(c.proposition || "") + "</span></span></div>"; }).join("");
      return rows ? '<div class="box att"><h4>Ce que les adversaires peuvent attaquer</h4>' + rows + "</div>" : "";
    };
    function card(m) {
      var h = '<article class="card v-' + m._v[0] + '" id="m' + m.num + '">';
      h += '<div class="card-h"><span class="num">N°' + m.num + "</span><span>" + esc(m.section) + " · p. " + esc(m.page) + "</span>" + m._v.map(function (v) { return badge(v); }).join("") + (m._expo >= 50 ? '<span class="badge" style="color:var(--red)">Exposée ' + m._expo + "</span>" : "") + (VER[m.num] || []).map(function (v) { return badge(v.statut, SLAB[v.statut]); }).join("") + "</div>";
      h += '<div class="titre">' + esc(m.titre) + "</div>" + (m.texte ? '<p class="texte">' + esc(m.texte) + "</p>" : "");
      var pp = sectionPP(m.section); if (pp) h += '<p class="pp">' + esc(pp) + "</p>";
      m.analyses.forEach(function (t) {
        var a = anal[t], txt = a.fiche || a.detail, one = firstSentence(txt);
        if (one) h += '<p class="enclair">' + inline(one) + "</p>";
        h += '<details class="box more"><summary>Notre analyse' + (m.analyses.length > 1 ? " · " + esc(a.titre) : "") + "</summary>" + md(txt) + (a.detail && a.fiche ? "<h4>Analyse détaillée et sources</h4>" + md(a.detail) : "") + "</details>";
      });
      if (m.edl && m.edl.length) h += '<details class="box edl"><summary><strong>Ce que dit la campagne aujourd\'hui (' + m.edl.length + ")</strong></summary>" + m.edl.map(function (e) { return "<p><strong>" + esc(e.question) + "</strong><br>" + esc(e.reponse) + '</p><p class="pp">' + esc(e.source) + "</p>"; }).join("") + "</details>";
      if (m.edl_propose && m.edl_propose.par_analyse) m.edl_propose.par_analyse.forEach(function (e) {
        var a = anal[e.analyse] || anal[m.analyses[0]], piste = a ? ((a.fiche || a.detail).match(PISTE) || [])[0] : null;
        h += '<div class="box change"><h4>Ce qui pourrait changer</h4>' + (piste ? "<p>" + inline(piste) + "</p>" : "") + "<h4>Élément de langage proposé</h4>" + md(e.edl) + (e.pourquoi ? '<p class="pp">' + inline(e.pourquoi) + "</p>" : "") + '<p class="pp">' + esc(m.edl_propose.source) + "</p></div>";
      });
      if (AJN[m.num]) h += '<div class="box ajout"><h4>Ce que nos travaux ajoutent</h4><ul>' + AJN[m.num].map(function (a) { return "<li><strong>" + esc(a.titre) + "</strong> " + esc(String(a.texte).replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰]+/g, "")) + ' <span class="pp">(' + esc(a.groupe) + ", " + esc(RLAB[a.relation] || a.relation) + ")</span></li>"; }).join("") + "</ul></div>";
      (VER[m.num] || []).forEach(function (v) { if (v.avant) h += '<details class="box more"><summary>Ce qui a changé depuis le site (' + esc(SLAB[v.statut]) + ')</summary><div class="vcmp"><div class="av"><h4>Avant</h4>' + esc(v.avant) + '<p class="pp">' + esc(v.avant_source) + '</p></div><div class="ap"><h4>Livret</h4>' + esc(v.apres) + "</div></div>" + (v.note ? '<p class="pp">' + esc(v.note) + "</p>" : "") + "</details>"; });
      h += attRows(m) + corr("N°" + m.num, m.titre);
      return h + "</article>";
    }
    function renderP() {
      $$("#p-philippe .chip").forEach(function (b) { b.setAttribute("aria-pressed", st[b._k] === b._v); });
      var list = P.mesures.filter(function (m) { return (!st.onlyA || m.analyses.length) && (!st.sec || m.section === st.sec) && (!st.v || m._v.indexOf(st.v) >= 0) && mt(m._txt, st.q); });
      $("#count").textContent = list.length + " mesure" + (list.length > 1 ? "s" : "");
      $("#cards").innerHTML = list.map(card).join("") || '<p class="empty">Aucune mesure ne correspond.</p>';
    }
    renderP();
    gotoMesure = function (n) { st = { sec: null, v: null, onlyA: false, q: "" }; $("#onlyA").checked = false; $("#q").value = ""; renderP(); openTab("philippe"); var el = $("#m" + n); if (el && el.scrollIntoView) el.scrollIntoView(); };

    // ---------- 03 attaques probables
    if (AT) {
      var W = 640, H = 430, L = 48, R = 16, T = 18, B = 44;
      var X = function (v) { return L + (W - L - R) * v / 100; }, Y = function (v) { return T + (H - T - B) * (1 - v / 100); };
      var pts = analysed.filter(function (m) { return m._sol != null; });
      var svg = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Exposition aux attaques et solidité de chaque mesure analysée">' +
        '<rect x="' + X(50) + '" y="' + Y(50) + '" width="' + (X(100) - X(50)) + '" height="' + (Y(0) - Y(50)) + '" fill="rgba(255,92,97,.10)"/>' +
        '<line x1="' + X(50) + '" x2="' + X(50) + '" y1="' + Y(0) + '" y2="' + Y(100) + '" stroke="rgba(255,255,255,.25)" stroke-dasharray="4 4"/><line x1="' + X(0) + '" x2="' + X(100) + '" y1="' + Y(50) + '" y2="' + Y(50) + '" stroke="rgba(255,255,255,.25)" stroke-dasharray="4 4"/>' +
        '<line x1="' + X(0) + '" x2="' + X(100) + '" y1="' + Y(0) + '" y2="' + Y(0) + '" stroke="rgba(255,255,255,.4)"/><line x1="' + X(0) + '" x2="' + X(0) + '" y1="' + Y(0) + '" y2="' + Y(100) + '" stroke="rgba(255,255,255,.4)"/>' +
        [0, 25, 50, 75, 100].map(function (v) { return '<text class="ax" x="' + X(v) + '" y="' + (Y(0) + 16) + '" text-anchor="middle">' + v + '</text><text class="ax" x="' + (L - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + v + "</text>"; }).join("") +
        '<text class="axt" x="' + X(50) + '" y="' + (H - 6) + '" text-anchor="middle">Exposition aux attaques →</text><text class="axt" transform="translate(12 ' + Y(50) + ') rotate(-90)" text-anchor="middle">Solidité selon nos preuves →</text>' +
        '<text class="ql" x="' + (X(100) - 6) + '" y="' + (Y(0) - 8) + '" text-anchor="end">À corriger en priorité</text><text class="ql" x="' + (X(100) - 6) + '" y="' + (Y(100) + 12) + '" text-anchor="end">À défendre</text>' +
        '<text class="ql" x="' + (X(0) + 6) + '" y="' + (Y(100) + 12) + '">Acquis</text><text class="ql" x="' + (X(0) + 6) + '" y="' + (Y(0) - 8) + '">À retravailler</text>';
      var seen = {};
      pts.forEach(function (m) {
        var k = m._expo + ":" + Math.round(m._sol), j = (seen[k] = (seen[k] || 0) + 1) - 1;
        var cx = X(m._expo) - 12 + (j % 4) * 8, cy = Y(m._sol) - Math.floor(j / 4) * 14;
        svg += '<g class="dot" data-n="' + m.num + '"><circle cx="' + cx + '" cy="' + cy + '" r="6.5" fill="' + (m._top ? BCOL[m._top] : "#B8C2DE") + '" fill-opacity=".92"/></g>';
      });
      svg += "</svg>";
      var sorted = analysed.slice().sort(function (a, b) { return b._expo - a._expo || (a._sol || 0) - (b._sol || 0); });
      var cell = function (m, r) { var c = m._att && m._att[r.id], s = attScore(c); return '<td class="s" style="color:' + BCOL[r.id] + ";background:rgba(255,255,255," + (s / 95 * 0.14).toFixed(3) + ')" title="' + esc(c ? PLAB[c.position] + (c.motif ? " · " + c.motif : "") : "") + '">' + (c && c.position !== "absente" ? s : "·") + "</td>"; };
      $("#p-attaques").innerHTML = shead(4, "Où le RN, LFI et la droite attaqueront-ils ?", "Attaques probables",
        "Pour chaque mesure analysée, la position de chaque adversaire d'après nos revues de leurs programmes, convertie en score d'exposition (barème dans l'onglet Méthode), croisée avec la solidité de la mesure selon nos preuves. En bas à droite : les mesures fragiles et attaquables, à corriger en priorité.") +
        '<div class="dash"><div class="panelbox scat"><div class="boxt">Exposition et solidité</div><div class="boxs">Chaque point est une mesure, coloré selon l\'adversaire le plus menaçant. Survoler pour le détail, cliquer pour ouvrir la mesure.</div>' + svg +
        '<div class="legend">' + RIV.map(function (r) { return '<span><i style="background:' + BCOL[r.id] + '"></i>' + esc(r.bloc) + "</span>"; }).join("") + "</div></div>" +
        '<div class="panelbox"><div class="boxt">À corriger en priorité</div><div class="boxs">Fragiles selon nos preuves (solidité sous 50) et les plus exposées.</div><ol class="top5">' +
        sorted.filter(function (m) { return m._sol != null && m._sol < 50; }).slice(0, 8).map(function (m) { var c = m._att && m._att[m._top]; return '<li><a data-n="' + m.num + '">N°' + m.num + "</a> " + esc(m.titre) + '<br><span class="pp" style="color:' + (BCOL[m._top] || "") + '">' + esc(blocOf(m._top)) + " · " + m._expo + "</span>" + (c && c.motif ? '<span class="pp"> · ' + esc(c.motif) + "</span>" : "") + "</li>"; }).join("") + "</ol></div></div>" +
        '<h3 class="sub">Toutes les mesures analysées</h3><div style="overflow-x:auto"><table class="heat"><thead><tr><th>Mesure</th>' + RIV.map(function (r) { return "<th>" + esc(r.bloc) + "</th>"; }).join("") + "<th>Solidité</th></tr></thead><tbody>" +
        sorted.map(function (m) { return '<tr' + ds("n°" + m.num + " " + m.titre) + '><td><a data-n="' + m.num + '">N°' + m.num + "</a> " + esc(m.titre) + "</td>" + RIV.map(function (r) { return cell(m, r); }).join("") + '<td class="s">' + (m._sol != null ? Math.round(m._sol) : "·") + "</td></tr>"; }).join("") + "</tbody></table></div>" +
        '<p class="pp">Source : ' + esc(AT.source) + ". Survoler une case pour le motif ; le détail est dans chaque fiche mesure.</p>";
      var tip = $("#gtip");
      $$("#p-attaques .dot").forEach(function (g) {
        var m = P.mesures.filter(function (x) { return x.num === +g.getAttribute("data-n"); })[0];
        g.addEventListener("mousemove", function (ev) {
          var c = m._att && m._att[m._top];
          tip.innerHTML = "<strong>N°" + m.num + "</strong> " + esc(m.titre) + "<br>Exposition " + m._expo + " · solidité " + Math.round(m._sol) + (c && c.motif ? "<br>" + esc(blocOf(m._top)) + " : " + esc(c.motif) : "");
          tip.style.display = "block"; tip.style.left = Math.min(ev.clientX + 14, innerWidth - 340) + "px"; tip.style.top = (ev.clientY + 14) + "px";
        });
        g.addEventListener("mouseleave", function () { tip.style.display = "none"; });
      });
    } else {
      $("#p-attaques").innerHTML = shead(4, "Où le RN, LFI et la droite attaqueront-ils ?", "Attaques probables", "") + '<p class="empty">Analyse en cours.</p>';
    }

    // ---------- 04 questions
    $("#p-questions").innerHTML = shead(5, "Que faut-il faire préciser à l'équipe programme ?", "Questions à l'équipe", "Les points qui conditionnent le chiffrage et la défense des mesures, thème par thème.") +
      P.questions.map(function (q) { return '<div class="box qr"><h4>' + esc(q.theme) + "</h4><ul>" + q.items.map(function (i) { return "<li" + ds(q.theme + " " + i) + ">" + inline(i) + "</li>"; }).join("") + "</ul></div>"; }).join("");

    // ---------- 05 adversaires
    $("#p-adversaires").innerHTML = shead(6, "Que valent les programmes concurrents ?", "Adversaires", "Les revues du groupe, proposition par proposition, et les fiches riposte : citation exacte, verdict sur chaque chiffre, riposte en trois phrases.") + '<div class="subtabs" id="advtabs"></div><div id="advbody"></div>';
    A.forEach(function (a) { var b = document.createElement("button"); b.className = "chip"; b.textContent = a.nom; b.setAttribute("data-id", a.id); b.addEventListener("click", function () { showAdv(a.id); }); $("#advtabs").appendChild(b); });
    function showAdv(id) {
      var a = advById[id];
      $$("#advtabs .chip").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-id") === id); });
      var h = '<h3 class="sub">' + esc(a.titre) + '</h3><p class="pp">Revue mise à jour le ' + fdate(a.source.maj) + (a.source.fiches_maj ? " · fiches riposte du " + fdate(a.source.fiches_maj) : "") + "</p>" + md(a.intro);
      if (a.riposte) {
        h += '<h3 class="sub">Fiches riposte</h3>' + (a.riposte.en_bref ? '<div class="box"><h4>En bref</h4>' + md(a.riposte.en_bref) + "</div>" : "");
        h += a.riposte.fiches.map(function (f) {
          return '<article class="card"' + ds(f.titre + " " + (f["Ce qui a été dit"] || "") + " " + (f["Riposte"] || "") + " " + (f["Vérification"] || "")) + '><div class="card-h">' + (f.verdict ? badge(f.verdict, f.verdict) : "") + '</div><div class="titre">' + esc(f.titre) + "</div>" +
            (f["Ce qui a été dit"] ? '<p class="msg">' + inline(f["Ce qui a été dit"]) + "</p>" : "") + (f["Riposte"] ? '<div class="box edl"><h4>Riposte (élément de langage)</h4>' + md(f["Riposte"]) + "</div>" : "") +
            '<details class="more"><summary>Vérification, coût et sources</summary>' + Object.keys(f).filter(function (k) { return ["titre", "verdict", "Ce qui a été dit", "Riposte"].indexOf(k) < 0; }).map(function (k) { return "<h4>" + esc(k) + "</h4>" + md(f[k]); }).join("") + "</details>" + corr(a.nom + " · fiche riposte", f.titre) + "</article>";
        }).join("");
      }
      h += '<h3 class="sub">Revue complète, proposition par proposition</h3>' + a.themes.map(function (t) { return '<p class="kicker" style="margin:22px 0 10px">' + esc(t.theme) + "</p>" + t.items.map(function (it) { return '<details class="card"' + ds(it.titre + " " + it.texte) + '><summary><strong>' + esc(it.titre) + "</strong></summary>" + md(it.texte) + corr(a.nom + " · revue", it.titre) + "</details>"; }).join(""); }).join("");
      $("#advbody").innerHTML = h; applyFilter();
    }
    showAdv(A[0].id);

    // ---------- 06 comparer
    $("#p-comparer").innerHTML = shead(7, "Qui propose quoi, thème par thème ?", "Comparer les programmes", "Les propositions de chaque candidat regroupées par grand thème. Cliquer sur une mesure d'Édouard Philippe ouvre sa fiche.") +
      '<div style="overflow-x:auto"><table class="cmp"><thead><tr><th>Thème</th><th>Édouard Philippe</th>' + A.map(function (a) { return "<th>" + esc(a.nom) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      C.comparaison.map(function (r) { return "<tr" + ds(r.theme + " " + r.philippe.map(function (m) { return "n°" + m.num + " " + m.titre; }).join(" ") + " " + A.map(function (a) { return r.adv[a.id].join(" "); }).join(" ")) + "><th>" + esc(r.theme) + "</th><td><ul>" + r.philippe.map(function (m) { return '<li><a data-n="' + m.num + '">N°' + m.num + "</a> " + esc(m.titre) + (m.analyses ? " ✓" : "") + "</li>"; }).join("") + "</ul></td>" + A.map(function (a) { return "<td><ul>" + r.adv[a.id].map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul></td>"; }).join("") + "</tr>"; }).join("") +
      '</tbody></table></div><p class="pp">✓ = mesure analysée par le groupe.</p>';

    // ---------- 07 échéances
    var years = {}; ECH.forEach(function (e) { var y = e.date.slice(0, 4); years[y] = (years[y] || 0) + 1; });
    var effCls = function (e) { return /expire/.test(e.effet) ? "exp" : /vigueur/.test(e.effet) ? "vig" : ""; };
    $("#p-echeances").innerHTML = shead(8, "Qu'est-ce qui expire, et qu'est-ce qui tombe pendant le quinquennat ?", "Échéances",
      "Les dates juridiques et budgétaires qui changent le contexte des mesures du livret : dispositifs qui expirent, règles qui entrent en vigueur, objectifs à tenir. Chaque date vient d'une source du groupe ; celles qui restent à vérifier sont signalées.") +
      '<div class="ruler">' + Object.keys(years).sort().map(function (y) { return '<div class="' + (+y === today.getFullYear() ? "hot" : "") + '"><b>' + years[y] + '</b><div class="t">' + y + '</div><div class="w">échéance' + (years[y] > 1 ? "s" : "") + "</div></div>"; }).join("") + "</div>" +
      '<div class="legend"><span><i style="background:var(--red)"></i>Expire</span><span><i style="background:var(--sol)"></i>Entre en vigueur</span><span><i style="background:var(--txt2)"></i>Autre (vote, objectif)</span></div>' +
      '<div class="vline">' + ECH.map(function (e) {
        var d = days(e.date);
        return '<div' + ds(e.quoi + " " + e.source + " " + (e.mesures || []).map(function (n) { return "n°" + n; }).join(" ")) + ' class="vstep ' + effCls(e) + (d < 0 ? " past" : "") + '"><div class="d">' + esc(fdate(e.date, e.precision)) + (d >= 0 && d < 400 ? ' <span class="pp">· J-' + d + "</span>" : "") + '</div><div class="w">' + esc(e.quoi) + '</div><div class="tg">' + esc(e.effet) + (e.verifie ? "" : " · à vérifier") +
          (e.mesures && e.mesures.length ? " · " + e.mesures.map(function (n) { return '<a data-n="' + n + '">N°' + n + "</a>"; }).join(", ") : "") + '</div><div class="pp">' + esc(e.source) + "</div></div>";
      }).join("") + "</div>";

    // ---------- 08 calendrier
    $("#p-calendrier").innerHTML = shead(9, "Quand le candidat parle-t-il de quoi ?", "Calendrier de campagne", "Les rendez-vous annoncés par le candidat, pour préparer notes et ripostes à l'avance.") +
      '<div class="hline">' + C.calendrier.map(function (e) { var d = days(e.date); return '<div' + ds(e.sujet + " " + e.quand) + ' class="hstep' + (d < 0 ? " past" : "") + (/tour/.test(e.sujet) ? " key" : "") + '"><span class="dt"></span><b>' + esc(e.quand) + "</b><p>" + esc(e.sujet) + '</p><span class="j">' + (d > 0 ? "dans " + d + " jours" : d === 0 ? "aujourd'hui" : "passé") + "</span></div>"; }).join("") + "</div>" +
      '<p class="pp">Sources : ' + esc(C.calendrier.map(function (e) { return e.source; }).filter(function (s, i, a) { return a.indexOf(s) === i; }).join(" ; ")) + "</p>";

    // ---------- 09 méthode
    $("#p-methode").innerHTML = shead(10, "Comment lire ce site ?", "Méthode et sources", "") +
      '<div class="legendb">' + ["solide", "bonne-direction", "mal-ciblee", "mal-calibree", "mal-concue", "a-chiffrer", "a-preciser", "non-analysee"].map(function (v) { return badge(v); }).join("") + "</div>" +
      '<ul class="method"><li><strong>Bien fondée</strong> : les études soutiennent la mesure telle qu\'écrite. <strong>Bonne direction</strong> : le diagnostic est juste, l\'instrument est à ajuster. <strong>Mal ciblée</strong> : elle profite surtout à d\'autres publics que ceux visés, ou passe à côté du problème. <strong>Mal calibrée</strong> : montant, seuil ou calendrier à revoir. <strong>Mal conçue</strong> : l\'instrument ne produira pas l\'effet annoncé. <strong>À chiffrer</strong> : coût absent. <strong>À préciser</strong> : la forme de la mesure n\'est pas encore connue.</li>' +
      "<li><strong>Solidité</strong> (0 à 100) : moyenne des verdicts d'une mesure (bien fondée 100, bonne direction 70, à préciser ou à chiffrer 50, mal calibrée 35, mal ciblée 30, mal conçue 15).</li>" +
      "<li><strong>Exposition aux attaques</strong> (0 à 95) : pour chaque adversaire, position opposée 70, désaccord partiel 45, position proche 20, pas de position 5, plus 20 si le thème fait partie de ses thèmes phares. L'exposition d'une mesure est le maximum sur les trois adversaires. Les positions viennent uniquement de nos revues de leurs programmes ; c'est un repère pour hiérarchiser, pas une prévision statistique.</li>" +
      "<li>Hiérarchie des preuves : études causales (françaises d'abord), puis évaluations officielles (Cour des comptes, CAE, Insee, DREES, IPP, OCDE…), puis chiffrages (Fipeco, Institut Montaigne). La presse sert de piste, jamais de preuve. Chaque chiffre a été lu dans sa source ; sinon il est marqué « à vérifier ».</li>" +
      "<li>Les mesures et les éléments de langage de la campagne sont repris mot pour mot du livret (" + esc(P.source.livret) + ") et du site edouardphilippe.fr. Les éléments de langage proposés sont des suggestions du groupe.</li></ul>" +
      '<h3 class="sub">Mises à jour</h3><ul class="method"><li>Programme Philippe : revue du ' + fdate(P.source.maj) + "</li>" + A.map(function (a) { return "<li>" + esc(a.nom) + " : revue du " + fdate(a.source.maj) + (a.source.fiches_maj ? ", fiches riposte du " + fdate(a.source.fiches_maj) : "") + "</li>"; }).join("") + "</ul>" +
      '<details class="more"><summary>Sources de l\'analyse du programme Philippe</summary>' + md(P.sources_md) + "</details>";

    // ---------- 03 ce qui a changé
    if (C.versions) {
      var VS = C.versions.changements, vst = null;
      var vcount = function (s) { return VS.filter(function (v) { return v.statut === s; }).length; };
      $("#p-versions").innerHTML = shead(2, "Qu'est-ce qui a changé entre le site et le livret ?", "Ce qui a changé",
        "Chaque écart entre le programme publié sur le site (" + esc(C.versions.avant) + ") et le " + esc(C.versions.apres) + ", cité mot pour mot des deux côtés. Les prochains volumes s'ajouteront ici.") +
        '<div class="filters" id="f-ver"><span class="lbl">Statut</span></div><div id="vers"></div>';
      ["modifie", "precise", "nouveau", "retire"].forEach(function (s) { if (!vcount(s)) return; var b = document.createElement("button"); b.className = "chip"; b.setAttribute("aria-pressed", "false"); b.innerHTML = esc(SLAB[s]) + '<span class="n">' + vcount(s) + "</span>"; b.addEventListener("click", function () { vst = vst === s ? null : s; renderV(); }); b._v = s; $("#f-ver").appendChild(b); });
      var renderV = function () {
        $$("#f-ver .chip").forEach(function (b) { b.setAttribute("aria-pressed", vst === b._v); });
        $("#vers").innerHTML = VS.filter(function (v) { return !vst || v.statut === vst; }).map(function (v) {
          var m = v.num != null ? P.mesures.filter(function (x) { return x.num === v.num; })[0] : null;
          return '<article class="card s-' + v.statut + '"' + ds((v.num != null ? "n°" + v.num + " " : "") + (v.theme || "") + " " + v.avant + " " + v.apres) + '><div class="card-h">' + (v.num != null ? '<a class="num" data-n="' + v.num + '">N°' + v.num + "</a>" : (v.priorite ? '<span class="num">Priorité ' + esc(v.priorite) + "</span>" : "")) + "<span>" + esc(v.theme || "") + "</span>" + badge(v.statut, SLAB[v.statut]) + "</div>" +
            (m ? '<div class="titre">' + esc(m.titre) + "</div>" : "") + '<div class="vcmp"><div class="av"><h4>Avant (site)</h4>' + (v.avant ? esc(v.avant) : '<span class="empty">Absente du site</span>') + '<p class="pp">' + esc(v.avant_source) + '</p></div><div class="ap"><h4>Livret du 18 novembre</h4>' + (v.apres ? esc(v.apres) : '<span class="empty">Absente du livret</span>') + "</div></div>" +
            (v.note ? '<p class="pp">' + esc(v.note) + "</p>" : "") + corr(v.num != null ? "N°" + v.num + " · version" : "version", m ? m.titre : v.avant) + "</article>";
        }).join("") || '<p class="empty">Aucun changement.</p>';
        applyFilter();
      };
      renderV();
    } else $("#p-versions").innerHTML = shead(2, "Qu'est-ce qui a changé entre le site et le livret ?", "Ce qui a changé", "") + '<p class="empty">En cours.</p>';

    // ---------- 04 nos ajouts
    if (C.ajouts) {
      var AJ = C.ajouts.ajouts, ast = { g: null, r: null };
      var groups = []; AJ.forEach(function (a) { if (groups.indexOf(a.groupe) < 0) groups.push(a.groupe); });
      $("#p-ajouts").innerHTML = shead(3, "Que proposons-nous que le livret ne dit pas encore ?", "Ce que nos travaux ajoutent",
        "Les propositions du groupe, citées mot pour mot de ses notes, avec les mesures du livret qu'elles complètent ou corrigent, et celles qui n'ont pas encore d'équivalent dans le programme.") +
        '<div class="filters" id="f-ag"><span class="lbl">Groupe</span></div><div class="filters" id="f-ar"><span class="lbl">Rapport au livret</span></div><div id="ajl"></div>';
      var achip = function (box, key, val, lab, n) { var b = document.createElement("button"); b.className = "chip"; b.setAttribute("aria-pressed", "false"); b.innerHTML = esc(lab) + '<span class="n">' + n + "</span>"; b.addEventListener("click", function () { ast[key] = ast[key] === val ? null : val; renderA(); }); b._k = key; b._v = val; box.appendChild(b); };
      groups.forEach(function (g) { achip($("#f-ag"), "g", g, g, AJ.filter(function (a) { return a.groupe === g; }).length); });
      Object.keys(RLAB).forEach(function (r) { var n = AJ.filter(function (a) { return a.relation === r; }).length; if (n) achip($("#f-ar"), "r", r, RLAB[r], n); });
      var renderA = function () {
        $$("#p-ajouts .chip").forEach(function (b) { b.setAttribute("aria-pressed", ast[b._k] === b._v); });
        $("#ajl").innerHTML = AJ.filter(function (a) { return (!ast.g || a.groupe === ast.g) && (!ast.r || a.relation === ast.r); }).map(function (a) {
          return '<article class="card r-' + rkey(a.relation) + '"' + ds(a.titre + " " + a.texte + " " + a.groupe + " " + (a.mesures || []).map(function (n) { return "n°" + n; }).join(" ")) + '><div class="card-h"><span>' + esc(a.groupe) + "</span>" + badge(rkey(a.relation) === "nouveau" ? "nouvelle" : rkey(a.relation), RLAB[a.relation] || a.relation) + (a.statut ? '<span class="badge b-a-preciser">' + esc(a.statut) + "</span>" : "") + "</div>" +
            '<div class="titre">' + esc(a.titre) + '</div><p class="texte">' + esc(String(a.texte).replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰]+/g, "")) + "</p>" +
            ((a.mesures || []).length ? '<p class="pp">Mesures du livret : ' + a.mesures.map(function (n) { return '<a data-n="' + n + '">N°' + n + "</a>"; }).join(", ") + "</p>" : '<p class="pp">Pas encore d\'équivalent dans le livret.</p>') +
            '<p class="pp">Source : ' + esc(a.note) + "</p>" + corr("Ajout du groupe", a.titre) + "</article>";
        }).join("");
        applyFilter();
      };
      renderA();
    } else $("#p-ajouts").innerHTML = shead(3, "Que proposons-nous que le livret ne dit pas encore ?", "Ce que nos travaux ajoutent", "") + '<p class="empty">En cours.</p>';

    // ---------- recherche globale
    var GQ = "";
    function applyFilter() {
      $$("[data-s]").forEach(function (el) { el.hidden = !mt(el.getAttribute("data-s"), GQ); });
    }
    var advHits = function (q) { var n = 0; A.forEach(function (a) { a.themes.forEach(function (t) { t.items.forEach(function (it) { if (norm(it.titre + " " + it.texte).length && mt(norm(it.titre + " " + it.texte), q)) n++; }); }); if (a.riposte) a.riposte.fiches.forEach(function (f) { if (norm(f.titre + " " + (f["Ce qui a été dit"] || "") + " " + (f["Riposte"] || "") + " " + (f["Vérification"] || "")).length && mt(norm(f.titre + " " + (f["Ce qui a été dit"] || "") + " " + (f["Riposte"] || "") + " " + (f["Vérification"] || "")), q)) n++; }); }); return n; };
    function gsearch(q) {
      GQ = norm(q.trim());
      st.q = GQ; $("#q").value = q; renderP(); applyFilter();
      $$(".tab").forEach(function (t) {
        var id = t.id.slice(2), em = t.querySelector(".hits"), n = null;
        if (!GQ || id === "synthese" || id === "methode") { em.hidden = true; return; }
        if (id === "philippe") n = P.mesures.filter(function (m) { return (!st.onlyA || m.analyses.length) && mt(m._txt, GQ); }).length;
        else if (id === "adversaires") n = advHits(GQ);
        else n = $$("#p-" + id + " [data-s]").filter(function (el) { return !el.hidden; }).length;
        em.hidden = false; em.textContent = n; em.className = "hits" + (n ? "" : " z");
      });
    }
    $("#gq").hidden = false;
    $("#gq").addEventListener("input", function () { gsearch(this.value); });
    $("#q").addEventListener("input", function () { $("#gq").value = this.value; gsearch(this.value); });

    // liens transversaux
    document.addEventListener("click", function (ev) {
      var t = ev.target; if (!t || !t.closest) return;
      var n = t.closest("[data-n]"); if (n) { ev.preventDefault(); gotoMesure(+n.getAttribute("data-n")); return; }
      var a = t.closest("[data-adv]"); if (a) { ev.preventDefault(); openTab("adversaires"); showAdv(a.getAttribute("data-adv")); }
    });
    var h0 = location.hash.slice(1); if (h0 && $("#p-" + h0)) openTab(h0);
  }
})();
